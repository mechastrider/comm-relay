package vk

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/muonsoft/errors"
)

const (
	appConfigURL           = "https://live.vkvideo.ru/"
	channelInfoURLTemplate = "https://api.live.vkvideo.ru/v1/blog/%s/public_video_stream/chat/user/"
	wsURL                  = "wss://pubsub.live.vkvideo.ru/connection/websocket?cf_protocol_version=v2"
	wsOrigin               = "https://live.vkvideo.ru"
)

var appConfigPattern = regexp.MustCompile(`(?s)<script[^>]*\bid=["']app-config["'][^>]*>(.+?)</script>`)

const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

type httpDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type chatClient interface {
	RunSession(ctx context.Context, channel string, onMessage func([]byte)) error
}

type defaultClient struct {
	httpClient httpDoer
	dialer     *websocket.Dialer
}

func newDefaultClient() *defaultClient {
	return &defaultClient{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		dialer: &websocket.Dialer{
			HandshakeTimeout: 10 * time.Second,
		},
	}
}

func (c *defaultClient) RunSession(ctx context.Context, channel string, onMessage func([]byte)) error {
	token, err := c.fetchWebSocketToken(ctx)
	if err != nil {
		return err
	}

	ownerID, err := c.fetchChannelOwnerID(ctx, channel)
	if err != nil {
		return err
	}

	conn, _, err := c.dialer.DialContext(ctx, wsURL, http.Header{
		"Origin": []string{wsOrigin},
	})
	if err != nil {
		return errors.Errorf("dial vk websocket: %w", err)
	}
	defer conn.Close()

	var msgID int64
	send := func(payload any) error {
		msgID++
		envelope := map[string]any{
			"id": msgID,
		}
		switch v := payload.(type) {
		case map[string]any:
			for key, value := range v {
				envelope[key] = value
			}
		default:
			return errors.New("unsupported websocket payload")
		}

		if err := conn.WriteJSON(envelope); err != nil {
			return errors.Errorf("write vk websocket message: %w", err)
		}
		return nil
	}

	if err := send(map[string]any{
		"connect": map[string]string{
			"token": token,
			"name":  "js",
		},
	}); err != nil {
		return err
	}

	subscribeID := msgID + 1
	if err := send(map[string]any{
		"subscribe": map[string]string{
			"channel": "channel-chat:" + ownerID,
		},
	}); err != nil {
		return err
	}
	_ = subscribeID

	readDone := make(chan error, 1)
	go func() {
		readDone <- c.readLoop(conn, onMessage)
	}()

	select {
	case <-ctx.Done():
		_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		<-readDone
		return nil
	case err := <-readDone:
		if err != nil && ctx.Err() == nil {
			return err
		}
		return nil
	}
}

func (c *defaultClient) readLoop(conn *websocket.Conn, onMessage func([]byte)) error {
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return errors.Errorf("read vk websocket message: %w", err)
		}

		if string(data) == "{}" {
			if err := conn.WriteMessage(websocket.TextMessage, []byte("{}")); err != nil {
				return errors.Errorf("reply vk websocket ping: %w", err)
			}
			continue
		}

		onMessage(data)
	}
}

func (c *defaultClient) fetchWebSocketToken(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, appConfigURL, nil)
	if err != nil {
		return "", errors.Errorf("create vk app config request: %w", err)
	}
	setVKBrowserHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", errors.Errorf("fetch vk app config: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return "", errors.Errorf("read vk app config: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", errors.Errorf("fetch vk app config: unexpected status %d", resp.StatusCode)
	}

	match := appConfigPattern.FindSubmatch(body)
	if len(match) < 2 {
		return "", errNoWebSocketToken
	}

	var cfg struct {
		WebSocket struct {
			Token string `json:"token"`
		} `json:"websocket"`
	}
	if err := json.Unmarshal(match[1], &cfg); err != nil {
		return "", errors.Errorf("parse vk app config: %w", err)
	}

	token := strings.TrimSpace(cfg.WebSocket.Token)
	if token == "" {
		return "", errNoWebSocketToken
	}

	return token, nil
}

func (c *defaultClient) fetchChannelOwnerID(ctx context.Context, channel string) (string, error) {
	url := strings.Replace(channelInfoURLTemplate, "%s", channel, 1)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", errors.Errorf("create vk channel info request: %w", err)
	}
	setVKBrowserHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", errors.Errorf("fetch vk channel info: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", errors.Errorf("read vk channel info: %w", err)
	}
	if resp.StatusCode == http.StatusNotFound {
		return "", errChannelNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return "", errors.Errorf("fetch vk channel info: unexpected status %d", resp.StatusCode)
	}

	var info struct {
		Data struct {
			Owner struct {
				ID int64 `json:"id"`
			} `json:"owner"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &info); err != nil {
		return "", errors.Errorf("parse vk channel info: %w", err)
	}
	if info.Data.Owner.ID == 0 {
		return "", errChannelNotFound
	}

	return strconv.FormatInt(info.Data.Owner.ID, 10), nil
}

func setVKBrowserHeaders(req *http.Request) {
	req.Header.Set("Origin", wsOrigin)
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
}

package goodgame

import (
	"context"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

type client struct {
	streamURL string
	socketURL string
	http      *http.Client
}

func publicClient() client {
	return client{
		streamURL: "https://goodgame.ru/api/4/stream/",
		socketURL: "wss://chat-1.goodgame.ru/chat2/",
		http:      &http.Client{Timeout: 15 * time.Second},
	}
}

func (c client) resolve(ctx context.Context, key string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.streamURL+url.PathEscape(key), nil)
	if err != nil {
		return "", err
	}
	res, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		return "", errors.Errorf("GoodGame channel lookup returned HTTP %d", res.StatusCode)
	}
	var stream struct {
		ID json.Number `json:"id"`
	}
	if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&stream); err != nil {
		return "", err
	}
	if id, parseErr := stream.ID.Int64(); parseErr != nil || id <= 0 {
		return "", errors.New("GoodGame channel has no stream ID")
	}
	return stream.ID.String(), nil
}

type envelope struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func (c client) read(ctx context.Context, key string, joined func(), publish func(bus.ChatMessage)) error {
	id, err := c.resolve(ctx, key)
	if err != nil {
		return err
	}
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, c.socketURL, nil)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	conn.SetReadLimit(1 << 20)
	if err = conn.SetReadDeadline(time.Now().Add(15 * time.Second)); err != nil {
		return err
	}
	var active bool
	var ownerID string
	for {
		var frame envelope
		if err = conn.ReadJSON(&frame); err != nil {
			return err
		}
		switch frame.Type {
		case "welcome":
			var welcome struct {
				Version int `json:"protocolVersion"`
			}
			if json.Unmarshal(frame.Data, &welcome) != nil || welcome.Version != 2 {
				return errors.New("unsupported GoodGame chat protocol")
			}
			if err = conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
				return err
			}
			if err = conn.WriteJSON(map[string]any{"type": "join", "data": map[string]string{"channel_id": id}}); err != nil {
				return err
			}
		case "success_join":
			var join struct {
				Channel  json.Number `json:"channel_id"`
				Streamer struct {
					ID json.Number `json:"id"`
				} `json:"channel_streamer"`
			}
			if json.Unmarshal(frame.Data, &join) != nil || join.Channel.String() != id {
				return errors.New("unexpected GoodGame join response")
			}
			active = true
			ownerID = join.Streamer.ID.String()
			joined()
		case "error":
			return errors.New("GoodGame chat server rejected the request")
		case "message":
			if active {
				if msg, ok := mapMessage(frame.Data, id, ownerID); ok {
					publish(msg)
				} else {
					clog.Debug(ctx, "ignored invalid GoodGame chat message")
				}
			}
		}
		// The chat streams channel counters even while no one is talking.
		if active {
			if err = conn.SetReadDeadline(time.Now().Add(2 * time.Minute)); err != nil {
				return err
			}
		}
	}
}

func mapMessage(raw json.RawMessage, channel, owner string) (bus.ChatMessage, bool) {
	var m struct {
		Channel   json.Number `json:"channel_id"`
		ID        json.Number `json:"message_id"`
		User      json.Number `json:"user_id"`
		Name      string      `json:"user_name"`
		Text      string      `json:"text"`
		Timestamp int64       `json:"timestamp"`
	}
	if json.Unmarshal(raw, &m) != nil || m.Channel.String() != channel || m.ID == "" || m.User == "" || m.Name == "" || strings.TrimSpace(m.Text) == "" || m.Timestamp <= 0 {
		return bus.ChatMessage{}, false
	}
	msg := bus.ChatMessage{
		Platform:    status.PlatformGoodGame,
		ID:          "goodgame-" + m.ID.String(),
		UserID:      m.User.String(),
		Username:    m.Name,
		DisplayName: m.Name,
		Message:     html.UnescapeString(m.Text),
		Timestamp:   time.Unix(m.Timestamp, 0).UTC(),
	}
	if m.User.String() == owner {
		msg.Badges = []string{"broadcaster"}
	}
	return msg, true
}

package ffz

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/muonsoft/errors"
)

var (
	globalSetURL = "https://api.frankerfacez.com/v1/set/global"
	roomURLFmt   = "https://api.frankerfacez.com/v1/room/%s"
)

// Fetcher loads FrankerFaceZ emote metadata.
type Fetcher struct {
	client emote.HTTPDoer
}

// New creates an FFZ metadata fetcher.
func New(client emote.HTTPDoer) *Fetcher {
	return &Fetcher{client: client}
}

// ID implements emote.Fetcher.
func (f *Fetcher) ID() emote.ProviderID {
	return emote.ProviderFFZ
}

// FetchGlobal loads FFZ global emote sets.
func (f *Fetcher) FetchGlobal(ctx context.Context) ([]emote.Metadata, error) {
	var payload globalSetResponse
	if err := emote.GetJSON(ctx, f.client, globalSetURL, &payload); err != nil {
		return nil, errors.Errorf("fetch ffz global set: %w", err)
	}

	return normalizeGlobalSets(payload), nil
}

// FetchChannel loads FFZ emotes for a Twitch channel login.
func (f *Fetcher) FetchChannel(ctx context.Context, platform, channelID string) ([]emote.Metadata, error) {
	if platform != "twitch" {
		return nil, nil
	}

	login := strings.TrimSpace(strings.ToLower(channelID))
	if login == "" {
		return nil, nil
	}

	var payload roomResponse
	endpoint := fmt.Sprintf(roomURLFmt, url.PathEscape(login))
	if err := emote.GetJSON(ctx, f.client, endpoint, &payload); err != nil {
		if errors.Is(err, emote.ErrNotFound) {
			return nil, nil
		}
		return nil, errors.Errorf("fetch ffz room %q: %w", login, err)
	}

	return normalizeRoomSets(payload), nil
}

// ResolveTwitchID returns the numeric Twitch user ID for a channel login via the FFZ room API.
func (f *Fetcher) ResolveTwitchID(ctx context.Context, login string) (string, error) {
	login = strings.TrimSpace(strings.ToLower(login))
	if login == "" {
		return "", errors.New("twitch login is empty")
	}

	var payload roomResponse
	endpoint := fmt.Sprintf(roomURLFmt, url.PathEscape(login))
	if err := emote.GetJSON(ctx, f.client, endpoint, &payload); err != nil {
		return "", errors.Errorf("resolve twitch id for %q: %w", login, err)
	}

	if payload.Room.TwitchID == 0 {
		return "", errors.Errorf("twitch id missing for room %q", login)
	}

	return strconv.Itoa(payload.Room.TwitchID), nil
}

type globalSetResponse struct {
	DefaultSets []int          `json:"default_sets"`
	Sets        map[string]set `json:"sets"`
}

type roomResponse struct {
	Room struct {
		TwitchID int    `json:"twitch_id"`
		ID       string `json:"id"`
		Set      int    `json:"set"`
	} `json:"room"`
	Sets map[string]set `json:"sets"`
}

type set struct {
	Emoticons []emoticon `json:"emoticons"`
}

type emoticon struct {
	ID           int               `json:"id"`
	Name         string            `json:"name"`
	Width        int               `json:"width"`
	Height       int               `json:"height"`
	Hidden       bool              `json:"hidden"`
	Modifier     bool              `json:"modifier"`
	URLs         map[string]string `json:"urls"`
	Animated     bool              `json:"animated"`
	ModifierOnly bool              `json:"modifier_only"`
}

func normalizeGlobalSets(payload globalSetResponse) []emote.Metadata {
	if len(payload.DefaultSets) == 0 || len(payload.Sets) == 0 {
		return nil
	}

	seen := make(map[string]struct{})
	out := make([]emote.Metadata, 0)

	for _, setID := range payload.DefaultSets {
		setKey := strconv.Itoa(setID)
		setData, ok := payload.Sets[setKey]
		if !ok {
			continue
		}
		for _, item := range setData.Emoticons {
			meta, ok := normalizeEmoticon(item)
			if !ok {
				continue
			}
			if _, exists := seen[meta.Code]; exists {
				continue
			}
			seen[meta.Code] = struct{}{}
			out = append(out, meta)
		}
	}

	return out
}

func normalizeRoomSets(payload roomResponse) []emote.Metadata {
	if payload.Room.Set == 0 || len(payload.Sets) == 0 {
		return nil
	}

	setKey := strconv.Itoa(payload.Room.Set)
	setData, ok := payload.Sets[setKey]
	if !ok {
		return nil
	}

	out := make([]emote.Metadata, 0, len(setData.Emoticons))
	for _, item := range setData.Emoticons {
		meta, ok := normalizeEmoticon(item)
		if !ok {
			continue
		}
		out = append(out, meta)
	}

	return out
}

func normalizeEmoticon(item emoticon) (emote.Metadata, bool) {
	code := strings.TrimSpace(item.Name)
	if code == "" || item.Hidden || item.Modifier || item.ModifierOnly {
		return emote.Metadata{}, false
	}

	imageURL := pickFFZURL(item.URLs)
	if imageURL == "" {
		return emote.Metadata{}, false
	}

	width := item.Width
	height := item.Height
	if width <= 0 {
		width = 28
	}
	if height <= 0 {
		height = 28
	}

	return emote.Metadata{
		Code:     code,
		ID:       strconv.Itoa(item.ID),
		URL:      imageURL,
		Width:    width,
		Height:   height,
		Animated: item.Animated,
	}, true
}

func pickFFZURL(urls map[string]string) string {
	if len(urls) == 0 {
		return ""
	}
	if u := strings.TrimSpace(urls["2"]); u != "" {
		return u
	}
	if u := strings.TrimSpace(urls["1"]); u != "" {
		return u
	}
	for _, u := range urls {
		if trimmed := strings.TrimSpace(u); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

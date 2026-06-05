// Package seventv loads 7TV emote metadata from the public v3 REST API.
//
// Endpoints (as of 2026; the legacy SevenTV/API repo is archived — keep this adapter isolated):
//   - Global emotes: GET https://7tv.io/v3/emote-sets/global
//   - Twitch channel: GET https://7tv.io/v3/users/twitch/{twitchUserID}
//
// Image URLs use the 7TV CDN: https://cdn.7tv.app/emote/{id}/2x.webp
package seventv

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/muonsoft/errors"
)

var (
	globalURL     = "https://7tv.io/v3/emote-sets/global"
	channelURLFmt = "https://7tv.io/v3/users/twitch/%s"
)

// TwitchIDResolver resolves a Twitch channel login to a numeric user ID.
type TwitchIDResolver interface {
	ResolveTwitchID(ctx context.Context, login string) (string, error)
}

// Fetcher loads 7TV emote metadata.
type Fetcher struct {
	client   emote.HTTPDoer
	resolver TwitchIDResolver
}

// New creates a 7TV metadata fetcher.
func New(client emote.HTTPDoer, resolver TwitchIDResolver) *Fetcher {
	return &Fetcher{client: client, resolver: resolver}
}

// ID implements emote.Fetcher.
func (f *Fetcher) ID() emote.ProviderID {
	return emote.Provider7TV
}

// FetchGlobal loads 7TV global emotes.
func (f *Fetcher) FetchGlobal(ctx context.Context) ([]emote.Metadata, error) {
	var payload emoteSetResponse
	if err := emote.GetJSON(ctx, f.client, globalURL, &payload); err != nil {
		return nil, errors.Errorf("fetch 7tv global emotes: %w", err)
	}

	return normalizeEmoteSet(payload.Emotes), nil
}

// FetchChannel loads 7TV emotes for a Twitch channel.
func (f *Fetcher) FetchChannel(ctx context.Context, platform, channelID string) ([]emote.Metadata, error) {
	if platform != "twitch" {
		return nil, nil
	}

	twitchID, err := f.resolveTwitchID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	if twitchID == "" {
		return nil, nil
	}

	var payload channelResponse
	endpoint := fmt.Sprintf(channelURLFmt, twitchID)
	if err := emote.GetJSON(ctx, f.client, endpoint, &payload); err != nil {
		if errors.Is(err, emote.ErrNotFound) {
			return nil, nil
		}
		return nil, errors.Errorf("fetch 7tv channel emotes: %w", err)
	}

	if payload.EmoteSet == nil {
		return nil, nil
	}

	return normalizeEmoteSet(payload.EmoteSet.Emotes), nil
}

func (f *Fetcher) resolveTwitchID(ctx context.Context, channelID string) (string, error) {
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return "", nil
	}
	if isNumericID(channelID) {
		return channelID, nil
	}
	if f.resolver == nil {
		return "", errors.New("7tv twitch id resolver is nil")
	}

	twitchID, err := f.resolver.ResolveTwitchID(ctx, channelID)
	if err != nil {
		if errors.Is(err, emote.ErrNotFound) {
			return "", nil
		}
		return "", errors.Errorf("resolve twitch id: %w", err)
	}

	return strings.TrimSpace(twitchID), nil
}

type emoteSetResponse struct {
	Emotes []emoteEntry `json:"emotes"`
}

type channelResponse struct {
	EmoteSet *emoteSetResponse `json:"emote_set"`
}

type emoteEntry struct {
	Name string    `json:"name"`
	Data emoteData `json:"data"`
}

type emoteData struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Listed   bool      `json:"listed"`
	Animated bool      `json:"animated"`
	Host     emoteHost `json:"host"`
}

type emoteHost struct {
	URL   string     `json:"url"`
	Files []hostFile `json:"files"`
}

type hostFile struct {
	Name   string `json:"name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

func normalizeEmoteSet(entries []emoteEntry) []emote.Metadata {
	if len(entries) == 0 {
		return nil
	}

	out := make([]emote.Metadata, 0, len(entries))
	for _, entry := range entries {
		meta, ok := normalizeEmote(entry)
		if !ok {
			continue
		}
		out = append(out, meta)
	}

	return out
}

func normalizeEmote(entry emoteEntry) (emote.Metadata, bool) {
	data := entry.Data
	code := strings.TrimSpace(data.Name)
	if code == "" {
		code = strings.TrimSpace(entry.Name)
	}

	id := strings.TrimSpace(data.ID)
	if code == "" || id == "" || !data.Listed {
		return emote.Metadata{}, false
	}

	imageURL, width, height := pickImage(data.Host, id)
	if imageURL == "" {
		return emote.Metadata{}, false
	}

	if width <= 0 {
		width = 28
	}
	if height <= 0 {
		height = 28
	}

	return emote.Metadata{
		Code:     code,
		ID:       id,
		URL:      imageURL,
		Width:    width,
		Height:   height,
		Animated: data.Animated,
	}, true
}

func pickImage(host emoteHost, emoteID string) (url string, width, height int) {
	for _, file := range host.Files {
		if file.Name == "2x.webp" {
			return absolutizeHostURL(host.URL, file.Name), file.Width, file.Height
		}
	}
	for _, file := range host.Files {
		if file.Name == "1x.webp" {
			return absolutizeHostURL(host.URL, file.Name), file.Width, file.Height
		}
	}

	if emoteID != "" {
		return seventvEmoteURL(emoteID), 0, 0
	}

	return "", 0, 0
}

func absolutizeHostURL(hostURL, fileName string) string {
	hostURL = strings.TrimSpace(hostURL)
	if hostURL == "" {
		return ""
	}
	if strings.HasPrefix(hostURL, "//") {
		hostURL = "https:" + hostURL
	}
	return strings.TrimRight(hostURL, "/") + "/" + fileName
}

func seventvEmoteURL(id string) string {
	return "https://cdn.7tv.app/emote/" + id + "/2x.webp"
}

func isNumericID(value string) bool {
	_, err := strconv.Atoi(value)
	return err == nil
}

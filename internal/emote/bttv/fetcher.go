package bttv

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/emote"
)

var (
	globalURL     = "https://api.betterttv.net/3/cached/emotes/global"
	channelURLFmt = "https://api.betterttv.net/3/cached/users/twitch/%s"
)

// TwitchIDResolver resolves a Twitch channel login to a numeric user ID.
type TwitchIDResolver interface {
	ResolveTwitchID(ctx context.Context, login string) (string, error)
}

// Fetcher loads BetterTTV emote metadata.
type Fetcher struct {
	client   emote.HTTPDoer
	resolver TwitchIDResolver
}

// New creates a BTTV metadata fetcher.
func New(client emote.HTTPDoer, resolver TwitchIDResolver) *Fetcher {
	return &Fetcher{client: client, resolver: resolver}
}

// ID implements emote.Fetcher.
func (f *Fetcher) ID() emote.ProviderID {
	return emote.ProviderBTTV
}

// FetchGlobal loads BTTV global emotes.
func (f *Fetcher) FetchGlobal(ctx context.Context) ([]emote.Metadata, error) {
	var payload []bttvEmote
	if err := emote.GetJSON(ctx, f.client, globalURL, &payload); err != nil {
		return nil, errors.Errorf("fetch bttv global emotes: %w", err)
	}

	return normalizeEmotes(payload), nil
}

// FetchChannel loads BTTV channel and shared emotes for a Twitch channel.
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
		return nil, errors.Errorf("fetch bttv channel emotes: %w", err)
	}

	out := make([]emote.Metadata, 0, len(payload.ChannelEmotes)+len(payload.SharedEmotes))
	out = append(out, normalizeEmotes(payload.ChannelEmotes)...)
	out = append(out, normalizeEmotes(payload.SharedEmotes)...)
	return out, nil
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
		return "", errors.New("bttv twitch id resolver is nil")
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

type channelResponse struct {
	ChannelEmotes []bttvEmote `json:"channelEmotes"`
	SharedEmotes  []bttvEmote `json:"sharedEmotes"`
}

type bttvEmote struct {
	ID        string `json:"id"`
	Code      string `json:"code"`
	ImageType string `json:"imageType"`
	Animated  bool   `json:"animated"`
	Modifier  bool   `json:"modifier"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

func normalizeEmotes(items []bttvEmote) []emote.Metadata {
	if len(items) == 0 {
		return nil
	}

	out := make([]emote.Metadata, 0, len(items))
	for _, item := range items {
		meta, ok := normalizeEmote(item)
		if !ok {
			continue
		}
		out = append(out, meta)
	}

	return out
}

func normalizeEmote(item bttvEmote) (emote.Metadata, bool) {
	code := strings.TrimSpace(item.Code)
	id := strings.TrimSpace(item.ID)
	if code == "" || id == "" || item.Modifier {
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

	animated := item.Animated || strings.EqualFold(item.ImageType, "gif")

	return emote.Metadata{
		Code:     code,
		ID:       id,
		URL:      bttvEmoteURL(id),
		Width:    width,
		Height:   height,
		Animated: animated,
	}, true
}

func bttvEmoteURL(id string) string {
	return "https://cdn.betterttv.net/emote/" + id + "/2x"
}

func isNumericID(value string) bool {
	_, err := strconv.Atoi(value)
	return err == nil
}

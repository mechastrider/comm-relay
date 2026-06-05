package emote

import (
	"strings"
	"unicode"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

// Enricher adds third-party emote fragments to chat messages using cached metadata.
type Enricher struct {
	cache *Cache
}

// NewEnricher creates a third-party emote enricher.
func NewEnricher(cache *Cache) *Enricher {
	return &Enricher{cache: cache}
}

// Enrich replaces known third-party emote tokens in message fragments for a Twitch channel.
// Provider failures or cache misses leave the original text intact.
func (e *Enricher) Enrich(msg *bus.ChatMessage, channelLogin string, emotes config.EmotesConfig) {
	if e == nil || e.cache == nil || msg == nil || msg.Message == "" || !emotes.ThirdPartyEnabled() {
		return
	}

	channelLogin = normalizeChannelLogin(channelLogin)
	if channelLogin == "" {
		return
	}

	enriched := enrichFragments(e.cache, msg.Platform, channelLogin, msg.Fragments, msg.Message, emotes)
	if enriched != nil {
		msg.Fragments = enriched
	}
}

func enrichFragments(cache *Cache, platform, channelLogin string, fragments []bus.MessageFragment, message string, emotes config.EmotesConfig) []bus.MessageFragment {
	if platform != "twitch" {
		return fragments
	}

	if len(fragments) == 0 {
		matched := matchText(cache, platform, channelLogin, message, emotes)
		if len(matched) == 0 {
			return nil
		}
		return matched
	}

	out := make([]bus.MessageFragment, 0, len(fragments))
	changed := false

	for _, fragment := range fragments {
		if fragment.Type != bus.FragmentTypeText || fragment.Text == "" {
			out = append(out, fragment)
			continue
		}

		matched := matchText(cache, platform, channelLogin, fragment.Text, emotes)
		if len(matched) == 0 {
			out = append(out, fragment)
			continue
		}

		changed = true
		out = append(out, matched...)
	}

	if !changed {
		return fragments
	}

	return out
}

func matchText(cache *Cache, platform, channelLogin, text string, emotes config.EmotesConfig) []bus.MessageFragment {
	fragments := tokenizeWithEmotes(cache, platform, channelLogin, text, emotes)
	if !containsEmoteFragment(fragments) {
		return nil
	}
	return fragments
}

func tokenizeWithEmotes(cache *Cache, platform, channelLogin, text string, emotes config.EmotesConfig) []bus.MessageFragment {
	runes := []rune(text)
	if len(runes) == 0 {
		return nil
	}

	out := make([]bus.MessageFragment, 0, 4)
	i := 0

	for i < len(runes) {
		start := i
		for i < len(runes) && !unicode.IsSpace(runes[i]) {
			i++
		}
		if start < i {
			token := string(runes[start:i])
			if meta, ok := cache.LookupThirdParty(platform, channelLogin, token, emotes); ok {
				out = append(out, meta.ToFragment())
			} else {
				out = append(out, bus.MessageFragment{Type: bus.FragmentTypeText, Text: token})
			}
		}

		wsStart := i
		for i < len(runes) && unicode.IsSpace(runes[i]) {
			i++
		}
		if wsStart < i {
			out = append(out, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: string(runes[wsStart:i]),
			})
		}
	}

	return out
}

func containsEmoteFragment(fragments []bus.MessageFragment) bool {
	for _, fragment := range fragments {
		if fragment.Type == bus.FragmentTypeEmote {
			return true
		}
	}
	return false
}

// LookupThirdParty resolves a third-party emote code using channel scopes before globals.
func (c *Cache) LookupThirdParty(platform, channelLogin, code string, emotes config.EmotesConfig) (Metadata, bool) {
	if c == nil || code == "" {
		return Metadata{}, false
	}

	channelScope := ChannelScope(platform, channelLogin)
	lookupOrder := []struct {
		provider ProviderID
		scope    Scope
	}{
		{Provider7TV, channelScope},
		{ProviderFFZ, channelScope},
		{ProviderBTTV, channelScope},
		{Provider7TV, GlobalScope()},
		{ProviderFFZ, GlobalScope()},
		{ProviderBTTV, GlobalScope()},
	}

	for _, item := range lookupOrder {
		if !providerEnabled(emotes, item.provider) {
			continue
		}
		if meta, ok := c.Lookup(item.provider, item.scope, code); ok {
			return meta, true
		}
	}

	return Metadata{}, false
}

func providerEnabled(emotes config.EmotesConfig, provider ProviderID) bool {
	switch provider {
	case ProviderFFZ:
		return emotes.FFZ
	case ProviderBTTV:
		return emotes.BTTV
	case Provider7TV:
		return emotes.SevenTV
	default:
		return false
	}
}

func normalizeChannelLogin(channel string) string {
	channel = strings.TrimSpace(channel)
	channel = strings.TrimPrefix(channel, "#")
	return strings.ToLower(channel)
}

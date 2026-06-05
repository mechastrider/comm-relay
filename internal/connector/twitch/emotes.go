package twitch

import (
	"sort"
	"strings"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/mechastrider/comm-relay/internal/bus"
)

const (
	twitchEmoteProvider = "twitch"
	twitchEmoteWidth    = 28
	twitchEmoteHeight   = 28
)

type emoteSpan struct {
	start int
	end   int
	id    string
}

// twitchEmoteURL builds a static dark-theme emote image URL for the given Twitch emote ID.
func twitchEmoteURL(emoteID string) string {
	emoteID = strings.TrimSpace(emoteID)
	if emoteID == "" {
		return ""
	}
	return "https://static-cdn.jtvnw.net/emoticons/v2/" + emoteID + "/static/dark/2.0"
}

// mapEmoteFragments converts Twitch IRC emote metadata into ordered message fragments.
// Returns nil when there are no emotes or when positions are invalid or overlapping.
func mapEmoteFragments(message string, emotes []*twitch.Emote) []bus.MessageFragment {
	if len(emotes) == 0 || message == "" {
		return nil
	}

	runes := []rune(message)
	if len(runes) == 0 {
		return nil
	}

	spans := collectEmoteSpans(emotes)
	if len(spans) == 0 {
		return nil
	}

	sort.Slice(spans, func(i, j int) bool {
		if spans[i].start == spans[j].start {
			return spans[i].end < spans[j].end
		}
		return spans[i].start < spans[j].start
	})

	if !validEmoteSpans(spans, len(runes)) {
		return nil
	}

	fragments := make([]bus.MessageFragment, 0, len(spans)*2+1)
	cursor := 0

	for _, span := range spans {
		if span.start > cursor {
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: string(runes[cursor:span.start]),
			})
		}

		emoteText := string(runes[span.start : span.end+1])
		fragments = append(fragments, bus.MessageFragment{
			Type:     bus.FragmentTypeEmote,
			Text:     emoteText,
			Provider: twitchEmoteProvider,
			ID:       span.id,
			URL:      twitchEmoteURL(span.id),
			Width:    twitchEmoteWidth,
			Height:   twitchEmoteHeight,
			Animated: false,
		})
		cursor = span.end + 1
	}

	if cursor < len(runes) {
		fragments = append(fragments, bus.MessageFragment{
			Type: bus.FragmentTypeText,
			Text: string(runes[cursor:]),
		})
	}

	if len(fragments) == 0 {
		return nil
	}

	return fragments
}

func collectEmoteSpans(emotes []*twitch.Emote) []emoteSpan {
	spans := make([]emoteSpan, 0, len(emotes))
	for _, emote := range emotes {
		if emote == nil {
			continue
		}
		id := strings.TrimSpace(emote.ID)
		if id == "" {
			continue
		}
		for _, pos := range emote.Positions {
			spans = append(spans, emoteSpan{
				start: pos.Start,
				end:   pos.End,
				id:    id,
			})
		}
	}
	return spans
}

func validEmoteSpans(spans []emoteSpan, runeCount int) bool {
	prevEnd := -1
	for _, span := range spans {
		if span.start < 0 || span.end < span.start || span.end >= runeCount {
			return false
		}
		if span.start <= prevEnd {
			return false
		}
		prevEnd = span.end
	}
	return true
}

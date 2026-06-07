package youtube

import (
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/emote/ytemoji"
)

// mapEmojiFragments converts YouTube messageText shortcuts such as ":heart:" into emote fragments.
func mapEmojiFragments(messageText string, catalog *ytemoji.Catalog) []bus.MessageFragment {
	if messageText == "" || catalog == nil {
		return nil
	}

	runes := []rune(messageText)
	if len(runes) == 0 {
		return nil
	}

	fragments := make([]bus.MessageFragment, 0, 4)
	i := 0

	for i < len(runes) {
		if runes[i] != ':' {
			start := i
			for i < len(runes) && runes[i] != ':' {
				i++
			}
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: string(runes[start:i]),
			})
			continue
		}

		end := i + 1
		for end < len(runes) && runes[end] != ':' {
			end++
		}
		if end >= len(runes) {
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: string(runes[i:]),
			})
			break
		}

		shortcut := string(runes[i : end+1])
		if entry, ok := catalog.Lookup(shortcut); ok {
			fragments = append(fragments, bus.MessageFragment{
				Type:     bus.FragmentTypeEmote,
				Text:     shortcut,
				Provider: ytemoji.ProviderID,
				ID:       entry.ID,
				URL:      entry.URL,
				Width:    entry.Width,
				Height:   entry.Height,
				Animated: false,
			})
		} else {
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: shortcut,
			})
		}
		i = end + 1
	}

	if !containsEmoteFragment(fragments) {
		return nil
	}
	return fragments
}

func containsEmoteFragment(fragments []bus.MessageFragment) bool {
	for _, fragment := range fragments {
		if fragment.Type == bus.FragmentTypeEmote {
			return true
		}
	}
	return false
}

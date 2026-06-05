package imagelink

import (
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

// Enrich scans message fragments for direct image links and adds image_link blocks when allowed.
// Blocked URLs remain plain text. The backend never fetches remote image URLs.
func Enrich(msg *bus.ChatMessage, cfg config.ImagePreviewsConfig) {
	if msg == nil || msg.Message == "" {
		return
	}

	policy := PolicyFromConfig(cfg)
	if !policy.Enabled {
		return
	}

	enriched := enrichFragments(msg.Fragments, msg.Message, policy)
	if enriched != nil {
		msg.Fragments = enriched
	}
}

func enrichFragments(fragments []bus.MessageFragment, message string, policy Policy) []bus.MessageFragment {
	previewsUsed := 0

	if len(fragments) == 0 {
		matched := splitTextFragments(message, policy, &previewsUsed)
		if !containsImageLinkFragment(matched) {
			return nil
		}
		return matched
	}

	out := make([]bus.MessageFragment, 0, len(fragments)+2)
	changed := false

	for _, fragment := range fragments {
		if fragment.Type != bus.FragmentTypeText || fragment.Text == "" {
			out = append(out, fragment)
			continue
		}

		matched := splitTextFragments(fragment.Text, policy, &previewsUsed)
		if !containsImageLinkFragment(matched) {
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

func containsImageLinkFragment(fragments []bus.MessageFragment) bool {
	for _, fragment := range fragments {
		if fragment.Type == bus.FragmentTypeImageLink {
			return true
		}
	}
	return false
}

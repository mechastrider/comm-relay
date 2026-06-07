package vk

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/bus"
)

const (
	vkEmoteProvider = "vk"
	vkEmoteWidth    = 28
	vkEmoteHeight   = 28
)

type mappedMessageContent struct {
	message   string
	fragments []bus.MessageFragment
}

func buildMessageContent(blocks []contentBlock, emotesEnabled bool) mappedMessageContent {
	var message strings.Builder
	fragments := make([]bus.MessageFragment, 0, len(blocks))
	hasEmote := false

	for _, block := range blocks {
		switch block.Type {
		case "text":
			text := parseTextContent(block.Content)
			if text == "" {
				continue
			}
			message.WriteString(text)
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: text,
			})
		case "mention":
			name := strings.TrimSpace(block.DisplayName)
			if name == "" {
				continue
			}
			mention := "@" + name
			message.WriteString(mention)
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: mention,
			})
		case "smile":
			label := smileLabel(block)
			if label == "" {
				continue
			}
			message.WriteString(label)
			if emotesEnabled {
				if fragment, ok := mapSmileFragment(block, label); ok {
					fragments = append(fragments, fragment)
					hasEmote = true
					continue
				}
			}
			fragments = append(fragments, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: label,
			})
		}
	}

	out := mappedMessageContent{message: message.String()}
	if hasEmote {
		out.fragments = fragments
	}
	return out
}

func mapSmileFragment(block contentBlock, label string) (bus.MessageFragment, bool) {
	url := smileImageURL(block)
	if url == "" {
		return bus.MessageFragment{}, false
	}

	id := strings.TrimSpace(block.ID)
	if id == "" {
		id = strings.TrimSpace(block.Name)
	}
	if id == "" {
		id = url
	}

	return bus.MessageFragment{
		Type:     bus.FragmentTypeEmote,
		Text:     label,
		Provider: vkEmoteProvider,
		ID:       id,
		URL:      url,
		Width:    vkEmoteWidth,
		Height:   vkEmoteHeight,
		Animated: block.IsAnimated,
	}, true
}

func smileLabel(block contentBlock) string {
	name := strings.TrimSpace(block.Name)
	if name == "" {
		return ""
	}
	if strings.HasPrefix(name, ":") && strings.HasSuffix(name, ":") {
		return name
	}
	return ":" + name + ":"
}

func smileImageURL(block contentBlock) string {
	for _, candidate := range []string{block.SmallURL, block.MediumURL, block.LargeURL} {
		url := strings.TrimSpace(candidate)
		if url != "" {
			return url
		}
	}
	return ""
}

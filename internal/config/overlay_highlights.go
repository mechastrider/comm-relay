package config

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

const (
	// MaxOverlayHighlightWords is the maximum number of global highlight words.
	MaxOverlayHighlightWords = 64
	overlayHighlightWordMax  = 64
)

// OverlayHighlightsConfig holds the global mention-word list.
type OverlayHighlightsConfig struct {
	Enabled bool     `json:"enabled"`
	Words   []string `json:"words"`
}

func defaultOverlayHighlights() OverlayHighlightsConfig {
	return OverlayHighlightsConfig{
		Enabled: false,
		Words:   []string{},
	}
}

func (h *OverlayHighlightsConfig) applyDefaults() {
	if h.Words == nil {
		h.Words = []string{}
	}
}

func (h OverlayHighlightsConfig) validateFields() FieldErrors {
	fields := FieldErrors{}
	if len(h.Words) > MaxOverlayHighlightWords {
		fields["overlay_highlights_words"] = fmt.Sprintf(
			"Maximum %d highlight words allowed.",
			MaxOverlayHighlightWords,
		)
	}
	seen := make(map[string]struct{}, len(h.Words))
	for i, raw := range h.Words {
		word := strings.TrimSpace(raw)
		prefix := fmt.Sprintf("overlay_highlights_word_%d", i)
		if word == "" {
			fields[prefix] = "Highlight word cannot be empty."
			continue
		}
		if utf8.RuneCountInString(word) > overlayHighlightWordMax {
			fields[prefix] = fmt.Sprintf("Highlight word must be at most %d characters.", overlayHighlightWordMax)
			continue
		}
		key := strings.ToLower(word)
		if _, exists := seen[key]; exists {
			fields[prefix] = "Duplicate highlight word."
			continue
		}
		seen[key] = struct{}{}
	}
	return fields
}

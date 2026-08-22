package config

import (
	"fmt"
	"regexp"
	"strings"
)

const (
	OverlayHighlightMatchWord = "word"
	MaxOverlayHighlightRules  = 32
	MaxOverlayHighlightWords  = 64
)

var overlayHighlightIDRe = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,31}$`)

// OverlayHighlightRule highlights entire messages when text matches configured words.
type OverlayHighlightRule struct {
	ID          string   `json:"id"`
	Words       []string `json:"words"`
	Match       string   `json:"match"`
	BorderColor string   `json:"border_color"`
	TextColor   string   `json:"text_color"`
}

// OverlayHighlightsConfig holds global highlight rules (not per-preset).
type OverlayHighlightsConfig struct {
	Enabled bool                   `json:"enabled"`
	Rules   []OverlayHighlightRule `json:"rules"`
}

func defaultOverlayHighlights() OverlayHighlightsConfig {
	return OverlayHighlightsConfig{
		Enabled: false,
		Rules:   nil,
	}
}

func (h *OverlayHighlightsConfig) applyDefaults() {
	if h.Rules == nil {
		h.Rules = []OverlayHighlightRule{}
	}
}

func (h OverlayHighlightsConfig) validateFields() FieldErrors {
	fields := FieldErrors{}
	if !h.Enabled {
		return fields
	}
	if len(h.Rules) > MaxOverlayHighlightRules {
		fields["overlay_highlights_rules"] = fmt.Sprintf(
			"Maximum %d highlight rules allowed.",
			MaxOverlayHighlightRules,
		)
	}
	seen := make(map[string]struct{}, len(h.Rules))
	for i, rule := range h.Rules {
		prefix := fmt.Sprintf("overlay_highlight_%d", i)
		id := strings.TrimSpace(rule.ID)
		if id == "" || !overlayHighlightIDRe.MatchString(id) {
			fields[prefix+"_id"] = "Rule id must start with a letter and use lowercase letters, numbers, underscore, or hyphen."
		} else if _, dup := seen[id]; dup {
			fields[prefix+"_id"] = "Duplicate highlight rule id."
		} else {
			seen[id] = struct{}{}
		}
		if len(rule.Words) == 0 {
			fields[prefix+"_words"] = "Add at least one word."
		}
		if len(rule.Words) > MaxOverlayHighlightWords {
			fields[prefix+"_words"] = fmt.Sprintf("Maximum %d words per rule.", MaxOverlayHighlightWords)
		}
		for _, word := range rule.Words {
			if strings.TrimSpace(word) == "" {
				fields[prefix+"_words"] = "Words cannot be empty."
				break
			}
		}
		match := strings.TrimSpace(rule.Match)
		if match == "" {
			match = OverlayHighlightMatchWord
		}
		if match != OverlayHighlightMatchWord {
			fields[prefix+"_match"] = "Only whole-word matching is supported."
		}
		if rule.BorderColor != "" {
			validateOverlayHexColor(fields, prefix+"_border_color", rule.BorderColor)
		}
		if rule.TextColor != "" {
			validateOverlayHexColor(fields, prefix+"_text_color", rule.TextColor)
		}
		if rule.BorderColor == "" && rule.TextColor == "" {
			fields[prefix+"_border_color"] = "Set a border or text color."
		}
	}
	return fields
}

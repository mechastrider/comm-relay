package imagelink

import (
	"strings"
	"unicode"

	"github.com/mechastrider/comm-relay/internal/bus"
)

// splitTextFragments scans text for http(s) URLs and splits them into text and image_link fragments.
func splitTextFragments(text string, policy Policy, previewsUsed *int) []bus.MessageFragment {
	if text == "" {
		return nil
	}

	out := make([]bus.MessageFragment, 0, 4)
	runes := []rune(text)
	i := 0

	for i < len(runes) {
		if !isURLStart(runes, i) {
			start := i
			for i < len(runes) && !isURLStart(runes, i) {
				i++
			}
			out = append(out, bus.MessageFragment{
				Type: bus.FragmentTypeText,
				Text: string(runes[start:i]),
			})
			continue
		}

		start := i
		i = scanURLRunes(runes, start)
		rawURL := string(runes[start:i])
		trimmed := trimURLTrailingPunctuation(rawURL)
		suffix := ""
		if len(trimmed) < len(rawURL) {
			suffix = rawURL[len(trimmed):]
		}

		if policy.Enabled && *previewsUsed < policy.MaxPerMessage && ValidateURL(trimmed, policy.AllowedHosts) {
			out = append(out, bus.MessageFragment{
				Type:   bus.FragmentTypeImageLink,
				Text:   trimmed,
				URL:    trimmed,
				Width:  policy.MaxWidthPx,
				Height: policy.MaxHeightPx,
			})
			*previewsUsed++
			if suffix != "" {
				out = append(out, bus.MessageFragment{Type: bus.FragmentTypeText, Text: suffix})
			}
			continue
		}

		out = append(out, bus.MessageFragment{Type: bus.FragmentTypeText, Text: rawURL})
	}

	return out
}

func isURLStart(runes []rune, i int) bool {
	remaining := string(runes[i:])
	return strings.HasPrefix(remaining, "http://") || strings.HasPrefix(remaining, "https://")
}

func scanURLRunes(runes []rune, start int) int {
	i := start
	for i < len(runes) {
		r := runes[i]
		if unicode.IsSpace(r) {
			break
		}
		if r == ')' || r == ']' || r == '}' {
			break
		}
		i++
	}
	return i
}

func trimURLTrailingPunctuation(rawURL string) string {
	trimmed := strings.TrimRight(rawURL, ".,!?;:")
	for strings.HasSuffix(trimmed, ")") {
		open := strings.Count(trimmed, "(")
		closeCount := strings.Count(trimmed, ")")
		if closeCount <= open {
			break
		}
		trimmed = strings.TrimSuffix(trimmed, ")")
	}
	return trimmed
}

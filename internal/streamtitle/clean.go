package streamtitle

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

const maxTitleRunes = 140

func cleanTitle(value string) string {
	value = strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, value))
	if value == "" {
		return ""
	}
	if utf8.RuneCountInString(value) <= maxTitleRunes {
		return value
	}
	return strings.TrimSpace(string([]rune(value)[:maxTitleRunes]))
}

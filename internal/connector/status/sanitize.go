package status

import (
	"regexp"
	"strings"
)

var secretPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(access_token|refresh_token|client_secret|api_key|password)\s*[=:]\s*\S+`),
	regexp.MustCompile(`(?i)Bearer\s+\S+`),
}

// SanitizeError returns a UI-safe error string without secrets.
func SanitizeError(msg string) string {
	msg = strings.TrimSpace(msg)
	if msg == "" {
		return ""
	}

	for _, re := range secretPatterns {
		msg = re.ReplaceAllString(msg, "$1=[redacted]")
	}

	const maxLen = 240
	if len(msg) > maxLen {
		msg = msg[:maxLen] + "…"
	}

	return msg
}

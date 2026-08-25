package streamstatus

import (
	"regexp"

	"github.com/mechastrider/comm-relay/internal/connector/status"
)

var urlQueryPattern = regexp.MustCompile(`(https?://[^\s?]+)\?[^\s]*`)

// RedactError strips URL query strings then redacts secrets for admin-safe display.
func RedactError(msg string) string {
	msg = urlQueryPattern.ReplaceAllString(msg, "$1")
	return status.SanitizeError(msg)
}

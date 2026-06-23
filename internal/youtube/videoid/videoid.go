package videoid

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
)

var bareVideoIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)

// ParseInput extracts a YouTube video ID from a URL or bare 11-character ID.
func ParseInput(input string) (string, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", errors.New("video input is empty")
	}

	if bareVideoIDPattern.MatchString(input) {
		return input, nil
	}

	parsed, err := url.Parse(input)
	if err != nil {
		return "", errors.Errorf("parse video url: %w", err)
	}

	host := strings.ToLower(parsed.Hostname())
	host = strings.TrimPrefix(host, "www.")
	host = strings.TrimPrefix(host, "m.")

	switch host {
	case "youtube.com", "music.youtube.com", "gaming.youtube.com":
		if id := parsed.Query().Get("v"); id != "" {
			return validate(id)
		}
		path := strings.Trim(parsed.Path, "/")
		if strings.HasPrefix(path, "live/") {
			return validate(strings.TrimPrefix(path, "live/"))
		}
	case "youtu.be":
		path := strings.Trim(parsed.Path, "/")
		if path != "" {
			return validate(path)
		}
	}

	return "", errors.New("unsupported YouTube video URL")
}

func validate(id string) (string, error) {
	id = strings.TrimSpace(id)
	if bareVideoIDPattern.MatchString(id) {
		return id, nil
	}
	return "", errors.New("invalid YouTube video ID")
}

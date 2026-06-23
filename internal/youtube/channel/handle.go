package channel

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
)

var channelIDPattern = regexp.MustCompile(`^UC[\w-]{22}$`)

// Ref identifies a YouTube channel by @handle or channel ID.
type Ref struct {
	Handle    string
	ChannelID string
}

// ParseRef normalizes a channel handle, @handle, or channel URL/ID.
func ParseRef(input string) (Ref, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return Ref{}, errors.New("channel handle is empty")
	}

	if strings.HasPrefix(input, "@") {
		handle := normalizeHandle(input[1:])
		if handle == "" {
			return Ref{}, errors.New("invalid channel handle")
		}
		return Ref{Handle: handle}, nil
	}

	if channelIDPattern.MatchString(input) {
		return Ref{ChannelID: input}, nil
	}

	if strings.Contains(input, "youtube.com") || strings.Contains(input, "youtu.be") {
		if !strings.Contains(input, "://") {
			input = "https://" + input
		}
		parsed, err := url.Parse(input)
		if err != nil {
			return Ref{}, errors.Errorf("parse channel url: %w", err)
		}

		path := strings.Trim(parsed.Path, "/")
		switch {
		case strings.HasPrefix(path, "@"):
			handle := normalizeHandle(strings.TrimPrefix(path, "@"))
			if handle == "" {
				return Ref{}, errors.New("invalid channel handle in url")
			}
			return Ref{Handle: handle}, nil
		case strings.HasPrefix(path, "channel/"):
			id := strings.TrimPrefix(path, "channel/")
			id = strings.Split(id, "/")[0]
			if !channelIDPattern.MatchString(id) {
				return Ref{}, errors.New("invalid channel id in url")
			}
			return Ref{ChannelID: id}, nil
		case strings.HasPrefix(path, "c/"):
			handle := normalizeHandle(strings.TrimPrefix(path, "c/"))
			if handle == "" {
				return Ref{}, errors.New("invalid legacy channel path")
			}
			return Ref{Handle: handle}, nil
		case strings.HasPrefix(path, "user/"):
			handle := normalizeHandle(strings.TrimPrefix(path, "user/"))
			if handle == "" {
				return Ref{}, errors.New("invalid legacy user channel path")
			}
			return Ref{Handle: handle}, nil
		}
	}

	handle := normalizeHandle(input)
	if handle == "" {
		return Ref{}, errors.New("invalid channel handle")
	}
	return Ref{Handle: handle}, nil
}

func normalizeHandle(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.Trim(raw, "/")
	if raw == "" {
		return ""
	}
	raw = strings.Split(raw, "/")[0]
	raw = strings.TrimPrefix(raw, "@")
	return strings.TrimSpace(raw)
}

// LivePageURL returns the channel live tab URL.
func (r Ref) LivePageURL() string {
	if r.ChannelID != "" {
		return "https://www.youtube.com/channel/" + r.ChannelID + "/live"
	}
	return "https://www.youtube.com/@" + r.Handle + "/live"
}

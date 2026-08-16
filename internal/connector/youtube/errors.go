package youtube

import "github.com/muonsoft/errors"

var (
	// ErrNotConfigured means OAuth client credentials are missing.
	ErrNotConfigured   = errors.New("youtube oauth is not configured")
	errNotConnected    = errors.New("youtube oauth is not connected")
	errNoLiveChat      = errors.New("no active youtube live chat")
	errStreamEnded     = errors.New("youtube live stream ended")
	errNoVideoInput    = errors.New("youtube video url or id is not set")
	errNoChannelHandle = errors.New("youtube channel handle is invalid")
)

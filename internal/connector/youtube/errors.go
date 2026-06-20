package youtube

import "github.com/muonsoft/errors"

var (
	errNotConfigured = errors.New("youtube oauth is not configured")
	errNotConnected  = errors.New("youtube oauth is not connected")
	errNoLiveChat    = errors.New("no active youtube live chat")
	errStreamEnded   = errors.New("youtube live stream ended")
	errNoVideoInput  = errors.New("youtube video url or id is not set")
)

package emote

import "github.com/muonsoft/errors"

// ErrNotFound is returned when a provider responds with HTTP 404.
var ErrNotFound = errors.New("not found")

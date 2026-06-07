package twitch

import "time"

const (
	initialReconnectDelay = time.Second
	maxReconnectDelay     = 30 * time.Second
)

type reconnectBackoff struct {
	delay time.Duration
}

func newReconnectBackoff() reconnectBackoff {
	return reconnectBackoff{delay: initialReconnectDelay}
}

func (b reconnectBackoff) current() time.Duration {
	return b.delay
}

func (b reconnectBackoff) next() reconnectBackoff {
	next := b.delay * 2
	if next > maxReconnectDelay {
		next = maxReconnectDelay
	}
	return reconnectBackoff{delay: next}
}

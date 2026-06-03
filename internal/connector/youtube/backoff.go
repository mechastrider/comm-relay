package youtube

import "time"

type reconnectBackoff struct {
	step time.Duration
	max  time.Duration
}

func newReconnectBackoff() *reconnectBackoff {
	return &reconnectBackoff{step: 2 * time.Second, max: 60 * time.Second}
}

func (b *reconnectBackoff) current() time.Duration {
	if b.step <= 0 {
		return 2 * time.Second
	}
	return b.step
}

func (b *reconnectBackoff) next() *reconnectBackoff {
	next := b.step * 2
	if next > b.max {
		next = b.max
	}
	return &reconnectBackoff{step: next, max: b.max}
}

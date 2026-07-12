package retry

import "time"

// Backoff implements exponential reconnect delay with a configurable ceiling.
type Backoff struct {
	delay   time.Duration
	initial time.Duration
	max     time.Duration
}

// NewBackoff creates a backoff that doubles from initial up to max.
func NewBackoff(initial, max time.Duration) Backoff {
	return Backoff{delay: initial, initial: initial, max: max}
}

// Current returns the delay before the next reconnect attempt.
func (b Backoff) Current() time.Duration {
	if b.delay <= 0 {
		return b.initial
	}
	return b.delay
}

// Next returns a backoff with the doubled delay, capped at max.
func (b Backoff) Next() Backoff {
	next := b.Current() * 2
	if next > b.max {
		next = b.max
	}
	return Backoff{delay: next, initial: b.initial, max: b.max}
}

// Reset returns a backoff at its initial delay.
func (b Backoff) Reset() Backoff {
	return Backoff{delay: b.initial, initial: b.initial, max: b.max}
}

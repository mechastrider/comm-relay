package retry

import "time"

// Backoff implements exponential reconnect delay with a configurable ceiling.
type Backoff struct {
	delay    time.Duration
	initial  time.Duration
	maxDelay time.Duration
}

// NewBackoff creates a backoff that doubles from initial up to maxDelay.
func NewBackoff(initial, maxDelay time.Duration) Backoff {
	return Backoff{delay: initial, initial: initial, maxDelay: maxDelay}
}

// Current returns the delay before the next reconnect attempt.
func (b Backoff) Current() time.Duration {
	if b.delay <= 0 {
		return b.initial
	}
	return b.delay
}

// Next returns a backoff with the doubled delay, capped at maxDelay.
func (b Backoff) Next() Backoff {
	next := b.Current() * 2
	if next > b.maxDelay {
		next = b.maxDelay
	}
	return Backoff{delay: next, initial: b.initial, maxDelay: b.maxDelay}
}

// Reset returns a backoff at its initial delay.
func (b Backoff) Reset() Backoff {
	return Backoff{delay: b.initial, initial: b.initial, maxDelay: b.maxDelay}
}

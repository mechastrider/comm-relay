package emote

import "time"

const (
	initialRetryDelay = time.Second
	maxRetryDelay     = 5 * time.Minute
)

type refreshBackoff struct {
	delay     time.Duration
	nextRetry time.Time
}

func newRefreshBackoff() refreshBackoff {
	return refreshBackoff{delay: initialRetryDelay}
}

func (b refreshBackoff) canRetry(now time.Time) bool {
	return b.nextRetry.IsZero() || !now.Before(b.nextRetry)
}

func (b refreshBackoff) onFailure(now time.Time) refreshBackoff {
	wait := b.delay
	next := wait * 2
	if next > maxRetryDelay {
		next = maxRetryDelay
	}
	return refreshBackoff{
		delay:     next,
		nextRetry: now.Add(wait),
	}
}

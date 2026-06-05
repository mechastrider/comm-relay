package runtime

import "time"

// Info holds process runtime facts for diagnostics.
type Info struct {
	StartedAt time.Time
}

// NewInfo records the process start time.
func NewInfo() *Info {
	return &Info{StartedAt: time.Now()}
}

// Uptime returns elapsed time since start.
func (i *Info) Uptime() time.Duration {
	if i == nil || i.StartedAt.IsZero() {
		return 0
	}
	return time.Since(i.StartedAt)
}

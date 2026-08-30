package runtime

import (
	"time"

	"github.com/google/uuid"
)

// Info holds process runtime facts for diagnostics.
type Info struct {
	StartedAt  time.Time
	InstanceID string
}

// NewInfo records the process start time and a unique instance id for health checks.
func NewInfo() *Info {
	return &Info{
		StartedAt:  time.Now(),
		InstanceID: uuid.NewString(),
	}
}

// Uptime returns elapsed time since start.
func (i *Info) Uptime() time.Duration {
	if i == nil || i.StartedAt.IsZero() {
		return 0
	}
	return time.Since(i.StartedAt)
}

package status

import "sync"

// State is the connection state exposed to the admin API.
type State string

const (
	StateDisabled     State = "disabled"
	StateDisconnected State = "disconnected"
	StateConnecting   State = "connecting"
	StateConnected    State = "connected"
	StateError        State = "error"
)

// Snapshot is a platform connector status for the admin UI.
type Snapshot struct {
	State  State
	Detail string
}

// Registry holds live connector status snapshots (thread-safe).
type Registry struct {
	mu      sync.RWMutex
	youtube Snapshot
}

// NewRegistry creates an empty status registry.
func NewRegistry() *Registry {
	return &Registry{}
}

// SetYouTube updates YouTube connector status.
func (r *Registry) SetYouTube(s Snapshot) {
	r.mu.Lock()
	r.youtube = s
	r.mu.Unlock()
}

// YouTube returns the current YouTube connector status.
func (r *Registry) YouTube() Snapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.youtube
}

package status

import (
	"context"
	"sync"

	"github.com/mechastrider/comm-relay/internal/bus"
)

// Platform identifiers used across connectors and the admin API.
const (
	PlatformTwitch  = "twitch"
	PlatformYouTube = "youtube"
	PlatformVK      = "vk"
)

// State is the connection state exposed to the admin API.
type State string

// Known connector states for the admin API.
const (
	StateDisabled     State = "disabled"
	StateDisconnected State = "disconnected"
	StateConnecting   State = "connecting"
	StateConnected    State = "connected"
	StateReconnecting State = "reconnecting"
	StateError        State = "error"
)

// Snapshot is a platform connector status for the admin UI.
type Snapshot struct {
	State        State
	Detail       string
	LastError    string
	MessageCount uint64
}

// Registry holds live connector status snapshots (thread-safe).
type Registry struct {
	mu        sync.RWMutex
	platforms map[string]Snapshot
}

// NewRegistry creates an empty status registry.
func NewRegistry() *Registry {
	return &Registry{
		platforms: make(map[string]Snapshot),
	}
}

// Set updates status for a platform.
func (r *Registry) Set(platform string, s Snapshot) {
	r.mu.Lock()
	r.platforms[platform] = s
	r.mu.Unlock()
}

// Get returns the current status for a platform.
func (r *Registry) Get(platform string) Snapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.platforms[platform]
}

// RecordMessage increments the received message counter for a platform.
func (r *Registry) RecordMessage(platform string) {
	if platform == "" {
		return
	}

	r.mu.Lock()
	snap := r.platforms[platform]
	snap.MessageCount++
	r.platforms[platform] = snap
	r.mu.Unlock()
}

// MessageCounts returns per-platform message totals.
func (r *Registry) MessageCounts() map[string]uint64 {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make(map[string]uint64, len(r.platforms))
	for platform, snap := range r.platforms {
		if snap.MessageCount > 0 {
			out[platform] = snap.MessageCount
		}
	}
	return out
}

// SetYouTube updates YouTube connector status.
func (r *Registry) SetYouTube(s Snapshot) {
	r.Set(PlatformYouTube, s)
}

// YouTube returns the current YouTube connector status.
func (r *Registry) YouTube() Snapshot {
	return r.Get(PlatformYouTube)
}

// SetVK updates VK connector status.
func (r *Registry) SetVK(s Snapshot) {
	r.Set(PlatformVK, s)
}

// VK returns the current VK connector status.
func (r *Registry) VK() Snapshot {
	return r.Get(PlatformVK)
}

// SetTwitch updates Twitch connector status.
func (r *Registry) SetTwitch(s Snapshot) {
	r.Set(PlatformTwitch, s)
}

// Twitch returns the current Twitch connector status.
func (r *Registry) Twitch() Snapshot {
	return r.Get(PlatformTwitch)
}

// RunMessageCounter subscribes to chat events and increments per-platform counters.
func (r *Registry) RunMessageCounter(ctx context.Context, b *bus.Bus) {
	if r == nil || b == nil {
		return
	}

	events, unsub := b.Subscribe()
	defer unsub()

	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-events:
			if !ok {
				return
			}
			if ev.Type != bus.EventChatMessageReceived {
				continue
			}
			r.RecordMessage(ev.Message.Platform)
		}
	}
}

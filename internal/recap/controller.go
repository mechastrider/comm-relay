package recap

import (
	"context"
	"log/slog"
	"sync"

	"github.com/muonsoft/clog"
)

// State is the ephemeral runtime visibility state for production clients.
type State struct {
	Visible  bool
	Snapshot *Snapshot
}

// Publisher receives authoritative state after visibility transitions.
type Publisher func(State)

// Controller owns ephemeral hidden/visible recap presentation state.
type Controller struct {
	mu       sync.Mutex
	visible  bool
	snapshot *Snapshot
	publish  Publisher
}

// NewController constructs a controller that starts hidden.
func NewController(publish Publisher) *Controller {
	return &Controller{publish: publish}
}

// Current returns the latest runtime state.
func (c *Controller) Current() State {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.stateLocked()
}

// Show marks a committed snapshot visible and broadcasts the resulting state.
func (c *Controller) Show(snapshot *Snapshot) State {
	c.mu.Lock()
	c.visible = true
	if snapshot != nil {
		cloned := *snapshot
		c.snapshot = &cloned
	} else {
		c.snapshot = nil
	}
	state := c.stateLocked()
	c.mu.Unlock()
	c.emit(state)
	return state
}

// Hide clears runtime visibility without deleting the durable snapshot.
func (c *Controller) Hide() State {
	c.mu.Lock()
	c.visible = false
	c.snapshot = nil
	state := c.stateLocked()
	c.mu.Unlock()
	c.emit(state)
	return state
}

// HideOnNewStream hides recap after a new session commits.
func (c *Controller) HideOnNewStream() State {
	return c.Hide()
}

func (c *Controller) stateLocked() State {
	var snapshot *Snapshot
	if c.visible && c.snapshot != nil {
		cloned := *c.snapshot
		snapshot = &cloned
	}
	return State{
		Visible:  c.visible,
		Snapshot: snapshot,
	}
}

func (c *Controller) emit(state State) {
	if c.publish != nil {
		c.publish(state)
	}
	sessionID := ""
	snapshotID := ""
	if state.Snapshot != nil {
		sessionID = state.Snapshot.SessionID
		snapshotID = state.Snapshot.ID
	}
	clog.Info(context.Background(), "stream recap visibility changed",
		slog.String("session_id", sessionID),
		slog.String("snapshot_id", snapshotID),
		slog.Bool("visible", state.Visible),
	)
}

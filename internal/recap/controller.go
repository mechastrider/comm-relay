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
	mu             sync.Mutex
	transitionMu   sync.Mutex
	publishMu      sync.Mutex
	visible        bool
	snapshot       *Snapshot
	publish        Publisher
	transitionHook func(string)
	stateHook      func(string)
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
	state, err := c.ShowAfter(func() (*Snapshot, error) {
		return snapshot, nil
	})
	if err != nil {
		return State{}
	}
	return state
}

// Hide clears runtime visibility without deleting the durable snapshot.
func (c *Controller) Hide() State {
	state, err := c.HideAfter(func() error { return nil })
	if err != nil {
		return State{}
	}
	return state
}

// ShowAfter serializes snapshot capture and runtime visibility. Publication is
// ordered with other completed transitions after storage has released its lock.
func (c *Controller) ShowAfter(capture func() (*Snapshot, error)) (State, error) {
	c.beforeTransition("show")
	c.transitionMu.Lock()
	snapshot, err := capture()
	if err != nil {
		c.transitionMu.Unlock()
		return State{}, err
	}
	state := c.showLocked(snapshot)
	c.afterStateTransition("show")
	c.publishMu.Lock()
	c.transitionMu.Unlock()
	c.emit(state)
	c.publishMu.Unlock()
	return state, nil
}

// HideAfter serializes a successful external transition, such as committing a
// new stream session, with the resulting hidden recap state.
func (c *Controller) HideAfter(commit func() error) (State, error) {
	c.beforeTransition("hide")
	c.transitionMu.Lock()
	if err := commit(); err != nil {
		c.transitionMu.Unlock()
		return State{}, err
	}
	state := c.hideLocked()
	c.afterStateTransition("hide")
	c.publishMu.Lock()
	c.transitionMu.Unlock()
	c.emit(state)
	c.publishMu.Unlock()
	return state, nil
}

func (c *Controller) showLocked(snapshot *Snapshot) State {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.visible = true
	if snapshot != nil {
		cloned := *snapshot
		c.snapshot = &cloned
	} else {
		c.snapshot = nil
	}
	return c.stateLocked()
}

func (c *Controller) hideLocked() State {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.visible = false
	c.snapshot = nil
	return c.stateLocked()
}

// SetTransitionHookForTest installs a deterministic synchronization hook for
// transition-race tests. It must be configured before concurrent use.
func (c *Controller) SetTransitionHookForTest(hook func(string)) {
	c.transitionHook = hook
}

// SetPublisherForTest replaces the publisher for deterministic controller
// tests. It must be configured before concurrent use.
func (c *Controller) SetPublisherForTest(publish Publisher) {
	c.publish = publish
}

// SetStateHookForTest installs a hook after state changes and before
// publication. It must be configured before concurrent use.
func (c *Controller) SetStateHookForTest(hook func(string)) {
	c.stateHook = hook
}

func (c *Controller) beforeTransition(kind string) {
	if c.transitionHook != nil {
		c.transitionHook(kind)
	}
}

func (c *Controller) afterStateTransition(kind string) {
	if c.stateHook != nil {
		c.stateHook(kind)
	}
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

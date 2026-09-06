// Package leaderboard owns the server-authoritative production leaderboard visibility state.
package leaderboard

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const commandBufferSize = 64

// Controller errors reported to synchronous callers.
var (
	ErrUnavailable     = errors.New("leaderboard visibility controller unavailable")
	ErrBusy            = errors.New("leaderboard visibility controller busy")
	ErrInvalidDuration = errors.New("invalid leaderboard display duration")
)

// State identifies the authoritative production visibility mode.
type State string

// Visibility states.
const (
	StateHidden State = "hidden"
	StateTimed  State = "timed"
	StatePinned State = "pinned"
)

// Reason identifies the latest cause of a visibility transition.
type Reason string

// Visibility transition reasons.
const (
	ReasonStartup    Reason = "startup"
	ReasonPolicy     Reason = "policy"
	ReasonManual     Reason = "manual"
	ReasonAward      Reason = "award"
	ReasonRankChange Reason = "rank_change"
	ReasonInterval   Reason = "interval"
	ReasonCommand    Reason = "command"
)

// Snapshot is the immutable public view of controller state.
type Snapshot struct {
	State        State      `json:"state"`
	Policy       string     `json:"policy"`
	Visible      bool       `json:"visible"`
	VisibleUntil *time.Time `json:"visible_until"`
	Reason       Reason     `json:"reason"`
}

// ConfigProvider supplies the latest persisted visibility configuration.
type ConfigProvider interface {
	Snapshot() config.Config
}

// Publisher receives authoritative snapshots after transitions.
type Publisher func(Snapshot)

type timer interface {
	C() <-chan time.Time
	Reset(time.Duration)
	Stop()
}

type clock interface {
	Now() time.Time
	NewTimer(time.Duration) timer
}

type realClock struct{}

func (realClock) Now() time.Time { return time.Now() }
func (realClock) NewTimer(duration time.Duration) timer {
	return &realTimer{timer: time.NewTimer(duration)}
}

type realTimer struct{ timer *time.Timer }

func (t *realTimer) C() <-chan time.Time { return t.timer.C }
func (t *realTimer) Reset(duration time.Duration) {
	if !t.timer.Stop() {
		select {
		case <-t.timer.C:
		default:
		}
	}
	t.timer.Reset(duration)
}
func (t *realTimer) Stop() {
	if !t.timer.Stop() {
		select {
		case <-t.timer.C:
		default:
		}
	}
}

// Option customizes a Controller during construction.
type Option func(*Controller)

func withClock(value clock) Option {
	return func(controller *Controller) {
		controller.clock = value
	}
}

type commandKind uint8

const (
	commandSnapshot commandKind = iota
	commandShow
	commandHide
	commandPin
	commandResume
	commandPolicyChanged
	commandTrigger
	commandDirty
	commandScheduleAward
)

type controllerCommand struct {
	kind     commandKind
	duration time.Duration
	reason   Reason
	response chan commandResponse
}

type commandResponse struct {
	snapshot Snapshot
	err      error
}

type override uint8

const (
	overrideNone override = iota
	overrideShow
	overrideHide
	overridePin
)

type scheduledTrigger struct {
	deadline time.Time
	reason   Reason
}

// Controller serializes all visibility state changes on one goroutine.
type Controller struct {
	configs  ConfigProvider
	publish  Publisher
	clock    clock
	commands chan controllerCommand
	running  atomic.Bool
	current  atomic.Value

	state         State
	reason        Reason
	visibleUntil  time.Time
	cooldownUntil time.Time
	dirtySince    time.Time
	scheduled     []scheduledTrigger
	override      override
}

// Current returns the latest immutable snapshot without waiting on the owner goroutine.
func (c *Controller) Current() Snapshot {
	value := c.current.Load()
	if value == nil {
		return Snapshot{}
	}
	return value.(Snapshot)
}

// NewController constructs a visibility controller from the current configuration.
func NewController(configs ConfigProvider, publish Publisher, options ...Option) (*Controller, error) {
	if configs == nil {
		return nil, errors.New("leaderboard visibility config provider is required")
	}

	controller := &Controller{
		configs:  configs,
		publish:  publish,
		clock:    realClock{},
		commands: make(chan controllerCommand, commandBufferSize),
	}
	for _, option := range options {
		option(controller)
	}
	controller.applyBaseline(ReasonStartup)
	return controller, nil
}

// Run owns controller state until ctx is canceled.
func (c *Controller) Run(ctx context.Context) error {
	if !c.running.CompareAndSwap(false, true) {
		return errors.New("leaderboard visibility controller already running")
	}
	defer c.running.Store(false)

	wake := c.clock.NewTimer(time.Hour)
	wake.Stop()
	c.emit()

	for {
		var wakeCh <-chan time.Time
		if deadline, ok := c.nextDeadline(); ok {
			duration := deadline.Sub(c.clock.Now())
			if duration < 0 {
				duration = 0
			}
			wake.Reset(duration)
			wakeCh = wake.C()
		} else {
			wake.Stop()
		}

		select {
		case <-ctx.Done():
			wake.Stop()
			return nil
		case now := <-wakeCh:
			c.handleDue(now)
		case cmd := <-c.commands:
			c.handleCommand(cmd)
		}
	}
}

// Snapshot returns state after processing deadlines due at the current time.
func (c *Controller) Snapshot(ctx context.Context) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandSnapshot})
}

// Show applies a manual timed override.
func (c *Controller) Show(ctx context.Context, duration time.Duration) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandShow, duration: duration})
}

// Hide applies a manual hidden override and starts automatic cooldown.
func (c *Controller) Hide(ctx context.Context) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandHide})
}

// Pin applies a manual pinned override.
func (c *Controller) Pin(ctx context.Context) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandPin})
}

// Resume clears manual override and immediately reapplies configured policy.
func (c *Controller) Resume(ctx context.Context) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandResume})
}

// PolicyChanged asks the controller to re-read configuration and apply its baseline.
func (c *Controller) PolicyChanged(ctx context.Context) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandPolicyChanged})
}

// Request synchronously submits an automatic or viewer-command display request.
func (c *Controller) Request(ctx context.Context, reason Reason) (Snapshot, error) {
	return c.call(ctx, controllerCommand{kind: commandTrigger, reason: reason})
}

// SubmitTrigger submits a non-blocking display request and reports queue acceptance.
func (c *Controller) SubmitTrigger(reason Reason) bool {
	return c.submit(controllerCommand{kind: commandTrigger, reason: reason})
}

// MarkDirty records a non-meaningful XP change for interval fallback.
func (c *Controller) MarkDirty() bool {
	return c.submit(controllerCommand{kind: commandDirty})
}

// ScheduleAward queues an award-triggered request after the alert duration.
func (c *Controller) ScheduleAward(delay time.Duration) bool {
	return c.Schedule(ReasonAward, delay)
}

// Schedule queues one delayed trigger without allocating another timer or goroutine.
func (c *Controller) Schedule(reason Reason, delay time.Duration) bool {
	return c.submit(controllerCommand{kind: commandScheduleAward, duration: delay, reason: reason})
}

func (c *Controller) call(ctx context.Context, cmd controllerCommand) (Snapshot, error) {
	if !c.running.Load() {
		return Snapshot{}, ErrUnavailable
	}
	cmd.response = make(chan commandResponse, 1)
	select {
	case c.commands <- cmd:
	default:
		return Snapshot{}, ErrBusy
	}

	select {
	case <-ctx.Done():
		return Snapshot{}, errors.Errorf("wait for leaderboard visibility controller: %w", ctx.Err())
	case response := <-cmd.response:
		return response.snapshot, response.err
	}
}

func (c *Controller) submit(cmd controllerCommand) bool {
	if !c.running.Load() {
		return false
	}
	select {
	case c.commands <- cmd:
		return true
	default:
		return false
	}
}

func (c *Controller) handleCommand(cmd controllerCommand) {
	now := c.clock.Now()
	var err error
	switch cmd.kind {
	case commandSnapshot:
		c.handleDue(now)
	case commandShow:
		duration := cmd.duration
		if duration == 0 {
			duration = time.Duration(c.currentConfig().DisplaySeconds) * time.Second
		}
		if duration < 5*time.Second || duration > 60*time.Second || duration%time.Second != 0 {
			err = ErrInvalidDuration
			break
		}
		c.override = overrideShow
		c.enterTimed(now, duration, ReasonManual, false)
	case commandHide:
		c.override = overrideHide
		c.cooldownUntil = now.Add(time.Duration(c.currentConfig().CooldownSeconds) * time.Second)
		c.enterHidden(ReasonManual)
	case commandPin:
		c.override = overridePin
		c.enterPinned(ReasonManual)
	case commandResume:
		c.override = overrideNone
		c.visibleUntil = time.Time{}
		c.applyBaseline(ReasonPolicy)
	case commandPolicyChanged:
		if c.override == overrideNone {
			c.visibleUntil = time.Time{}
			c.applyBaseline(ReasonPolicy)
		} else {
			c.emit()
		}
	case commandTrigger:
		c.request(now, cmd.reason)
	case commandDirty:
		c.markDirty(now)
	case commandScheduleAward:
		c.schedule(now, cmd.reason, cmd.duration)
	}

	if cmd.response != nil {
		cmd.response <- commandResponse{snapshot: c.snapshot(), err: err}
	}
}

func (c *Controller) currentConfig() config.LeaderboardVisibilityConfig {
	return c.configs.Snapshot().LeaderboardVisibility
}

func (c *Controller) applyBaseline(reason Reason) {
	if c.currentConfig().Policy == config.LeaderboardVisibilityPolicyAlways {
		c.enterPinned(reason)
		return
	}
	c.enterHidden(reason)
}

func (c *Controller) request(now time.Time, reason Reason) {
	if c.override == overrideHide || c.override == overridePin {
		return
	}
	if c.state == StatePinned {
		return
	}

	cfg := c.currentConfig()
	if reason == ReasonCommand {
		if cfg.Policy == config.LeaderboardVisibilityPolicyAlways {
			return
		}
		c.enterTimed(now, time.Duration(cfg.DisplaySeconds)*time.Second, reason, false)
		return
	}
	if cfg.Policy != config.LeaderboardVisibilityPolicyAutomatic {
		return
	}
	if reason == ReasonAward && !cfg.ShowOnAward {
		return
	}
	if reason == ReasonRankChange && !cfg.ShowOnRankChange {
		c.markDirty(now)
		return
	}
	if c.state != StateTimed && now.Before(c.cooldownUntil) {
		if reason == ReasonRankChange {
			c.markDirty(now)
		}
		return
	}
	c.enterTimed(now, time.Duration(cfg.DisplaySeconds)*time.Second, reason, true)
}

func (c *Controller) enterTimed(now time.Time, duration time.Duration, reason Reason, automatic bool) {
	deadline := now.Add(duration)
	if c.state == StateTimed && deadline.Before(c.visibleUntil) {
		deadline = c.visibleUntil
	}
	c.state = StateTimed
	c.reason = reason
	c.visibleUntil = deadline
	if automatic {
		c.cooldownUntil = now.Add(time.Duration(c.currentConfig().CooldownSeconds) * time.Second)
		c.dirtySince = time.Time{}
	}
	c.emit()
}

func (c *Controller) enterHidden(reason Reason) {
	c.state = StateHidden
	c.reason = reason
	c.visibleUntil = time.Time{}
	c.emit()
}

func (c *Controller) enterPinned(reason Reason) {
	c.state = StatePinned
	c.reason = reason
	c.visibleUntil = time.Time{}
	c.emit()
}

func (c *Controller) markDirty(now time.Time) {
	if c.currentConfig().Policy != config.LeaderboardVisibilityPolicyAutomatic || c.override != overrideNone {
		return
	}
	if c.dirtySince.IsZero() {
		c.dirtySince = now
	}
}

func (c *Controller) schedule(now time.Time, reason Reason, delay time.Duration) {
	if delay < 0 || len(c.scheduled) >= commandBufferSize {
		return
	}
	c.scheduled = append(c.scheduled, scheduledTrigger{deadline: now.Add(delay), reason: reason})
}

func (c *Controller) handleDue(now time.Time) {
	if c.state == StateTimed && !c.visibleUntil.After(now) {
		if c.override == overrideShow {
			c.override = overrideNone
		}
		c.visibleUntil = time.Time{}
		c.applyBaseline(ReasonPolicy)
	}

	remaining := c.scheduled[:0]
	for _, trigger := range c.scheduled {
		if trigger.deadline.After(now) {
			remaining = append(remaining, trigger)
			continue
		}
		c.request(now, trigger.reason)
	}
	c.scheduled = remaining

	if due, ok := c.dirtyDeadline(); ok && !due.After(now) {
		c.request(now, ReasonInterval)
		if c.state == StateTimed && c.reason == ReasonInterval {
			c.dirtySince = time.Time{}
		}
	}
}

func (c *Controller) nextDeadline() (time.Time, bool) {
	var next time.Time
	set := func(value time.Time) {
		if value.IsZero() {
			return
		}
		if next.IsZero() || value.Before(next) {
			next = value
		}
	}
	if c.state == StateTimed {
		set(c.visibleUntil)
	}
	for _, trigger := range c.scheduled {
		set(trigger.deadline)
	}
	if deadline, ok := c.dirtyDeadline(); ok {
		set(deadline)
	}
	return next, !next.IsZero()
}

func (c *Controller) dirtyDeadline() (time.Time, bool) {
	cfg := c.currentConfig()
	if c.dirtySince.IsZero() || cfg.Policy != config.LeaderboardVisibilityPolicyAutomatic || cfg.DirtyIntervalSeconds == 0 || c.override != overrideNone {
		return time.Time{}, false
	}
	deadline := c.dirtySince.Add(time.Duration(cfg.DirtyIntervalSeconds) * time.Second)
	if c.cooldownUntil.After(deadline) {
		deadline = c.cooldownUntil
	}
	return deadline, true
}

func (c *Controller) snapshot() Snapshot {
	result := Snapshot{
		State:   c.state,
		Policy:  c.currentConfig().Policy,
		Visible: c.state != StateHidden,
		Reason:  c.reason,
	}
	if c.state == StateTimed {
		deadline := c.visibleUntil
		result.VisibleUntil = &deadline
	}
	return result
}

func (c *Controller) emit() {
	snapshot := c.snapshot()
	c.current.Store(snapshot)
	if c.publish != nil {
		c.publish(snapshot)
	}
}

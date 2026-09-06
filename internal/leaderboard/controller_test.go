package leaderboard

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

type fakeConfigProvider struct {
	mu  sync.RWMutex
	cfg config.Config
}

func (p *fakeConfigProvider) Snapshot() config.Config {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.cfg
}

func (p *fakeConfigProvider) update(update func(*config.Config)) {
	p.mu.Lock()
	defer p.mu.Unlock()
	update(&p.cfg)
}

type fakeClock struct {
	mu     sync.Mutex
	now    time.Time
	timers []*fakeTimer
}

type fakeTimer struct {
	clock  *fakeClock
	ch     chan time.Time
	due    time.Time
	active bool
}

func newFakeClock() *fakeClock {
	return &fakeClock{now: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) NewTimer(duration time.Duration) timer {
	c.mu.Lock()
	defer c.mu.Unlock()
	t := &fakeTimer{clock: c, ch: make(chan time.Time, 1), due: c.now.Add(duration), active: true}
	c.timers = append(c.timers, t)
	return t
}

func (c *fakeClock) Advance(duration time.Duration) {
	c.mu.Lock()
	c.now = c.now.Add(duration)
	now := c.now
	for _, timer := range c.timers {
		if timer.active && !timer.due.After(now) {
			timer.active = false
			select {
			case timer.ch <- now:
			default:
			}
		}
	}
	c.mu.Unlock()
}

func (t *fakeTimer) C() <-chan time.Time { return t.ch }

func (t *fakeTimer) Reset(duration time.Duration) {
	t.clock.mu.Lock()
	defer t.clock.mu.Unlock()
	t.due = t.clock.now.Add(duration)
	t.active = true
}

func (t *fakeTimer) Stop() {
	t.clock.mu.Lock()
	defer t.clock.mu.Unlock()
	t.active = false
}

func startController(t *testing.T, policy string, configure func(*config.LeaderboardVisibilityConfig)) (*Controller, *fakeClock, *fakeConfigProvider, context.CancelFunc) {
	t.Helper()
	cfg := *config.Default()
	cfg.LeaderboardVisibility.Policy = policy
	if configure != nil {
		configure(&cfg.LeaderboardVisibility)
	}
	provider := &fakeConfigProvider{cfg: cfg}
	clock := newFakeClock()
	controller, err := NewController(provider, nil, withClock(clock))
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- controller.Run(ctx) }()
	require.Eventually(t, controller.running.Load, time.Second, time.Millisecond)
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-done)
	})
	return controller, clock, provider, cancel
}

func snapshot(t *testing.T, controller *Controller) Snapshot {
	t.Helper()
	value, err := controller.Snapshot(context.Background())
	require.NoError(t, err)
	return value
}

func TestController_WhenStartingPolicies_ExpectConfiguredBaseline(t *testing.T) {
	tests := []struct {
		policy string
		state  State
	}{
		{policy: config.LeaderboardVisibilityPolicyAlways, state: StatePinned},
		{policy: config.LeaderboardVisibilityPolicyAutomatic, state: StateHidden},
		{policy: config.LeaderboardVisibilityPolicyOnRequest, state: StateHidden},
	}
	for _, test := range tests {
		t.Run(test.policy, func(t *testing.T) {
			controller, _, _, _ := startController(t, test.policy, nil)
			got := snapshot(t, controller)
			require.Equal(t, test.state, got.State)
			require.Equal(t, ReasonStartup, got.Reason)
			require.Equal(t, test.state != StateHidden, got.Visible)
		})
	}
}

func TestController_WhenTimedTriggerExtends_ExpectNewestAbsoluteDeadline(t *testing.T) {
	controller, clock, _, _ := startController(t, config.LeaderboardVisibilityPolicyAutomatic, func(cfg *config.LeaderboardVisibilityConfig) {
		cfg.CooldownSeconds = 300
	})

	require.True(t, controller.SubmitTrigger(ReasonRankChange))
	first := snapshot(t, controller)
	require.Equal(t, StateTimed, first.State)
	require.Equal(t, clock.Now().Add(15*time.Second), *first.VisibleUntil)

	clock.Advance(10 * time.Second)
	require.True(t, controller.SubmitTrigger(ReasonRankChange))
	extended := snapshot(t, controller)
	require.Equal(t, clock.Now().Add(15*time.Second), *extended.VisibleUntil)
}

func TestController_WhenDirtyDuringCooldown_ExpectIntervalFallback(t *testing.T) {
	controller, clock, _, _ := startController(t, config.LeaderboardVisibilityPolicyAutomatic, func(cfg *config.LeaderboardVisibilityConfig) {
		cfg.DisplaySeconds = 5
		cfg.CooldownSeconds = 10
		cfg.DirtyIntervalSeconds = 60
	})

	require.True(t, controller.SubmitTrigger(ReasonRankChange))
	require.Equal(t, StateTimed, snapshot(t, controller).State)
	clock.Advance(5 * time.Second)
	require.Equal(t, StateHidden, snapshot(t, controller).State)
	require.True(t, controller.SubmitTrigger(ReasonRankChange))
	require.Equal(t, StateHidden, snapshot(t, controller).State)

	clock.Advance(59 * time.Second)
	require.Equal(t, StateHidden, snapshot(t, controller).State)
	clock.Advance(time.Second)
	got := snapshot(t, controller)
	require.Equal(t, StateTimed, got.State)
	require.Equal(t, ReasonInterval, got.Reason)
}

func TestController_WhenPinned_ExpectTriggersIgnoredUntilResume(t *testing.T) {
	controller, _, _, _ := startController(t, config.LeaderboardVisibilityPolicyAutomatic, nil)

	pinned, err := controller.Pin(context.Background())
	require.NoError(t, err)
	require.Equal(t, StatePinned, pinned.State)
	require.True(t, controller.SubmitTrigger(ReasonRankChange))
	require.Equal(t, StatePinned, snapshot(t, controller).State)

	resumed, err := controller.Resume(context.Background())
	require.NoError(t, err)
	require.Equal(t, StateHidden, resumed.State)
	require.Equal(t, ReasonPolicy, resumed.Reason)
}

func TestController_WhenAlwaysManuallyHiddenThenResumed_ExpectVisiblePolicyState(t *testing.T) {
	controller, _, _, _ := startController(t, config.LeaderboardVisibilityPolicyAlways, nil)

	hidden, err := controller.Hide(context.Background())
	require.NoError(t, err)
	require.Equal(t, StateHidden, hidden.State)
	resumed, err := controller.Resume(context.Background())
	require.NoError(t, err)
	require.Equal(t, StatePinned, resumed.State)
	require.Equal(t, ReasonPolicy, resumed.Reason)
}

func TestController_WhenClockAdvancesPastDeadline_ExpectHidden(t *testing.T) {
	controller, clock, _, _ := startController(t, config.LeaderboardVisibilityPolicyOnRequest, nil)

	shown, err := controller.Show(context.Background(), 5*time.Second)
	require.NoError(t, err)
	require.Equal(t, StateTimed, shown.State)
	clock.Advance(time.Hour)
	require.Equal(t, StateHidden, snapshot(t, controller).State)
}

func TestController_WhenAwardScheduled_ExpectRequestAfterDelay(t *testing.T) {
	controller, clock, _, _ := startController(t, config.LeaderboardVisibilityPolicyAutomatic, nil)

	require.True(t, controller.ScheduleAward(5*time.Second))
	require.Equal(t, StateHidden, snapshot(t, controller).State)
	clock.Advance(4 * time.Second)
	require.Equal(t, StateHidden, snapshot(t, controller).State)
	clock.Advance(time.Second)
	got := snapshot(t, controller)
	require.Equal(t, StateTimed, got.State)
	require.Equal(t, ReasonAward, got.Reason)
}

func TestController_WhenPolicyChangesWithoutOverride_ExpectImmediateReevaluation(t *testing.T) {
	controller, _, provider, _ := startController(t, config.LeaderboardVisibilityPolicyAutomatic, nil)
	provider.update(func(cfg *config.Config) {
		cfg.LeaderboardVisibility.Policy = config.LeaderboardVisibilityPolicyAlways
	})

	got, err := controller.PolicyChanged(context.Background())
	require.NoError(t, err)
	require.Equal(t, StatePinned, got.State)
	require.Equal(t, config.LeaderboardVisibilityPolicyAlways, got.Policy)
}

func TestController_WhenCanceled_ExpectPromptStopAndUnavailableCalls(t *testing.T) {
	controller, _, _, cancel := startController(t, config.LeaderboardVisibilityPolicyAutomatic, nil)
	require.True(t, controller.ScheduleAward(time.Hour))
	cancel()
	require.Eventually(t, func() bool { return !controller.running.Load() }, time.Second, time.Millisecond)

	_, err := controller.Snapshot(context.Background())
	require.ErrorIs(t, err, ErrUnavailable)
}

func TestController_WhenCommandRequestedDuringCooldown_ExpectTimedDisplay(t *testing.T) {
	controller, _, _, _ := startController(t, config.LeaderboardVisibilityPolicyOnRequest, nil)
	_, err := controller.Hide(context.Background())
	require.NoError(t, err)
	_, err = controller.Resume(context.Background())
	require.NoError(t, err)

	got, err := controller.Request(context.Background(), ReasonCommand)
	require.NoError(t, err)
	require.Equal(t, StateTimed, got.State)
	require.Equal(t, ReasonCommand, got.Reason)
}

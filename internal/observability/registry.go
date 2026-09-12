package observability

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"

	"github.com/muonsoft/clog"
)

const warnEveryNth = 100

// Default is the process-wide observability registry for diagnostics and logs.
var Default = NewRegistry()

// Snapshot is a point-in-time view of pipeline counters exposed via diagnostics.
type Snapshot struct {
	BusDrops              map[string]uint64 `json:"bus_drops"`
	WebSocketDrops        map[string]uint64 `json:"websocket_drops"`
	CommandsFired         uint64            `json:"commands_fired"`
	CommandsSuppressed    map[string]uint64 `json:"commands_suppressed"`
	AwardsGranted         uint64            `json:"awards_granted"`
	GreetingsFired        map[string]uint64 `json:"greetings_fired"`
	GreetingsSuppressed   map[string]uint64 `json:"greetings_suppressed"`
	ProgressionEvaluated  map[string]uint64 `json:"progression_evaluated"`
	ProgressionUnlocks    map[string]uint64 `json:"progression_unlocks"`
	ProgressionSuppressed map[string]uint64 `json:"progression_suppressed"`
	ProgressionPublished  uint64            `json:"progression_published"`
}

// Registry tracks delivery and product-event counters.
type Registry struct {
	mu sync.Mutex

	busDrops           map[string]uint64
	busDropLogCounts   map[string]uint64
	wsDrops            map[string]uint64
	wsDropLogCounts    map[string]uint64
	commandsSuppressed map[string]uint64
	suppressLogCounts  map[string]uint64

	commandsFired         atomic.Uint64
	awardsGranted         atomic.Uint64
	greetingsFired        map[string]uint64
	greetingsSuppressed   map[string]uint64
	progressionEvaluated  map[string]uint64
	progressionUnlocks    map[string]uint64
	progressionSuppressed map[string]uint64
	progressionPublished  atomic.Uint64
}

// NewRegistry creates an empty observability registry.
func NewRegistry() *Registry {
	return &Registry{
		busDrops:              make(map[string]uint64),
		busDropLogCounts:      make(map[string]uint64),
		wsDrops:               make(map[string]uint64),
		wsDropLogCounts:       make(map[string]uint64),
		commandsSuppressed:    make(map[string]uint64),
		greetingsFired:        make(map[string]uint64),
		greetingsSuppressed:   make(map[string]uint64),
		progressionEvaluated:  make(map[string]uint64),
		progressionUnlocks:    make(map[string]uint64),
		progressionSuppressed: make(map[string]uint64),
		suppressLogCounts:     make(map[string]uint64),
	}
}

// RecordProgressionEvaluation records a bounded fact type and committed unlock count.
func (r *Registry) RecordProgressionEvaluation(cause string, unlocks int, backfilled bool) {
	if r == nil {
		return
	}
	if cause == "" {
		cause = "unknown"
	}
	lane := "live"
	if backfilled {
		lane = "backfilled"
	}
	r.mu.Lock()
	r.progressionEvaluated[cause]++
	if unlocks > 0 {
		r.progressionUnlocks[lane] += uint64(unlocks)
	}
	r.mu.Unlock()
}

// RecordProgressionSuppressed records only a bounded gate reason, never a rule title or user text.
func (r *Registry) RecordProgressionSuppressed(reason string) {
	if r == nil {
		return
	}
	if reason == "" {
		reason = "unknown"
	}
	r.mu.Lock()
	r.progressionSuppressed[reason]++
	r.mu.Unlock()
}

// RecordProgressionPublished records a successfully queued aggregate frame.
func (r *Registry) RecordProgressionPublished() {
	if r != nil {
		r.progressionPublished.Add(1)
	}
}

// RecordGreetingFired increments the greeting kind counter.
func (r *Registry) RecordGreetingFired(kind string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.greetingsFired[kind]++
}

// RecordGreetingSuppressed increments a bounded suppression-reason counter.
func (r *Registry) RecordGreetingSuppressed(reason string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.greetingsSuppressed[reason]++
}

// RecordBusDrop increments the subscriber drop counter and emits a rate-limited warn log.
func (r *Registry) RecordBusDrop(subscriber, eventType string) {
	if r == nil {
		return
	}
	if subscriber == "" {
		subscriber = "unknown"
	}
	if eventType == "" {
		eventType = "unknown"
	}

	r.mu.Lock()
	r.busDrops[subscriber]++
	total := r.busDrops[subscriber]
	logCount := r.busDropLogCounts[subscriber]
	r.busDropLogCounts[subscriber]++
	r.mu.Unlock()

	if logCount == 0 || logCount%warnEveryNth == 0 {
		clog.Warn(context.Background(), "bus event dropped",
			slog.String("subscriber", subscriber),
			slog.String("event_type", eventType),
			slog.Uint64("total_drops", total),
		)
	}
}

// RecordWebSocketDrop increments the frame-type drop counter and emits a rate-limited warn log.
func (r *Registry) RecordWebSocketDrop(frameType string) {
	if r == nil {
		return
	}
	if frameType == "" {
		frameType = "other"
	}

	r.mu.Lock()
	r.wsDrops[frameType]++
	total := r.wsDrops[frameType]
	logCount := r.wsDropLogCounts[frameType]
	r.wsDropLogCounts[frameType]++
	r.mu.Unlock()

	if logCount == 0 || logCount%warnEveryNth == 0 {
		clog.Warn(context.Background(), "websocket frame dropped",
			slog.String("frame_type", frameType),
			slog.Uint64("total_drops", total),
		)
	}
}

// RecordCommandSuppressed increments a suppression reason counter.
func (r *Registry) RecordCommandSuppressed(reason string) {
	if r == nil {
		return
	}
	if reason == "" {
		reason = "unknown"
	}

	r.mu.Lock()
	r.commandsSuppressed[reason]++
	total := r.commandsSuppressed[reason]
	logCount := r.suppressLogCounts[reason]
	r.suppressLogCounts[reason]++
	r.mu.Unlock()

	if reason == "cooldown" {
		if logCount == 0 || logCount%warnEveryNth == 0 {
			clog.Debug(context.Background(), "command suppressed",
				slog.String("reason", reason),
				slog.Uint64("total_suppressed", total),
			)
		}
		return
	}

	if logCount == 0 || logCount%warnEveryNth == 0 {
		clog.Warn(context.Background(), "command suppressed",
			slog.String("reason", reason),
			slog.Uint64("total_suppressed", total),
		)
	}
}

// RecordCommandFired increments the successful command counter.
func (r *Registry) RecordCommandFired() {
	if r == nil {
		return
	}
	r.commandsFired.Add(1)
}

// RecordAwardGranted increments the successful award grant counter.
func (r *Registry) RecordAwardGranted() {
	if r == nil {
		return
	}
	r.awardsGranted.Add(1)
}

// Snapshot returns a copy of current counters for diagnostics.
func (r *Registry) Snapshot() Snapshot {
	if r == nil {
		return Snapshot{
			BusDrops:              map[string]uint64{},
			WebSocketDrops:        map[string]uint64{},
			CommandsSuppressed:    map[string]uint64{},
			GreetingsFired:        map[string]uint64{},
			GreetingsSuppressed:   map[string]uint64{},
			ProgressionEvaluated:  map[string]uint64{},
			ProgressionUnlocks:    map[string]uint64{},
			ProgressionSuppressed: map[string]uint64{},
		}
	}

	r.mu.Lock()
	busDrops := copyUint64Map(r.busDrops)
	wsDrops := copyUint64Map(r.wsDrops)
	suppressed := copyUint64Map(r.commandsSuppressed)
	greetingsFired := copyUint64Map(r.greetingsFired)
	greetingsSuppressed := copyUint64Map(r.greetingsSuppressed)
	progressionEvaluated := copyUint64Map(r.progressionEvaluated)
	progressionUnlocks := copyUint64Map(r.progressionUnlocks)
	progressionSuppressed := copyUint64Map(r.progressionSuppressed)
	r.mu.Unlock()

	return Snapshot{
		BusDrops:              busDrops,
		WebSocketDrops:        wsDrops,
		CommandsFired:         r.commandsFired.Load(),
		CommandsSuppressed:    suppressed,
		AwardsGranted:         r.awardsGranted.Load(),
		GreetingsFired:        greetingsFired,
		GreetingsSuppressed:   greetingsSuppressed,
		ProgressionEvaluated:  progressionEvaluated,
		ProgressionUnlocks:    progressionUnlocks,
		ProgressionSuppressed: progressionSuppressed,
		ProgressionPublished:  r.progressionPublished.Load(),
	}
}

func copyUint64Map(src map[string]uint64) map[string]uint64 {
	if len(src) == 0 {
		return map[string]uint64{}
	}
	dst := make(map[string]uint64, len(src))
	for key, value := range src {
		dst[key] = value
	}
	return dst
}

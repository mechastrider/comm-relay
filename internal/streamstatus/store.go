package streamstatus

import (
	"sync"
	"time"
)

const (
	defaultHistoryRetention = 45 * time.Minute
	defaultSampleStep       = 30 * time.Second
	defaultMaxSamples       = 90
)

// StoreOptions configures an in-memory stream status store.
type StoreOptions struct {
	Now              func() time.Time
	HistoryRetention time.Duration
	SampleStep       time.Duration
}

// Store holds current stream snapshots and bounded per-platform history.
type Store struct {
	mu         sync.RWMutex
	now        func() time.Time
	retention  time.Duration
	step       time.Duration
	maxSamples int
	current    map[string]Snapshot
	history    map[string][]Sample
}

// NewStore creates an empty stream status store.
func NewStore(opts StoreOptions) *Store {
	now := opts.Now
	if now == nil {
		now = time.Now
	}

	retention := opts.HistoryRetention
	if retention <= 0 {
		retention = defaultHistoryRetention
	}

	step := opts.SampleStep
	if step <= 0 {
		step = defaultSampleStep
	}

	maxSamples := int(retention / step)
	if maxSamples <= 0 {
		maxSamples = defaultMaxSamples
	}

	return &Store{
		now:        now,
		retention:  retention,
		step:       step,
		maxSamples: maxSamples,
		current:    make(map[string]Snapshot),
		history:    make(map[string][]Sample),
	}
}

// Record upserts the current snapshot and appends a bounded history sample.
func (s *Store) Record(snap Snapshot) {
	snap = copySnapshot(snap)
	platform := snap.Platform
	if platform == "" {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if snap.Viewers.Current != nil {
		if existing, ok := s.current[platform]; ok {
			if existing.Viewers.PeakSession != nil {
				if *snap.Viewers.Current > *existing.Viewers.PeakSession {
					peak := *snap.Viewers.Current
					snap.Viewers.PeakSession = intPtr(peak)
				} else {
					snap.Viewers.PeakSession = copyIntPtr(existing.Viewers.PeakSession)
				}
			} else {
				peak := *snap.Viewers.Current
				snap.Viewers.PeakSession = intPtr(peak)
			}
		} else if snap.Viewers.PeakSession == nil {
			peak := *snap.Viewers.Current
			snap.Viewers.PeakSession = intPtr(peak)
		}
	}

	s.current[platform] = snap

	sample := Sample{
		SampledAt: snap.SampledAt,
		Viewers:   copyIntPtr(snap.Viewers.Current),
		State:     string(snap.State),
	}
	hist := append(s.history[platform], sample)
	hist = trimHistory(hist, s.now(), s.retention, s.maxSamples)
	s.history[platform] = hist
}

// Get returns the stored snapshot for a platform.
func (s *Store) Get(platform string) (Snapshot, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	snap, ok := s.current[platform]
	if !ok {
		return Snapshot{}, false
	}
	return copySnapshot(snap), true
}

// History returns stored samples for a platform.
func (s *Store) History(platform string) []Sample {
	s.mu.RLock()
	defer s.mu.RUnlock()

	hist := s.history[platform]
	out := make([]Sample, len(hist))
	for i, sample := range hist {
		out[i] = Sample{
			SampledAt: sample.SampledAt,
			Viewers:   copyIntPtr(sample.Viewers),
			State:     sample.State,
		}
	}
	return out
}

func trimHistory(hist []Sample, now time.Time, retention time.Duration, maxSamples int) []Sample {
	cutoff := now.Add(-retention)
	start := 0
	for start < len(hist) && hist[start].SampledAt.Before(cutoff) {
		start++
	}
	if start > 0 {
		hist = hist[start:]
	}
	if len(hist) > maxSamples {
		hist = hist[len(hist)-maxSamples:]
	}
	return hist
}

func copySnapshot(snap Snapshot) Snapshot {
	out := snap
	out.Capabilities = append([]string(nil), snap.Capabilities...)
	out.StreamID = copyStringPtr(snap.StreamID)
	out.Title = copyStringPtr(snap.Title)
	out.Category = copyStringPtr(snap.Category)
	out.ScheduledAt = copyTimePtr(snap.ScheduledAt)
	out.StartedAt = copyTimePtr(snap.StartedAt)
	out.Viewers = Viewers{
		Current:     copyIntPtr(snap.Viewers.Current),
		PeakSession: copyIntPtr(snap.Viewers.PeakSession),
		Change5m:    copyIntPtr(snap.Viewers.Change5m),
	}
	out.Chat = ChatHealth{
		State:             snap.Chat.State,
		LastSuccessAt:     copyTimePtr(snap.Chat.LastSuccessAt),
		MessagesPerMinute: copyFloat64Ptr(snap.Chat.MessagesPerMinute),
	}
	out.Playback = Playback{
		Supported:         snap.Playback.Supported,
		State:             snap.Playback.State,
		ManifestAdvancing: copyBoolPtr(snap.Playback.ManifestAdvancing),
		LagSeconds:        copyFloat64Ptr(snap.Playback.LagSeconds),
		MaxResolution:     copyStringPtr(snap.Playback.MaxResolution),
		MaxFPS:            copyFloat64Ptr(snap.Playback.MaxFPS),
		CheckedAt:         copyTimePtr(snap.Playback.CheckedAt),
	}
	if len(snap.Ingest.Issues) > 0 {
		out.Ingest.Issues = append([]IngestIssue(nil), snap.Ingest.Issues...)
	} else {
		out.Ingest.Issues = []IngestIssue{}
	}
	out.Ingest = Ingest{
		Supported: snap.Ingest.Supported,
		State:     snap.Ingest.State,
		Issues:    out.Ingest.Issues,
		CheckedAt: copyTimePtr(snap.Ingest.CheckedAt),
	}
	out.Probe = Probe{
		Source:              snap.Probe.Source,
		LastSuccessAt:       copyTimePtr(snap.Probe.LastSuccessAt),
		ConsecutiveFailures: snap.Probe.ConsecutiveFailures,
		LastError:           copyStringPtr(snap.Probe.LastError),
	}
	return out
}

func copyStringPtr(v *string) *string {
	if v == nil {
		return nil
	}
	s := *v
	return &s
}

func copyIntPtr(v *int) *int {
	if v == nil {
		return nil
	}
	n := *v
	return &n
}

func intPtr(v int) *int {
	n := v
	return &n
}

func copyFloat64Ptr(v *float64) *float64 {
	if v == nil {
		return nil
	}
	n := *v
	return &n
}

func copyBoolPtr(v *bool) *bool {
	if v == nil {
		return nil
	}
	n := *v
	return &n
}

func copyTimePtr(v *time.Time) *time.Time {
	if v == nil {
		return nil
	}
	t := *v
	return &t
}

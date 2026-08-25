package streamstatus

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func TestStore_WhenRecordZeroViewers_ExpectZeroNotUnknown(t *testing.T) {
	t.Parallel()

	store := NewStore(StoreOptions{
		Now: func() time.Time {
			return time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC)
		},
	})

	now := time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC)
	zero := 0
	store.Record(Snapshot{
		Platform:  status.PlatformTwitch,
		State:     StateLive,
		SampledAt: now,
		Viewers:   Viewers{Current: &zero},
	})

	snap, ok := store.Get(status.PlatformTwitch)
	require.True(t, ok)
	require.NotNil(t, snap.Viewers.Current)
	require.Equal(t, 0, *snap.Viewers.Current)
}

func TestStore_WhenCallerMutatesAfterRecord_ExpectStoredCopyStable(t *testing.T) {
	t.Parallel()

	store := NewStore(StoreOptions{})
	now := time.Now().UTC()
	viewers := 42
	title := "before"
	snap := Snapshot{
		Platform:  status.PlatformTwitch,
		State:     StateLive,
		Title:     &title,
		SampledAt: now,
		Viewers:   Viewers{Current: &viewers},
	}

	store.Record(snap)

	viewers = 99
	title = "after"
	snap.State = StateOffline

	stored, ok := store.Get(status.PlatformTwitch)
	require.True(t, ok)
	require.Equal(t, StateLive, stored.State)
	require.Equal(t, 42, *stored.Viewers.Current)
	require.Equal(t, "before", *stored.Title)
}

func TestStore_WhenManyRecords_ExpectBoundedHistory(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC)
	store := NewStore(StoreOptions{
		Now: func() time.Time {
			return fixed
		},
		HistoryRetention: 45 * time.Minute,
		SampleStep:       30 * time.Second,
	})

	for i := 0; i < 120; i++ {
		viewers := i
		store.Record(Snapshot{
			Platform:  status.PlatformTwitch,
			State:     StateLive,
			SampledAt: fixed.Add(time.Duration(i) * time.Second),
			Viewers:   Viewers{Current: &viewers},
		})
	}

	hist := store.History(status.PlatformTwitch)
	require.LessOrEqual(t, len(hist), 90)
	require.GreaterOrEqual(t, len(hist), 1)
}

func TestStore_WhenViewersIncrease_ExpectPeakSessionUpdated(t *testing.T) {
	t.Parallel()

	store := NewStore(StoreOptions{})
	now := time.Now().UTC()
	first := 10
	second := 25
	third := 15

	store.Record(Snapshot{
		Platform:  status.PlatformTwitch,
		State:     StateLive,
		SampledAt: now,
		Viewers:   Viewers{Current: &first},
	})
	store.Record(Snapshot{
		Platform:  status.PlatformTwitch,
		State:     StateLive,
		SampledAt: now.Add(time.Minute),
		Viewers:   Viewers{Current: &second},
	})
	store.Record(Snapshot{
		Platform:  status.PlatformTwitch,
		State:     StateLive,
		SampledAt: now.Add(2 * time.Minute),
		Viewers:   Viewers{Current: &third},
	})

	snap, ok := store.Get(status.PlatformTwitch)
	require.True(t, ok)
	require.NotNil(t, snap.Viewers.PeakSession)
	require.Equal(t, 25, *snap.Viewers.PeakSession)
}

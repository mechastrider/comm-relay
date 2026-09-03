package api

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	wireLeaderboardType  = "leaderboard"
	leaderboardWireLimit = 20
	leaderboardDebounce  = 150 * time.Millisecond
)

type wireLeaderboardEntry struct {
	Rank         int    `json:"rank"`
	DisplayName  string `json:"display_name"`
	AvatarURL    string `json:"avatar_url,omitempty"`
	XP           int    `json:"xp"`
	MessageCount int    `json:"message_count"`
}

type wireLeaderboard struct {
	Type    string                 `json:"type"`
	Period  string                 `json:"period"`
	Entries []wireLeaderboardEntry `json:"entries"`
}

func leaderboardWirePayload(period string, entries []store.LeaderboardEntry) ([]byte, error) {
	wireEntries := make([]wireLeaderboardEntry, 0, len(entries))
	for _, entry := range entries {
		wireEntries = append(wireEntries, wireLeaderboardEntry{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			AvatarURL:    entry.AvatarURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
		})
	}

	data, err := json.Marshal(wireLeaderboard{
		Type:    wireLeaderboardType,
		Period:  period,
		Entries: wireEntries,
	})
	if err != nil {
		return nil, errors.Errorf("marshal leaderboard wire event: %w", err)
	}

	return data, nil
}

// LeaderboardPublisher coalesces leaderboard WebSocket snapshots.
type LeaderboardPublisher struct {
	mu          sync.Mutex
	inflight    sync.WaitGroup
	stopped     bool
	hub         *Hub
	viewerStore *store.Store
	cfgStore    *config.Store
	timer       *time.Timer
}

func newLeaderboardPublisher(hub *Hub, viewerStore *store.Store, cfgStore *config.Store) *LeaderboardPublisher {
	return &LeaderboardPublisher{
		hub:         hub,
		viewerStore: viewerStore,
		cfgStore:    cfgStore,
	}
}

// NewLeaderboardPublisher creates a coalesced leaderboard WebSocket publisher.
func NewLeaderboardPublisher(hub *Hub, viewerStore *store.Store, cfgStore *config.Store) *LeaderboardPublisher {
	return newLeaderboardPublisher(hub, viewerStore, cfgStore)
}

// NewViewerIngest creates the chat-to-viewer-store ingest worker.
func NewViewerIngest(
	viewerStore *store.Store,
	cfgStore *config.Store,
	publisher *LeaderboardPublisher,
	matcher *command.Matcher,
	hub *Hub,
) *ViewerIngest {
	return newViewerIngest(viewerStore, cfgStore, publisher, matcher, hub)
}

// Schedule debounces leaderboard broadcasts.
func (p *LeaderboardPublisher) Schedule() {
	if p == nil || p.hub == nil || p.viewerStore == nil || p.cfgStore == nil {
		return
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	if p.stopped {
		return
	}

	if p.timer != nil {
		p.timer.Stop()
	}

	p.timer = time.AfterFunc(leaderboardDebounce, p.flush)
}

// FlushNow publishes session, day, and all leaderboard snapshots immediately.
func (p *LeaderboardPublisher) FlushNow() {
	if p == nil {
		return
	}

	p.mu.Lock()
	if p.stopped {
		p.mu.Unlock()
		return
	}
	if p.timer != nil {
		p.timer.Stop()
		p.timer = nil
	}
	p.mu.Unlock()

	p.flush()
}

// Stop cancels pending debounced broadcasts and waits for in-flight flushes.
func (p *LeaderboardPublisher) Stop() {
	if p == nil {
		return
	}

	p.mu.Lock()
	p.stopped = true
	if p.timer != nil {
		p.timer.Stop()
		p.timer = nil
	}
	p.mu.Unlock()

	p.inflight.Wait()
}

func (p *LeaderboardPublisher) flush() {
	p.mu.Lock()
	if p.stopped {
		p.mu.Unlock()
		return
	}
	p.inflight.Add(1)
	p.mu.Unlock()
	defer p.inflight.Done()

	cfg := p.cfgStore.Snapshot()
	now := time.Now()
	ctx := context.Background()

	for _, period := range []string{"session", "day", "all"} {
		entries, err := p.viewerStore.Leaderboard(period, leaderboardWireLimit, cfg.DayResetHour, now)
		if err != nil {
			clog.Errorf(ctx, "leaderboard snapshot %s: %w", period, err)
			continue
		}

		payload, err := leaderboardWirePayload(period, entries)
		if err != nil {
			clog.Errorf(ctx, "leaderboard wire payload %s: %w", period, err)
			continue
		}

		p.hub.Broadcast(payload)
	}
}

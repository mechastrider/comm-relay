package ytemoji

import (
	"context"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/emote"
)

const refreshInterval = 6 * time.Hour

// Refresher keeps the global YouTube emoji catalog warm.
type Refresher struct {
	catalog *Catalog
	client  emote.HTTPDoer
	now     func() time.Time
}

// NewRefresher creates a YouTube emoji catalog refresher.
func NewRefresher(catalog *Catalog, client emote.HTTPDoer) *Refresher {
	return &Refresher{
		catalog: catalog,
		client:  client,
		now:     time.Now,
	}
}

// Run periodically refreshes the global catalog until ctx is cancelled.
func (r *Refresher) Run(ctx context.Context) {
	if r == nil || r.catalog == nil || r.client == nil {
		return
	}

	r.refreshIfNeeded(ctx)

	ticker := time.NewTicker(refreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.refreshIfNeeded(ctx)
		}
	}
}

// EnsureGlobalLoaded fetches the global catalog when it is missing or stale.
func (r *Refresher) EnsureGlobalLoaded(ctx context.Context) {
	if r == nil {
		return
	}
	r.refreshIfNeeded(ctx)
}

func (r *Refresher) refreshIfNeeded(ctx context.Context) {
	now := r.now().UTC()
	if !r.catalog.NeedsGlobalRefresh(now) {
		return
	}

	entries, err := FetchGlobal(ctx, r.client)
	if err != nil {
		clog.Debug(ctx, "youtube emoji global refresh failed", slog.Any("error", err))
		return
	}

	r.catalog.ReplaceGlobal(entries)
	clog.Info(ctx, "youtube emoji global catalog refreshed", slog.Int("shortcuts", len(entries)))
}

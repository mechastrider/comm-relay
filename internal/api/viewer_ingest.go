package api

import (
	"context"
	"strings"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// ViewerIngest applies chat messages to the viewer store and schedules leaderboard updates.
type ViewerIngest struct {
	viewerStore *store.Store
	cfgStore    *config.Store
	publisher   *LeaderboardPublisher
}

func newViewerIngest(viewerStore *store.Store, cfgStore *config.Store, publisher *LeaderboardPublisher) *ViewerIngest {
	return &ViewerIngest{
		viewerStore: viewerStore,
		cfgStore:    cfgStore,
		publisher:   publisher,
	}
}

// Run subscribes to chat events until the context is cancelled.
func (v *ViewerIngest) Run(ctx context.Context, b *bus.Bus) {
	if v == nil || v.viewerStore == nil || v.cfgStore == nil {
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
			v.handleMessage(ctx, ev.Message)
		}
	}
}

func (v *ViewerIngest) handleMessage(ctx context.Context, msg bus.ChatMessage) {
	if strings.TrimSpace(msg.Platform) == "" || strings.TrimSpace(msg.UserID) == "" {
		return
	}

	cfg := v.cfgStore.Snapshot()
	now := msg.Timestamp
	if now.IsZero() {
		now = time.Now()
	}

	err := v.viewerStore.ApplyChat(store.ChatIdentity{
		Platform:    msg.Platform,
		UserID:      msg.UserID,
		Username:    msg.Username,
		DisplayName: msg.DisplayName,
		AvatarURL:   msg.AvatarURL,
	}, cfg.PointsPerMessage, cfg.DayResetHour, now)
	if err != nil {
		clog.Errorf(ctx, "apply chat to viewer store: %w", err)
		return
	}

	if v.publisher != nil {
		v.publisher.Schedule()
	}
}

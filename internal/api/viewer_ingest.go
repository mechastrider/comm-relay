package api

import (
	"context"
	"strings"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// ViewerIngest applies chat messages to the viewer store and schedules leaderboard updates.
type ViewerIngest struct {
	viewerStore *store.Store
	cfgStore    *config.Store
	publisher   *LeaderboardPublisher
	matcher     *command.Matcher
	hub         *Hub
}

func newViewerIngest(
	viewerStore *store.Store,
	cfgStore *config.Store,
	publisher *LeaderboardPublisher,
	matcher *command.Matcher,
	hub *Hub,
) *ViewerIngest {
	return &ViewerIngest{
		viewerStore: viewerStore,
		cfgStore:    cfgStore,
		publisher:   publisher,
		matcher:     matcher,
		hub:         hub,
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
	points := cfg.PointsPerMessage
	var matchedCmd *store.Command
	if v.matcher != nil {
		if cmd, ok := v.matcher.Lookup(msg.Message); ok {
			matchedCmd = cmd
			points = 0
		}
	}

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
	}, points, cfg.DayResetHour, now)
	if err != nil {
		clog.Errorf(ctx, "apply chat to viewer store: %w", err)
		return
	}

	if v.publisher != nil {
		v.publisher.Schedule()
	}

	if matchedCmd == nil || v.matcher == nil {
		return
	}

	if !v.matcher.TryFire(msg.Platform, msg.UserID, matchedCmd) {
		return
	}

	viewerID, ok := v.viewerStore.ViewerIDForIdentity(msg.Platform, msg.UserID)
	if !ok {
		clog.Errorf(ctx, "viewer id for command event: identity not found after apply chat")
		return
	}

	event := store.AppendInteractionEventInput{
		Kind:           store.InteractionEventCommand,
		ViewerID:       viewerID,
		CommandTrigger: matchedCmd.Trigger,
		Points:         0,
	}
	if err := v.viewerStore.AppendInteractionEvent(event); err != nil {
		clog.Errorf(ctx, "append command interaction event: %w", err)
	}

	if v.hub != nil {
		name := command.DisplayName(msg.Username, msg.DisplayName)
		text := command.SubstituteTemplate(matchedCmd.SplashTemplate, name, 0)
		alertPayload, alertErr := alertWirePayload(matchedCmd, msg, text, 0)
		if alertErr != nil {
			clog.Errorf(ctx, "alert wire payload: %w", alertErr)
			return
		}
		v.hub.Broadcast(alertPayload)
	}
}

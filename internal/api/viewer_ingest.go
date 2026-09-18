package api

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/leaderboard"
	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/store"
)

// ViewerIngest applies chat messages to the viewer store and schedules leaderboard updates.
type ViewerIngest struct {
	viewerStore  *store.Store
	cfgStore     *config.Store
	publisher    *LeaderboardPublisher
	matcher      *command.Matcher
	hub          *Hub
	avatarWorker AvatarCacheEnqueuer
	visibility   *leaderboard.Controller
}

// AvatarCacheEnqueuer schedules asynchronous portrait cache fetches.
type AvatarCacheEnqueuer interface {
	Enqueue(platform, userID string)
	DeleteOrphanedCache(filename string)
}

func newViewerIngest(
	viewerStore *store.Store,
	cfgStore *config.Store,
	publisher *LeaderboardPublisher,
	matcher *command.Matcher,
	hub *Hub,
	avatarWorker AvatarCacheEnqueuer,
	visibility *leaderboard.Controller,
) *ViewerIngest {
	return &ViewerIngest{
		viewerStore:  viewerStore,
		cfgStore:     cfgStore,
		publisher:    publisher,
		matcher:      matcher,
		hub:          hub,
		avatarWorker: avatarWorker,
		visibility:   visibility,
	}
}

// Run subscribes to chat events until the context is cancelled.
func (v *ViewerIngest) Run(ctx context.Context, b *bus.Bus) {
	if v == nil || v.viewerStore == nil || v.cfgStore == nil {
		return
	}

	events, unsub := b.Subscribe("viewer-ingest")
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
	var matchedCmd *store.Command
	if v.matcher != nil {
		match, parsed := v.matcher.LookupMatch(msg.Message)
		if parsed && match.AmbiguousTypo {
			clog.Debug(ctx, "command match skipped: ambiguous typo",
				slog.String("token", match.Token),
			)
		}
		if match.Command != nil {
			matchedCmd = match.Command
			clog.Debug(ctx, "command matched",
				slog.String("match", match.Kind),
				slog.String("trigger", matchedCmd.Trigger),
			)
		}
	}

	if strings.TrimSpace(msg.Platform) == "" || strings.TrimSpace(msg.UserID) == "" {
		if matchedCmd != nil {
			observability.Default.RecordCommandSuppressed("empty_identity")
			clog.Warn(ctx, "command skipped: empty identity",
				slog.String("trigger", matchedCmd.Trigger),
				slog.String("platform", strings.TrimSpace(msg.Platform)),
				slog.String("message_id", strings.TrimSpace(msg.ID)),
			)
		}
		return
	}

	cfg := v.cfgStore.Snapshot()
	activity := store.ActivitySettings{
		IntervalSeconds: cfg.ActivityIntervalSeconds,
		SessionLimit:    cfg.ActivitySessionLimit,
		XP:              cfg.ActivityXP,
	}

	now := msg.Timestamp
	if now.IsZero() {
		now = time.Now()
	}

	result, err := v.viewerStore.ApplyClassifiedChatMutationResult(store.ChatIdentity{
		Platform:    msg.Platform,
		UserID:      msg.UserID,
		Username:    msg.Username,
		DisplayName: msg.DisplayName,
		AvatarURL:   msg.AvatarURL,
	}, activity, cfg.DayResetHour, now, matchedCmd == nil)
	if err != nil {
		clog.Errorf(ctx, "apply chat to viewer store: %w", err)
		return
	}
	chatViewerID, _ := v.viewerStore.ViewerIDForIdentity(msg.Platform, msg.UserID)

	if v.avatarWorker != nil {
		if result.ReplacedAvatarCache != "" {
			v.avatarWorker.DeleteOrphanedCache(result.ReplacedAvatarCache)
		}
		v.avatarWorker.Enqueue(msg.Platform, msg.UserID)
	}

	if v.publisher != nil {
		v.publisher.Schedule()
	}
	if result.XPChanged && v.visibility != nil {
		if result.MeaningfulRankChange {
			v.visibility.SubmitTrigger(leaderboard.ReasonRankChange)
		} else {
			v.visibility.MarkDirty()
		}
	}

	if result.GreetingKind != "" {
		if result.GreetingSuppressed != "" {
			observability.Default.RecordGreetingSuppressed(result.GreetingSuppressed)
			clog.Debug(ctx, "greeting suppressed",
				slog.String("greeting_kind", string(result.GreetingKind)),
				slog.String("platform", msg.Platform),
				slog.String("user_id", msg.UserID),
				slog.String("reason", result.GreetingSuppressed),
			)
		} else if v.hub != nil {
			greeting, greetingErr := v.viewerStore.GetGreeting(result.GreetingKind)
			if greetingErr != nil {
				clog.Errorf(ctx, "load greeting definition: %w", greetingErr)
			} else {
				name := command.DisplayName(msg.Username, msg.DisplayName)
				text := command.SubstituteTemplate(greeting.SplashTemplate, command.TemplateVars{Viewer: name, Streamer: cfg.StreamerDisplayName, Message: msg.Message})
				alertMsg := fillChatMessageAvatar(v.viewerStore, v.cfgStore, msg)
				payload, payloadErr := greetingAlertWirePayload(*greeting, name, alertMsg.AvatarURL, text, now)
				if payloadErr != nil {
					clog.Errorf(ctx, "greeting wire payload: %w", payloadErr)
				} else {
					v.hub.Broadcast(payload)
					observability.Default.RecordGreetingFired(string(result.GreetingKind))
					clog.Info(ctx, "greeting fired", slog.String("greeting_kind", string(result.GreetingKind)), slog.String("platform", msg.Platform), slog.String("user_id", msg.UserID))
				}
			}
		}
	}
	v.publishProgression(ctx, result.Progression, chatViewerID, cfg.DayResetHour)

	if matchedCmd == nil || v.matcher == nil {
		return
	}

	passedCooldown := v.matcher.TryFire(msg.Platform, msg.UserID, matchedCmd)
	if !passedCooldown {
		outcome := v.matcher.RecordMessageOutcome(
			msg.Platform, msg.ID,
			msg.Platform, msg.UserID,
			matchedCmd, false,
		)
		v.broadcastCommandOutcome(ctx, msg, outcome)
		observability.Default.RecordCommandSuppressed("cooldown")
		clog.Debug(ctx, "command suppressed: cooldown",
			slog.String("trigger", matchedCmd.Trigger),
			slog.String("platform", msg.Platform),
			slog.String("user_id", msg.UserID),
		)
		return
	}

	match, _ := v.matcher.LookupMatch(msg.Message)
	operatorLocale := cfg.Admin.TimeLocale

	if command.IsSocialAction(matchedCmd.Action) {
		v.handleSocialCommand(ctx, msg, matchedCmd, match.Remainder, cfg, operatorLocale, now)
		return
	}

	outcome := v.matcher.RecordMessageOutcome(
		msg.Platform, msg.ID,
		msg.Platform, msg.UserID,
		matchedCmd, true,
	)
	v.broadcastCommandOutcome(ctx, msg, outcome)

	observability.Default.RecordCommandFired()
	clog.Info(ctx, "command fired",
		slog.String("trigger", matchedCmd.Trigger),
		slog.String("platform", msg.Platform),
		slog.String("user_id", msg.UserID),
		slog.String("message_id", strings.TrimSpace(msg.ID)),
		slog.String("action", string(matchedCmd.Action)),
	)

	viewerID, ok := v.viewerStore.ViewerIDForIdentity(msg.Platform, msg.UserID)
	if !ok {
		clog.Errorf(ctx, "viewer id for command event: identity not found after apply chat")
		return
	}

	event := store.AppendInteractionEventInput{
		Kind:           store.InteractionEventCommand,
		ViewerID:       viewerID,
		CommandID:      matchedCmd.ID,
		CommandTrigger: matchedCmd.Trigger,
		Points:         0,
		Now:            now,
	}
	commandProgression, err := v.viewerStore.AppendInteractionEventResult(event)
	if err != nil {
		clog.Errorf(ctx, "append command interaction event: %w", err)
	}
	if matchedCmd.Action == store.CommandActionShowLeaderboard {
		if v.visibility == nil {
			clog.Errorf(ctx, "show leaderboard command: visibility controller unavailable")
			return
		}
		if _, err := v.visibility.Request(ctx, leaderboard.ReasonCommand); err != nil {
			clog.Errorf(ctx, "show leaderboard command: %w", err)
		}
		v.publishProgression(ctx, commandProgression, viewerID, cfg.DayResetHour)
		return
	}

	if v.hub != nil {
		name := command.DisplayName(msg.Username, msg.DisplayName)
		text := command.SubstituteTemplate(matchedCmd.SplashTemplate, command.TemplateVars{
			Viewer:   name,
			Streamer: cfg.StreamerDisplayName,
			Points:   0,
			Message:  msg.Message,
		})
		alertMsg := fillChatMessageAvatar(v.viewerStore, v.cfgStore, msg)
		alertPayload, alertErr := alertWirePayload(matchedCmd, alertMsg, text, 0)
		if alertErr != nil {
			clog.Errorf(ctx, "alert wire payload: %w", alertErr)
			return
		}
		v.hub.Broadcast(alertPayload)
	}
	v.publishProgression(ctx, commandProgression, viewerID, cfg.DayResetHour)
}

func (v *ViewerIngest) handleSocialCommand(
	ctx context.Context,
	msg bus.ChatMessage,
	matchedCmd *store.Command,
	remainder string,
	cfg config.Config,
	operatorLocale string,
	now time.Time,
) {
	result, err := v.viewerStore.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity: store.ChatIdentity{
			Platform:    msg.Platform,
			UserID:      msg.UserID,
			Username:    msg.Username,
			DisplayName: msg.DisplayName,
			AvatarURL:   msg.AvatarURL,
		},
		Command:                *matchedCmd,
		Remainder:              remainder,
		MessagePlatform:        msg.Platform,
		MessageID:              msg.ID,
		DayResetHour:           cfg.DayResetHour,
		BuffsPerAwardPerViewer: cfg.BuffsPerAwardPerViewer,
		BuffMaxUniqueViewers:   cfg.BuffMaxUniqueViewers,
		Now:                    now,
	})
	if err != nil {
		clog.Errorf(ctx, "execute social command: %w", err)
		return
	}

	giverID, _ := v.viewerStore.ViewerIDForIdentity(msg.Platform, msg.UserID)

	if result.Status == command.OutcomeStatusRejected {
		reason := command.RejectReason(result.RejectReason)
		label := command.ReasonLabel(reason, operatorLocale)
		outcome := v.matcher.RecordRejectedOutcome(
			msg.Platform, msg.ID,
			msg.Platform, msg.UserID,
			matchedCmd, string(reason), label,
		)
		v.broadcastCommandOutcome(ctx, msg, outcome)
		observability.Default.RecordCommandSuppressed(string(reason))
		logArgs := []any{
			slog.String("trigger", matchedCmd.Trigger),
			slog.String("reason", string(reason)),
			slog.String("giver_viewer_id", giverID),
		}
		if result.RecipientViewerID != "" {
			logArgs = append(logArgs, slog.String("recipient_viewer_id", result.RecipientViewerID))
		}
		clog.Info(ctx, "command rejected", logArgs...)
		return
	}

	outcome := v.matcher.RecordMessageOutcome(
		msg.Platform, msg.ID,
		msg.Platform, msg.UserID,
		matchedCmd, true,
	)
	v.broadcastCommandOutcome(ctx, msg, outcome)
	observability.Default.RecordCommandFired()
	clog.Info(ctx, "command fired",
		slog.String("trigger", matchedCmd.Trigger),
		slog.String("giver_viewer_id", giverID),
		slog.String("recipient_viewer_id", result.RecipientViewerID),
		slog.String("action", matchedCmd.Action),
	)

	if v.publisher != nil {
		v.publisher.Schedule()
	}
	if result.MeaningfulRankChange && v.visibility != nil {
		v.visibility.SubmitTrigger(leaderboard.ReasonRankChange)
	} else if v.visibility != nil {
		v.visibility.MarkDirty()
	}

	if matchedCmd.Action == store.CommandActionLike && v.hub != nil && result.LikeGrant != nil {
		award, awardErr := v.viewerStore.GetAward(matchedCmd.AwardID)
		if awardErr != nil {
			clog.Errorf(ctx, "load like award for alert: %w", awardErr)
		} else {
			recipientName := command.DisplayName(result.RecipientIdentity.Username, result.RecipientIdentity.DisplayName)
			text := command.SubstituteTemplate(award.SplashTemplate, command.TemplateVars{
				Viewer:   recipientName,
				Streamer: cfg.StreamerDisplayName,
				Points:   award.Points,
				Message:  msg.Message,
			})
			alertPayload, alertErr := awardAlertWirePayload(award, recipientName, result.LikeGrant.AvatarURL, text, award.Points, now, awardAlertContext{
				MessagePlatform: msg.Platform,
				MessageID:       msg.ID,
			})
			if alertErr != nil {
				clog.Errorf(ctx, "like award alert wire payload: %w", alertErr)
			} else {
				v.hub.Broadcast(alertPayload)
				observability.Default.RecordAwardGranted()
			}
		}
	}

	v.publishProgression(ctx, result.GiverProgression, giverID, cfg.DayResetHour)
	if result.RecipientViewerID != "" {
		v.publishProgression(ctx, result.RecipientProgression, result.RecipientViewerID, cfg.DayResetHour)
	}
}

func (v *ViewerIngest) broadcastCommandOutcome(ctx context.Context, msg bus.ChatMessage, outcome command.MessageOutcome) {
	if v.hub == nil || outcome.Trigger == "" {
		return
	}
	platform := strings.TrimSpace(msg.Platform)
	messageID := strings.TrimSpace(msg.ID)
	if platform == "" || messageID == "" {
		return
	}

	payload, err := commandOutcomeWirePayload(
		platform, messageID,
		outcome.Trigger, outcome.Status, outcome.CooldownRemainingMs,
		outcome.Reason, outcome.ReasonLabel,
	)
	if err != nil {
		clog.Errorf(ctx, "command outcome wire payload: %w", err)
		return
	}
	v.hub.Broadcast(payload)
}

func (v *ViewerIngest) publishProgression(ctx context.Context, bundle store.ProgressionResultBundle, viewerID string, dayResetHour int) {
	if v.hub == nil {
		return
	}
	if strings.TrimSpace(viewerID) == "" {
		return
	}
	customAvatarsEnabled := true
	if v.cfgStore != nil {
		customAvatarsEnabled = v.cfgStore.Snapshot().CustomAvatarsEnabled
	}
	payload, ok, err := progressionLivePayload(v.viewerStore, viewerID, dayResetHour, customAvatarsEnabled, bundle)
	if err != nil {
		clog.Errorf(ctx, "build viewer progression frame: %w", err)
		return
	}
	if ok {
		v.hub.Broadcast(payload)
		observability.Default.RecordProgressionPublished()
	}
}

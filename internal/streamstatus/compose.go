package streamstatus

import (
	"time"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

var platformOrder = []string{
	status.PlatformTwitch,
	status.PlatformYouTube,
	status.PlatformVK,
}

// Compose builds the API response from config, connector registry, and stored snapshots.
func Compose(cfg config.Config, registry *status.Registry, store *Store, now time.Time) Response {
	platforms := make([]Snapshot, 0, len(platformOrder))
	for _, platform := range platformOrder {
		platforms = append(platforms, composePlatform(cfg, registry, store, platform, now))
	}

	return Response{
		UpdatedAt:    now.UTC(),
		ViewersTotal: aggregateViewers(platforms),
		Platforms:    platforms,
	}
}

func composePlatform(cfg config.Config, registry *status.Registry, store *Store, platform string, now time.Time) Snapshot {
	snap := emptySnapshot(platform, now)
	if store != nil {
		if stored, ok := store.Get(platform); ok {
			snap = redactSnapshot(stored)
		}
	}

	snap.Chat = chatHealth(cfg, registry, platform)
	snap.Capabilities = ensureChatHealthCapability(snap.Capabilities)
	return snap
}

func ensureChatHealthCapability(caps []string) []string {
	for _, cap := range caps {
		if cap == CapChatHealth {
			return caps
		}
	}
	return append(caps, CapChatHealth)
}

func emptySnapshot(platform string, now time.Time) Snapshot {
	return Snapshot{
		Platform:     platform,
		Mode:         "none",
		Capabilities: []string{CapChatHealth},
		StreamID:     nil,
		State:        StateUnknown,
		Title:        nil,
		Category:     nil,
		ScheduledAt:  nil,
		StartedAt:    nil,
		SampledAt:    now.UTC(),
		Stale:        false,
		Viewers: Viewers{
			Current:     nil,
			PeakSession: nil,
			Change5m:    nil,
		},
		Chat: ChatHealth{
			State:             "disabled",
			LastSuccessAt:     nil,
			MessagesPerMinute: nil,
		},
		Playback: Playback{
			Supported:         false,
			State:             "not_checked",
			ManifestAdvancing: nil,
			LagSeconds:        nil,
			MaxResolution:     nil,
			MaxFPS:            nil,
			CheckedAt:         nil,
		},
		Ingest: Ingest{
			Supported: false,
			State:     "not_checked",
			Issues:    []IngestIssue{},
			CheckedAt: nil,
		},
		Probe: Probe{
			Source:              "none",
			LastSuccessAt:       nil,
			ConsecutiveFailures: 0,
			LastError:           nil,
		},
	}
}

func chatHealth(cfg config.Config, registry *status.Registry, platform string) ChatHealth {
	if !connectorEnabled(cfg, platform) {
		return ChatHealth{
			State:             "disabled",
			LastSuccessAt:     nil,
			MessagesPerMinute: nil,
		}
	}

	if registry == nil {
		return ChatHealth{
			State:             "disconnected",
			LastSuccessAt:     nil,
			MessagesPerMinute: nil,
		}
	}

	snap := registry.Get(platform)
	if snap.State == "" {
		return ChatHealth{
			State:             "disconnected",
			LastSuccessAt:     nil,
			MessagesPerMinute: nil,
		}
	}

	return ChatHealth{
		State:             string(snap.State),
		LastSuccessAt:     nil,
		MessagesPerMinute: nil,
	}
}

func connectorEnabled(cfg config.Config, platform string) bool {
	switch platform {
	case status.PlatformTwitch:
		return cfg.Twitch.Enabled
	case status.PlatformYouTube:
		return cfg.YouTube.Enabled
	case status.PlatformVK:
		return cfg.VK.Enabled
	default:
		return false
	}
}

func aggregateViewers(platforms []Snapshot) ViewersTotal {
	total := ViewersTotal{
		Current: nil,
		Source:  "local_samples",
	}

	sum := 0
	hasValue := false
	for _, platform := range platforms {
		if platform.Viewers.Current == nil {
			continue
		}
		sum += *platform.Viewers.Current
		hasValue = true
	}
	if hasValue {
		total.Current = intPtr(sum)
	}
	return total
}

func redactSnapshot(snap Snapshot) Snapshot {
	out := copySnapshot(snap)
	if out.Probe.LastError != nil {
		redacted := RedactError(*out.Probe.LastError)
		if redacted == "" {
			out.Probe.LastError = nil
		} else {
			out.Probe.LastError = &redacted
		}
	}
	return out
}

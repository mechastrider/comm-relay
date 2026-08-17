package streamstatus

import "time"

// State is the broadcast lifecycle state for a platform stream.
type State string

// Broadcast states exposed in stream status snapshots.
const (
	StateUnknown  State = "unknown"
	StateOffline  State = "offline"
	StateUpcoming State = "upcoming"
	StateLive     State = "live"
	StateDegraded State = "degraded"
)

// Capability flags describe which diagnostic layers a platform snapshot supports.
const (
	CapChatHealth     = "chat_health"
	CapStreamMetadata = "stream_metadata"
	CapViewers        = "viewers"
	CapViewerSources  = "viewer_sources"
	CapPlaybackProbe  = "playback_probe"
	CapIngestHealth   = "ingest_health"
	CapPlatformStatus = "platform_status"
	CapOwnerAnalytics = "owner_analytics"
)

// Viewers holds nullable viewer counters for a platform snapshot.
type Viewers struct {
	Current     *int `json:"current"`
	PeakSession *int `json:"peak_session"`
	Change5m    *int `json:"change_5m"`
}

// ChatHealth projects connector chat health onto the stream snapshot.
type ChatHealth struct {
	State             string     `json:"state"`
	LastSuccessAt     *time.Time `json:"last_success_at"`
	MessagesPerMinute *float64   `json:"messages_per_minute"`
}

// Playback describes optional HLS playback probe results.
type Playback struct {
	Supported         bool       `json:"supported"`
	State             string     `json:"state"`
	ManifestAdvancing *bool      `json:"manifest_advancing"`
	LagSeconds        *float64   `json:"lag_seconds"`
	MaxResolution     *string    `json:"max_resolution"`
	MaxFPS            *float64   `json:"max_fps"`
	CheckedAt         *time.Time `json:"checked_at"`
}

// IngestIssue is a single ingest health warning from a platform API.
type IngestIssue struct {
	Code     string `json:"code"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

// Ingest describes optional ingest health from owner/platform APIs.
type Ingest struct {
	Supported bool          `json:"supported"`
	State     string        `json:"state"`
	Issues    []IngestIssue `json:"issues"`
	CheckedAt *time.Time    `json:"checked_at"`
}

// Probe records metadata about the last stream status probe source.
type Probe struct {
	Source              string     `json:"source"`
	LastSuccessAt       *time.Time `json:"last_success_at"`
	ConsecutiveFailures int        `json:"consecutive_failures"`
	LastError           *string    `json:"last_error"`
}

// Snapshot is a normalized per-platform stream diagnostics snapshot.
type Snapshot struct {
	Platform     string     `json:"platform"`
	Mode         string     `json:"mode"`
	Capabilities []string   `json:"capabilities"`
	StreamID     *string    `json:"stream_id"`
	State        State      `json:"state"`
	Title        *string    `json:"title"`
	Category     *string    `json:"category"`
	ScheduledAt  *time.Time `json:"scheduled_at"`
	StartedAt    *time.Time `json:"started_at"`
	SampledAt    time.Time  `json:"sampled_at"`
	Stale        bool       `json:"stale"`
	Viewers      Viewers    `json:"viewers"`
	Chat         ChatHealth `json:"chat"`
	Playback     Playback   `json:"playback"`
	Ingest       Ingest     `json:"ingest"`
	Probe        Probe      `json:"probe"`
}

// Sample is a compact history point for viewer trends and state transitions.
type Sample struct {
	SampledAt time.Time `json:"sampled_at"`
	Viewers   *int      `json:"viewers"`
	State     string    `json:"state"`
}

// ViewersTotal is the cross-platform viewer aggregate.
type ViewersTotal struct {
	Current *int   `json:"current"`
	Source  string `json:"source"`
}

// Response is the GET /api/streams/status payload.
type Response struct {
	UpdatedAt    time.Time    `json:"updated_at"`
	ViewersTotal ViewersTotal `json:"viewers_total"`
	Platforms    []Snapshot   `json:"platforms"`
}

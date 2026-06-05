package emote

import "time"

// ProviderSnapshot reports cache health for one emote provider.
type ProviderSnapshot struct {
	EmoteCount        int        `json:"emote_count"`
	ScopeCount        int        `json:"scope_count"`
	GlobalEmoteCount  int        `json:"global_emote_count"`
	ChannelEmoteCount int        `json:"channel_emote_count"`
	LastRefreshAt     *time.Time `json:"last_refresh_at,omitempty"`
	LastError         string     `json:"last_error,omitempty"`
	NextRetryAt       *time.Time `json:"next_retry_at,omitempty"`
}

// Snapshot is a point-in-time view of emote cache health for diagnostics.
type Snapshot struct {
	TotalEntries int                         `json:"total_entries"`
	TotalScopes  int                         `json:"total_scopes"`
	Evictions    uint64                      `json:"evictions"`
	Providers    map[string]ProviderSnapshot `json:"providers"`
}

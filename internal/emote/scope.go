package emote

// ScopeKind distinguishes global provider sets from channel-scoped sets.
type ScopeKind string

const (
	// ScopeGlobal is a provider-wide emote set.
	ScopeGlobal ScopeKind = "global"
	// ScopeChannel is emotes for a specific platform channel.
	ScopeChannel ScopeKind = "channel"
)

// Scope identifies where emote metadata applies.
type Scope struct {
	Kind      ScopeKind
	Platform  string
	ChannelID string
}

// GlobalScope returns the global metadata scope for a provider.
func GlobalScope() Scope {
	return Scope{Kind: ScopeGlobal}
}

// ChannelScope returns a channel-scoped metadata scope.
func ChannelScope(platform, channelID string) Scope {
	return Scope{
		Kind:      ScopeChannel,
		Platform:  platform,
		ChannelID: channelID,
	}
}

// ttlKind returns which TTL applies to this scope.
func (s Scope) ttlKind() ScopeKind {
	if s.Kind == ScopeChannel && s.Platform != "" && s.ChannelID != "" {
		return ScopeChannel
	}
	return ScopeGlobal
}

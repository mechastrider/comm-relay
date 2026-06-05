package emote

import "context"

// Fetcher loads normalized emote metadata from an external provider.
type Fetcher interface {
	ID() ProviderID
	FetchGlobal(ctx context.Context) ([]Metadata, error)
	FetchChannel(ctx context.Context, platform, channelID string) ([]Metadata, error)
}

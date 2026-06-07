package emote

import (
	"context"
	"sync"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/connector/status"
)

const (
	defaultChannelTTL = 12 * time.Minute
	defaultGlobalTTL  = 12 * time.Hour
	defaultMaxEntries = 10_000
	defaultMaxScopes  = 100
	channelInactive   = 30 * time.Minute
)

// Options configures cache TTLs and bounds.
type Options struct {
	ChannelTTL time.Duration
	GlobalTTL  time.Duration
	MaxEntries int
	MaxScopes  int
	Now        func() time.Time
}

// Cache stores normalized third-party emote metadata in memory.
type Cache struct {
	mu sync.RWMutex

	opts Options
	now  func() time.Time

	fetchers       map[ProviderID]Fetcher
	scopes         map[scopeKey]*scopeData
	activeChannels map[channelKey]time.Time
	evictions      uint64
}

type scopeKey struct {
	provider ProviderID
	scope    Scope
}

type channelKey struct {
	platform  string
	channelID string
}

type scopeData struct {
	entries     map[string]Metadata
	refreshedAt time.Time
	expiresAt   time.Time
	lastAccess  time.Time
	lastError   string
	backoff     refreshBackoff
}

// New creates an empty emote metadata cache.
func New(opts Options) *Cache {
	if opts.ChannelTTL <= 0 {
		opts.ChannelTTL = defaultChannelTTL
	}
	if opts.GlobalTTL <= 0 {
		opts.GlobalTTL = defaultGlobalTTL
	}
	if opts.MaxEntries <= 0 {
		opts.MaxEntries = defaultMaxEntries
	}
	if opts.MaxScopes <= 0 {
		opts.MaxScopes = defaultMaxScopes
	}
	if opts.Now == nil {
		opts.Now = time.Now
	}

	return &Cache{
		opts:           opts,
		now:            opts.Now,
		fetchers:       make(map[ProviderID]Fetcher),
		scopes:         make(map[scopeKey]*scopeData),
		activeChannels: make(map[channelKey]time.Time),
	}
}

// RegisterFetcher adds a metadata provider fetcher.
func (c *Cache) RegisterFetcher(fetcher Fetcher) {
	if c == nil || fetcher == nil {
		return
	}

	c.mu.Lock()
	c.fetchers[fetcher.ID()] = fetcher
	c.mu.Unlock()
}

// SetChannelActive marks a platform channel as recently used so its metadata is retained.
func (c *Cache) SetChannelActive(platform, channelID string) {
	if c == nil || platform == "" || channelID == "" {
		return
	}

	now := c.now()
	c.mu.Lock()
	c.activeChannels[channelKey{platform: platform, channelID: channelID}] = now
	c.mu.Unlock()
}

// Refresh loads metadata for a provider scope and replaces cached entries on success.
// Failures record diagnostics and apply backoff without removing existing entries.
func (c *Cache) Refresh(ctx context.Context, provider ProviderID, scope Scope) error {
	if c == nil {
		return errors.New("emote cache is nil")
	}

	fetcher, key, data, now, err := c.prepareRefresh(provider, scope)
	if err != nil {
		return err
	}
	if fetcher == nil {
		return nil
	}

	metadata, fetchErr := c.fetch(ctx, fetcher, scope)
	if fetchErr != nil {
		c.recordFailure(key, data, fetchErr)
		return errors.Errorf("fetch emote metadata: %w", fetchErr)
	}

	c.applyRefresh(key, scope, metadata, now)
	return nil
}

// Lookup returns cached metadata for a code within a provider scope.
func (c *Cache) Lookup(provider ProviderID, scope Scope, code string) (Metadata, bool) {
	if c == nil || code == "" {
		return Metadata{}, false
	}

	now := c.now()
	key := scopeKey{provider: provider, scope: scope}

	c.mu.Lock()
	defer c.mu.Unlock()

	data := c.scopes[key]
	if data == nil || now.After(data.expiresAt) {
		return Metadata{}, false
	}

	data.lastAccess = now
	meta, ok := data.entries[code]
	return meta, ok
}

// EvictStale removes expired scopes and enforces cache bounds.
func (c *Cache) EvictStale() {
	if c == nil {
		return
	}

	now := c.now()

	c.mu.Lock()
	defer c.mu.Unlock()

	for key, data := range c.scopes {
		if c.shouldEvictScope(key, data, now) {
			c.removeScopeLocked(key)
		}
	}

	c.enforceBoundsLocked(now)
}

// RunMaintenance periodically evicts stale metadata until ctx is cancelled.
func (c *Cache) RunMaintenance(ctx context.Context) {
	if c == nil {
		return
	}

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.EvictStale()
		}
	}
}

// Diagnostics returns a snapshot of cache health and per-provider counts.
func (c *Cache) Diagnostics() Snapshot {
	if c == nil {
		return Snapshot{Providers: map[string]ProviderSnapshot{}}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	providers := make(map[string]ProviderSnapshot)
	totalEntries := 0

	for key, data := range c.scopes {
		if data == nil {
			continue
		}

		providerID := string(key.provider)
		snap := providers[providerID]
		count := len(data.entries)
		totalEntries += count
		snap.EmoteCount += count
		snap.ScopeCount++

		if key.scope.Kind == ScopeGlobal {
			snap.GlobalEmoteCount += count
		} else {
			snap.ChannelEmoteCount += count
		}

		if snap.LastRefreshAt == nil || data.refreshedAt.After(*snap.LastRefreshAt) {
			refreshedAt := data.refreshedAt
			snap.LastRefreshAt = &refreshedAt
		}
		if data.lastError != "" {
			snap.LastError = data.lastError
		}
		if !data.backoff.nextRetry.IsZero() {
			nextRetry := data.backoff.nextRetry
			if snap.NextRetryAt == nil || nextRetry.Before(*snap.NextRetryAt) {
				snap.NextRetryAt = &nextRetry
			}
		}

		providers[providerID] = snap
	}

	for id, fetcher := range c.fetchers {
		if _, ok := providers[string(id)]; !ok {
			providers[string(fetcher.ID())] = ProviderSnapshot{}
		}
	}

	return Snapshot{
		TotalEntries: totalEntries,
		TotalScopes:  len(c.scopes),
		Evictions:    c.evictions,
		Providers:    providers,
	}
}

func (c *Cache) prepareRefresh(provider ProviderID, scope Scope) (Fetcher, scopeKey, *scopeData, time.Time, error) {
	now := c.now()
	key := scopeKey{provider: provider, scope: scope}

	c.mu.Lock()
	defer c.mu.Unlock()

	fetcher := c.fetchers[provider]
	if fetcher == nil {
		return nil, key, nil, now, errors.Errorf("unknown emote provider %q", provider)
	}

	data := c.scopes[key]
	if data != nil && !data.backoff.canRetry(now) {
		return nil, key, data, now, nil
	}

	return fetcher, key, data, now, nil
}

func (c *Cache) fetch(ctx context.Context, fetcher Fetcher, scope Scope) ([]Metadata, error) {
	switch scope.ttlKind() {
	case ScopeChannel:
		return fetcher.FetchChannel(ctx, scope.Platform, scope.ChannelID)
	default:
		return fetcher.FetchGlobal(ctx)
	}
}

func (c *Cache) recordFailure(key scopeKey, existing *scopeData, err error) {
	now := c.now()
	safeErr := status.SanitizeError(err.Error())

	c.mu.Lock()
	defer c.mu.Unlock()

	data := existing
	if data == nil {
		data = &scopeData{entries: make(map[string]Metadata)}
		c.scopes[key] = data
	}

	data.lastError = safeErr
	data.backoff = data.backoff.onFailure(now)
	data.lastAccess = now
}

func (c *Cache) applyRefresh(key scopeKey, scope Scope, metadata []Metadata, now time.Time) {
	entries := make(map[string]Metadata, len(metadata))
	for _, item := range metadata {
		item.Provider = key.provider
		item.Scope = scope
		if item.RefreshedAt.IsZero() {
			item.RefreshedAt = now
		}
		if item.Code == "" {
			continue
		}
		entries[item.Code] = item
	}

	ttl := c.opts.GlobalTTL
	if scope.ttlKind() == ScopeChannel {
		ttl = c.opts.ChannelTTL
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.scopes[key] = &scopeData{
		entries:     entries,
		refreshedAt: now,
		expiresAt:   now.Add(ttl),
		lastAccess:  now,
		backoff:     newRefreshBackoff(),
	}

	if scope.Kind == ScopeChannel {
		c.activeChannels[channelKey{platform: scope.Platform, channelID: scope.ChannelID}] = now
	}
}

func (c *Cache) shouldEvictScope(key scopeKey, data *scopeData, now time.Time) bool {
	if data == nil {
		return true
	}
	if now.After(data.expiresAt) {
		return true
	}
	if key.scope.Kind != ScopeChannel {
		return false
	}

	activeAt, ok := c.activeChannels[channelKey{platform: key.scope.Platform, channelID: key.scope.ChannelID}]
	if !ok {
		return true
	}
	return now.Sub(activeAt) > channelInactive
}

func (c *Cache) removeScopeLocked(key scopeKey) {
	data := c.scopes[key]
	if data == nil {
		return
	}
	c.evictions += uint64(len(data.entries))
	delete(c.scopes, key)
}

func (c *Cache) enforceBoundsLocked(now time.Time) {
	for c.totalEntriesLocked() > c.opts.MaxEntries || len(c.scopes) > c.opts.MaxScopes {
		victim := c.pickEvictionVictimLocked(now)
		if victim == nil {
			return
		}
		c.removeScopeLocked(*victim)
	}
}

func (c *Cache) totalEntriesLocked() int {
	total := 0
	for _, data := range c.scopes {
		if data != nil {
			total += len(data.entries)
		}
	}
	return total
}

func (c *Cache) pickEvictionVictimLocked(now time.Time) *scopeKey {
	var victim *scopeKey
	var victimAccess time.Time

	for key, data := range c.scopes {
		if data == nil {
			k := key
			return &k
		}

		if key.scope.Kind == ScopeChannel {
			activeAt, ok := c.activeChannels[channelKey{platform: key.scope.Platform, channelID: key.scope.ChannelID}]
			if !ok || now.Sub(activeAt) > channelInactive {
				k := key
				return &k
			}
		}

		if victim == nil || data.lastAccess.Before(victimAccess) {
			k := key
			victim = &k
			victimAccess = data.lastAccess
		}
	}

	return victim
}

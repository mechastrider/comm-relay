package ytemoji

import (
	"sync"
	"time"
)

const (
	// ProviderID is the wire/provider identifier for YouTube emoji fragments.
	ProviderID = "youtube"
	// DefaultWidth is the rendered width for YouTube emoji images.
	DefaultWidth = 24
	// DefaultHeight is the rendered height for YouTube emoji images.
	DefaultHeight = 24

	globalCatalogTTL = 24 * time.Hour
)

// Entry is normalized YouTube emoji metadata.
type Entry struct {
	ID     string
	URL    string
	Width  int
	Height int
}

// Catalog maps YouTube emoji shortcuts (for example ":heart:") to image metadata.
type Catalog struct {
	mu sync.RWMutex

	global       map[string]Entry
	globalLoaded time.Time
	channel      map[string]Entry
}

// NewCatalog creates a YouTube emoji catalog with built-in live chat emoji fallbacks.
func NewCatalog() *Catalog {
	return &Catalog{
		global:  defaultLiveChatEntries(),
		channel: make(map[string]Entry),
	}
}

// Lookup resolves a shortcut such as ":smile:" to emoji metadata.
func (c *Catalog) Lookup(shortcut string) (Entry, bool) {
	if c == nil || shortcut == "" {
		return Entry{}, false
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	if entry, ok := c.channel[shortcut]; ok {
		return entry, true
	}
	entry, ok := c.global[shortcut]
	return entry, ok
}

// ReplaceGlobal swaps the global emoji dictionary.
func (c *Catalog) ReplaceGlobal(entries map[string]Entry) {
	if c == nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.global = entries
	c.globalLoaded = time.Now().UTC()
}

// GlobalLoadedAt reports when the global catalog was last refreshed.
func (c *Catalog) GlobalLoadedAt() time.Time {
	if c == nil {
		return time.Time{}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	return c.globalLoaded
}

// NeedsGlobalRefresh reports whether the global catalog should be fetched again.
func (c *Catalog) NeedsGlobalRefresh(now time.Time) bool {
	if c == nil {
		return true
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	if len(c.global) == 0 {
		return true
	}
	if c.globalLoaded.IsZero() {
		return true
	}
	return now.Sub(c.globalLoaded) >= globalCatalogTTL
}

// MergeChannel adds or overrides channel-specific emoji shortcuts.
func (c *Catalog) MergeChannel(entries map[string]Entry) {
	if c == nil || len(entries) == 0 {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.channel == nil {
		c.channel = make(map[string]Entry, len(entries))
	}
	for shortcut, entry := range entries {
		c.channel[shortcut] = entry
	}
}

// ClearChannel removes channel-specific emoji metadata.
func (c *Catalog) ClearChannel() {
	if c == nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.channel = make(map[string]Entry)
}

// Counts returns global and channel shortcut counts.
func (c *Catalog) Counts() (global, channel int) {
	if c == nil {
		return 0, 0
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	return len(c.global), len(c.channel)
}

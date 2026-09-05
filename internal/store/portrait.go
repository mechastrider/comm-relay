package store

import (
	"database/sql"
	"strings"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const overlayAssetURLPrefix = "/overlay/assets/"

// PortraitFields holds raw portrait storage fields for one identity.
type PortraitFields struct {
	CustomAvatar string
	AvatarCache  string
	RemoteURL    string
}

// ResolvePortraitURL returns the public portrait URL for overlay and API payloads.
func ResolvePortraitURL(fields PortraitFields, customAvatarsEnabled bool) string {
	if customAvatarsEnabled {
		if custom := strings.TrimSpace(fields.CustomAvatar); custom != "" && config.ValidOverlayAssetName(custom) {
			return overlayAssetURLPrefix + custom
		}
	}
	if cache := strings.TrimSpace(fields.AvatarCache); cache != "" && config.ValidOverlayAssetName(cache) {
		return overlayAssetURLPrefix + cache
	}
	if remote := strings.TrimSpace(fields.RemoteURL); remote != "" {
		return remote
	}
	return ""
}

// ViewerPortraitURL returns the resolved portrait for a canonical viewer.
func ViewerPortraitURL(viewer Viewer, customAvatarsEnabled bool) string {
	resolved := ResolvePortraitURL(PortraitFields{
		CustomAvatar: viewer.CustomAvatar,
	}, customAvatarsEnabled)
	if resolved != "" {
		return resolved
	}
	return strings.TrimSpace(viewer.LastSeen.AvatarURL)
}

// ResolveIdentityPortraitURL returns the resolved portrait URL for one platform identity.
func (s *Store) ResolveIdentityPortraitURL(platform, userID string) (string, error) {
	fields, found, err := s.portraitFields(platform, userID)
	if err != nil {
		return "", err
	}
	if !found {
		return "", nil
	}
	return ResolvePortraitURL(fields, false), nil
}

// AvatarFetchCandidate reports whether a remote portrait should be cached and the URL to fetch.
func (s *Store) AvatarFetchCandidate(platform, userID string) (remoteURL string, ok bool, err error) {
	fields, found, err := s.portraitFields(platform, userID)
	if err != nil {
		return "", false, err
	}
	if !found {
		return "", false, nil
	}
	remoteURL = strings.TrimSpace(fields.RemoteURL)
	if remoteURL == "" {
		return "", false, nil
	}
	if strings.TrimSpace(fields.AvatarCache) != "" {
		return "", false, nil
	}
	return remoteURL, true, nil
}

// SetAvatarCache records a cached portrait filename for an identity.
func (s *Store) SetAvatarCache(platform, userID, filename string) error {
	if strings.TrimSpace(platform) == "" || strings.TrimSpace(userID) == "" {
		return errors.New("platform and user_id are required")
	}
	if !config.ValidOverlayAssetName(filename) {
		return errors.New("invalid avatar cache filename")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return errors.New("store closed")
	}

	result, err := s.db.Exec(
		`UPDATE viewer_identities SET avatar_cache = ? WHERE platform = ? AND user_id = ?`,
		filename,
		platform,
		userID,
	)
	if err != nil {
		return errors.Errorf("set avatar cache: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("avatar cache rows affected: %w", err)
	}
	if rows == 0 {
		return errors.New("identity not found")
	}

	return nil
}

// PortraitCacheFilename returns the stored cache filename for an identity when present.
func (s *Store) PortraitCacheFilename(platform, userID string) (string, error) {
	fields, found, err := s.portraitFields(platform, userID)
	if err != nil {
		return "", err
	}
	if !found {
		return "", nil
	}
	return strings.TrimSpace(fields.AvatarCache), nil
}

func (s *Store) portraitFields(platform, userID string) (PortraitFields, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return PortraitFields{}, false, errors.New("store closed")
	}

	var remoteURL, avatarCache string
	err := s.db.QueryRow(
		`SELECT avatar_url, avatar_cache FROM viewer_identities WHERE platform = ? AND user_id = ?`,
		platform,
		userID,
	).Scan(&remoteURL, &avatarCache)
	if errors.Is(err, sql.ErrNoRows) {
		return PortraitFields{}, false, nil
	}
	if err != nil {
		return PortraitFields{}, false, errors.Errorf("load portrait fields: %w", err)
	}

	return PortraitFields{
		AvatarCache: avatarCache,
		RemoteURL:   remoteURL,
	}, true, nil
}

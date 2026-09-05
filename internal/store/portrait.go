package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const overlayAssetURLPrefix = "/overlay/assets/"

// CanonicalViewerPortraitSQL resolves a cached or remote portrait from any linked identity.
const CanonicalViewerPortraitSQL = `
COALESCE(
	NULLIF((
		SELECT CASE
			WHEN TRIM(vi.avatar_cache) != '' THEN '` + overlayAssetURLPrefix + `' || vi.avatar_cache
			ELSE NULL
		END
		FROM viewer_identities vi
		WHERE vi.viewer_id = v.id AND TRIM(vi.avatar_cache) != ''
		ORDER BY vi.last_seen_at DESC
		LIMIT 1
	), ''),
	COALESCE((
		SELECT vi.avatar_url FROM viewer_identities vi
		WHERE vi.viewer_id = v.id AND TRIM(vi.avatar_url) != ''
		ORDER BY vi.last_seen_at DESC
		LIMIT 1
	), '')
)`

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

type identityPortraitFields struct {
	RemoteURL   string
	AvatarCache string
	LastSeenAt  time.Time
}

func mergeViewerIdentityPortraits(customAvatar string, identities []identityPortraitFields) PortraitFields {
	fields := PortraitFields{CustomAvatar: customAvatar}
	var bestCache, bestRemote string
	var bestCacheSeen, bestRemoteSeen time.Time

	for _, identity := range identities {
		cache := strings.TrimSpace(identity.AvatarCache)
		if cache != "" && config.ValidOverlayAssetName(cache) {
			if bestCache == "" || identity.LastSeenAt.After(bestCacheSeen) {
				bestCache = cache
				bestCacheSeen = identity.LastSeenAt
			}
		}
		remote := strings.TrimSpace(identity.RemoteURL)
		if remote != "" {
			if bestRemote == "" || identity.LastSeenAt.After(bestRemoteSeen) {
				bestRemote = remote
				bestRemoteSeen = identity.LastSeenAt
			}
		}
	}

	fields.AvatarCache = bestCache
	fields.RemoteURL = bestRemote
	return fields
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

// SetAvatarCacheIfRemoteURL records a cache filename only when avatar_url still matches expectedURL.
// Returns committed=true when the row was updated.
func (s *Store) SetAvatarCacheIfRemoteURL(platform, userID, expectedURL, filename string) (bool, error) {
	platform = strings.TrimSpace(platform)
	userID = strings.TrimSpace(userID)
	expectedURL = strings.TrimSpace(expectedURL)
	filename = strings.TrimSpace(filename)
	if platform == "" || userID == "" {
		return false, errors.New("platform and user_id are required")
	}
	if expectedURL == "" {
		return false, errors.New("expected remote url is required")
	}
	if !config.ValidOverlayAssetName(filename) {
		return false, errors.New("invalid avatar cache filename")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return false, errors.New("store closed")
	}

	result, err := s.db.Exec(
		`UPDATE viewer_identities
		 SET avatar_cache = ?
		 WHERE platform = ? AND user_id = ? AND avatar_url = ? AND TRIM(avatar_cache) = ''`,
		filename,
		platform,
		userID,
		expectedURL,
	)
	if err != nil {
		return false, errors.Errorf("set avatar cache if remote url: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, errors.Errorf("avatar cache if remote url rows affected: %w", err)
	}

	return rows > 0, nil
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

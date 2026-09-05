package store

import (
	"database/sql"
	"strings"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

// SetCustomAvatar stores a custom portrait filename for a visible viewer.
// Returns the previous filename when one was replaced.
func (s *Store) SetCustomAvatar(viewerID, filename string) (string, error) {
	viewerID = strings.TrimSpace(viewerID)
	filename = strings.TrimSpace(filename)
	if viewerID == "" {
		return "", errors.New("viewer id is required")
	}
	if !config.ValidOverlayAssetName(filename) {
		return "", errors.New("invalid custom avatar filename")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return "", errors.New("store closed")
	}

	if err := loadVisibleViewer(s.db, viewerID); err != nil {
		return "", err
	}

	var previous string
	err := s.db.QueryRow(`SELECT custom_avatar FROM viewers WHERE id = ?`, viewerID).Scan(&previous)
	if err != nil {
		return "", errors.Errorf("load custom avatar: %w", err)
	}
	previous = strings.TrimSpace(previous)

	if _, err := s.db.Exec(`UPDATE viewers SET custom_avatar = ? WHERE id = ?`, filename, viewerID); err != nil {
		return "", errors.Errorf("set custom avatar: %w", err)
	}

	return previous, nil
}

// ClearCustomAvatar removes a viewer's custom portrait association.
// Returns the cleared filename when one was stored.
func (s *Store) ClearCustomAvatar(viewerID string) (string, error) {
	viewerID = strings.TrimSpace(viewerID)
	if viewerID == "" {
		return "", errors.New("viewer id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return "", errors.New("store closed")
	}

	if err := loadVisibleViewer(s.db, viewerID); err != nil {
		return "", err
	}

	var previous string
	err := s.db.QueryRow(`SELECT custom_avatar FROM viewers WHERE id = ?`, viewerID).Scan(&previous)
	if err != nil {
		return "", errors.Errorf("load custom avatar: %w", err)
	}
	previous = strings.TrimSpace(previous)
	if previous == "" {
		return "", nil
	}

	if _, err := s.db.Exec(`UPDATE viewers SET custom_avatar = '' WHERE id = ?`, viewerID); err != nil {
		return "", errors.Errorf("clear custom avatar: %w", err)
	}

	return previous, nil
}

// OverlayAssetFilenameInUse reports whether a filename is referenced by a custom portrait or identity cache.
func (s *Store) OverlayAssetFilenameInUse(filename string) (bool, error) {
	filename = strings.TrimSpace(filename)
	if filename == "" || !config.ValidOverlayAssetName(filename) {
		return false, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return false, errors.New("store closed")
	}

	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM (
			SELECT 1 FROM viewers WHERE custom_avatar = ?
			UNION ALL
			SELECT 1 FROM viewer_identities WHERE avatar_cache = ?
		)`,
		filename,
		filename,
	).Scan(&count)
	if err != nil {
		return false, errors.Errorf("count overlay asset references: %w", err)
	}

	return count > 0, nil
}

// ResolveCanonicalPortraitURL resolves a portrait for one platform identity using viewer custom, cache, then remote.
func (s *Store) ResolveCanonicalPortraitURL(platform, userID string, customAvatarsEnabled bool) (string, error) {
	fields, found, err := s.canonicalPortraitFields(platform, userID)
	if err != nil {
		return "", err
	}
	if !found {
		return "", nil
	}
	return ResolvePortraitURL(fields, customAvatarsEnabled), nil
}

func (s *Store) canonicalPortraitFields(platform, userID string) (PortraitFields, bool, error) {
	platform = strings.TrimSpace(platform)
	userID = strings.TrimSpace(userID)
	if platform == "" || userID == "" {
		return PortraitFields{}, false, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return PortraitFields{}, false, errors.New("store closed")
	}

	var customAvatar, remoteURL, avatarCache string
	err := s.db.QueryRow(`
		SELECT v.custom_avatar, vi.avatar_url, vi.avatar_cache
		FROM viewer_identities vi
		INNER JOIN viewers v ON v.id = vi.viewer_id
		WHERE vi.platform = ? AND vi.user_id = ?`,
		platform,
		userID,
	).Scan(&customAvatar, &remoteURL, &avatarCache)
	if errors.Is(err, sql.ErrNoRows) {
		return PortraitFields{}, false, nil
	}
	if err != nil {
		return PortraitFields{}, false, errors.Errorf("load canonical portrait fields: %w", err)
	}

	return PortraitFields{
		CustomAvatar: customAvatar,
		AvatarCache:  avatarCache,
		RemoteURL:    remoteURL,
	}, true, nil
}

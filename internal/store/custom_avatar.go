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
// incomingRemote is used when the connector supplied a URL that is not yet persisted.
func (s *Store) ResolveCanonicalPortraitURL(
	platform, userID string,
	customAvatarsEnabled bool,
	incomingRemote string,
) (string, error) {
	fields, found, err := s.canonicalPortraitFields(platform, userID)
	if err != nil {
		return "", err
	}
	if !found {
		fields = PortraitFields{RemoteURL: strings.TrimSpace(incomingRemote)}
	} else if strings.TrimSpace(fields.RemoteURL) == "" {
		fields.RemoteURL = strings.TrimSpace(incomingRemote)
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

	var viewerID, customAvatar string
	err := s.db.QueryRow(`
		SELECT v.id, v.custom_avatar
		FROM viewer_identities vi
		INNER JOIN viewers v ON v.id = vi.viewer_id
		WHERE vi.platform = ? AND vi.user_id = ?`,
		platform,
		userID,
	).Scan(&viewerID, &customAvatar)
	if errors.Is(err, sql.ErrNoRows) {
		return PortraitFields{}, false, nil
	}
	if err != nil {
		return PortraitFields{}, false, errors.Errorf("load canonical viewer for portrait: %w", err)
	}

	rows, err := s.db.Query(`
		SELECT avatar_url, avatar_cache, last_seen_at
		FROM viewer_identities
		WHERE viewer_id = ?
		ORDER BY last_seen_at DESC`,
		viewerID,
	)
	if err != nil {
		return PortraitFields{}, false, errors.Errorf("load viewer identities for portrait: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var identities []identityPortraitFields
	for rows.Next() {
		var identity identityPortraitFields
		var lastSeenRaw string
		if err := rows.Scan(&identity.RemoteURL, &identity.AvatarCache, &lastSeenRaw); err != nil {
			return PortraitFields{}, false, errors.Errorf("scan viewer identity portrait: %w", err)
		}
		lastSeen, parseErr := parseTime(lastSeenRaw)
		if parseErr != nil {
			return PortraitFields{}, false, parseErr
		}
		identity.LastSeenAt = lastSeen
		identities = append(identities, identity)
	}
	if err := rows.Err(); err != nil {
		return PortraitFields{}, false, errors.Errorf("iterate viewer identities for portrait: %w", err)
	}

	return mergeViewerIdentityPortraits(customAvatar, identities), true, nil
}

package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

type rowQuerier interface {
	QueryRow(query string, args ...any) *sql.Row
}

// UpdateDisplayName sets or clears the canonical display-name override for a viewer.
func (s *Store) UpdateDisplayName(id, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := loadVisibleViewer(s.db, id); err != nil {
		return err
	}

	if strings.TrimSpace(name) == "" {
		if _, err := s.db.Exec(`UPDATE viewers SET display_name = NULL WHERE id = ?`, id); err != nil {
			return errors.Errorf("clear display name override: %w", err)
		}
		return nil
	}

	if _, err := s.db.Exec(`UPDATE viewers SET display_name = ? WHERE id = ?`, name, id); err != nil {
		return errors.Errorf("set display name override: %w", err)
	}

	return nil
}

// List returns visible viewers optionally filtered by query string.
func (s *Store) List(q string, dayResetHour int, now time.Time) ([]Viewer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID, err := s.openSessionLocked()
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Errorf("lookup open session: %w", err)
	}

	nowDayKey := DayKey(now, dayResetHour)
	pattern := listSearchPattern(q)

	rows, err := s.db.Query(`
		SELECT
			v.id,
			v.display_name,
			v.message_count,
			v.xp,
			v.last_seen_at,
			COALESCE(vss.message_count, 0),
			COALESCE(vss.xp, 0),
			COALESCE(vds.message_count, 0),
			COALESCE(vds.xp, 0),
			COALESCE(
				NULLIF(v.display_name, ''),
				(
					SELECT vi.display_name FROM viewer_identities vi
					WHERE vi.viewer_id = v.id
					ORDER BY vi.last_seen_at DESC
					LIMIT 1
				),
				(
					SELECT vi.username FROM viewer_identities vi
					WHERE vi.viewer_id = v.id
					ORDER BY vi.last_seen_at DESC
					LIMIT 1
				),
				''
			) AS effective_display_name,
			COALESCE((
				SELECT vi.platform FROM viewer_identities vi
				WHERE vi.viewer_id = v.id
				ORDER BY vi.last_seen_at DESC
				LIMIT 1
			), '') AS last_seen_platform,
			COALESCE((
				SELECT vi.user_id FROM viewer_identities vi
				WHERE vi.viewer_id = v.id
				ORDER BY vi.last_seen_at DESC
				LIMIT 1
			), '') AS last_seen_user_id,
			COALESCE((
				SELECT vi.username FROM viewer_identities vi
				WHERE vi.viewer_id = v.id
				ORDER BY vi.last_seen_at DESC
				LIMIT 1
			), '') AS last_seen_username,
			COALESCE(
				NULLIF((
					SELECT CASE
						WHEN TRIM(vi.avatar_cache) != '' THEN '`+overlayAssetURLPrefix+`' || vi.avatar_cache
						ELSE NULL
					END
					FROM viewer_identities vi
					WHERE vi.viewer_id = v.id
					ORDER BY vi.last_seen_at DESC
					LIMIT 1
				), ''),
				COALESCE((
					SELECT vi.avatar_url FROM viewer_identities vi
					WHERE vi.viewer_id = v.id
					ORDER BY vi.last_seen_at DESC
					LIMIT 1
				), '')
			) AS last_seen_avatar_url
		FROM viewers v
		LEFT JOIN viewer_session_stats vss ON vss.viewer_id = v.id AND vss.session_id = ?
		LEFT JOIN viewer_day_stats vds ON vds.viewer_id = v.id AND vds.day_key = ?
		WHERE v.hidden = 0
		  AND (
		    ? = ''
		    OR LOWER(COALESCE(v.display_name, '')) LIKE ?
		    OR EXISTS (
		      SELECT 1 FROM viewer_identities vi
		      WHERE vi.viewer_id = v.id AND (
		        LOWER(vi.display_name) LIKE ?
		        OR LOWER(vi.username) LIKE ?
		        OR LOWER(vi.user_id) LIKE ?
		        OR LOWER(vi.platform) LIKE ?
		      )
		    )
		  )
		ORDER BY v.last_seen_at DESC`,
		sessionID,
		nowDayKey,
		strings.TrimSpace(q),
		pattern,
		pattern,
		pattern,
		pattern,
		pattern,
	)
	if err != nil {
		return nil, errors.Errorf("list viewers: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var viewers []Viewer
	for rows.Next() {
		viewer, scanErr := scanViewerListRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		viewers = append(viewers, viewer)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate viewers: %w", err)
	}

	if err := s.attachPlatformsLocked(viewers); err != nil {
		return nil, errors.Errorf("attach viewer platforms: %w", err)
	}

	return viewers, nil
}

// Get returns one visible viewer with identities and period counters.
func (s *Store) Get(id string, dayResetHour int, now time.Time) (*Viewer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID, err := s.openSessionLocked()
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Errorf("lookup open session: %w", err)
	}

	nowDayKey := DayKey(now, dayResetHour)
	row := s.db.QueryRow(`
		SELECT
			v.id,
			v.display_name,
			v.message_count,
			v.xp,
			v.last_seen_at,
			COALESCE(vss.message_count, 0),
			COALESCE(vss.xp, 0),
			COALESCE(vds.message_count, 0),
			COALESCE(vds.xp, 0)
		FROM viewers v
		LEFT JOIN viewer_session_stats vss ON vss.viewer_id = v.id AND vss.session_id = ?
		LEFT JOIN viewer_day_stats vds ON vds.viewer_id = v.id AND vds.day_key = ?
		WHERE v.id = ? AND v.hidden = 0`, sessionID, nowDayKey, id)

	viewer, err := scanViewerSummaryRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	identities, err := s.loadIdentitiesLocked(id)
	if err != nil {
		return nil, err
	}

	viewer.Identities = identities
	viewer.DisplayName = effectiveDisplayName(viewer.DisplayNameOverride, identities)
	viewer.LastSeen = latestIdentity(identities)
	attachPlatformsFromIdentities(&viewer)

	return &viewer, nil
}

func listSearchPattern(q string) string {
	q = strings.TrimSpace(strings.ToLower(q))
	if q == "" {
		return ""
	}

	return fmt.Sprintf("%%%s%%", q)
}

func (s *Store) loadIdentitiesLocked(viewerID string) ([]Identity, error) {
	rows, err := s.db.Query(`
		SELECT platform, user_id, username, display_name, avatar_url, avatar_cache, last_seen_at
		FROM viewer_identities
		WHERE viewer_id = ?
		ORDER BY platform, user_id`, viewerID)
	if err != nil {
		return nil, errors.Errorf("load identities: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var identities []Identity
	for rows.Next() {
		var identity Identity
		var lastSeenRaw string
		var remoteAvatarURL, avatarCache string
		if err := rows.Scan(
			&identity.Platform,
			&identity.UserID,
			&identity.Username,
			&identity.DisplayName,
			&remoteAvatarURL,
			&avatarCache,
			&lastSeenRaw,
		); err != nil {
			return nil, errors.Errorf("scan identity: %w", err)
		}

		lastSeen, err := parseTime(lastSeenRaw)
		if err != nil {
			return nil, err
		}
		identity.LastSeenAt = lastSeen
		identity.AvatarURL = ResolvePortraitURL(PortraitFields{
			AvatarCache: avatarCache,
			RemoteURL:   remoteAvatarURL,
		})
		identities = append(identities, identity)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate identities: %w", err)
	}

	return identities, nil
}

func scanViewerListRow(rows *sql.Rows) (Viewer, error) {
	var viewer Viewer
	var displayOverride sql.NullString
	var lastSeenRaw string
	if err := rows.Scan(
		&viewer.ID,
		&displayOverride,
		&viewer.MessageCount,
		&viewer.XP,
		&lastSeenRaw,
		&viewer.SessionMessageCount,
		&viewer.SessionXP,
		&viewer.DayMessageCount,
		&viewer.DayXP,
		&viewer.DisplayName,
		&viewer.LastSeen.Platform,
		&viewer.LastSeen.UserID,
		&viewer.LastSeen.Username,
		&viewer.LastSeen.AvatarURL,
	); err != nil {
		return Viewer{}, errors.Errorf("scan viewer list row: %w", err)
	}

	lastSeen, err := parseTime(lastSeenRaw)
	if err != nil {
		return Viewer{}, err
	}
	viewer.LastSeenAt = lastSeen
	if displayOverride.Valid {
		viewer.DisplayNameOverride = displayOverride.String
	}

	return viewer, nil
}

func scanViewerSummaryRow(row *sql.Row) (Viewer, error) {
	var viewer Viewer
	var displayOverride sql.NullString
	var lastSeenRaw string
	if err := row.Scan(
		&viewer.ID,
		&displayOverride,
		&viewer.MessageCount,
		&viewer.XP,
		&lastSeenRaw,
		&viewer.SessionMessageCount,
		&viewer.SessionXP,
		&viewer.DayMessageCount,
		&viewer.DayXP,
	); err != nil {
		return Viewer{}, err
	}

	lastSeen, err := parseTime(lastSeenRaw)
	if err != nil {
		return Viewer{}, err
	}
	viewer.LastSeenAt = lastSeen
	if displayOverride.Valid {
		viewer.DisplayNameOverride = displayOverride.String
	}

	return viewer, nil
}

func effectiveDisplayName(override string, identities []Identity) string {
	if strings.TrimSpace(override) != "" {
		return override
	}

	var latest Identity
	for _, identity := range identities {
		if latest.LastSeenAt.IsZero() || identity.LastSeenAt.After(latest.LastSeenAt) {
			latest = identity
		}
	}
	if latest.DisplayName != "" {
		return latest.DisplayName
	}
	if latest.Username != "" {
		return latest.Username
	}

	return ""
}

func latestIdentity(identities []Identity) LastSeenIdentity {
	var latest Identity
	for _, identity := range identities {
		if latest.LastSeenAt.IsZero() || identity.LastSeenAt.After(latest.LastSeenAt) {
			latest = identity
		}
	}

	return LastSeenIdentity{
		Platform:  latest.Platform,
		UserID:    latest.UserID,
		Username:  latest.Username,
		AvatarURL: latest.AvatarURL,
	}
}

func loadVisibleViewer(q rowQuerier, viewerID string) error {
	var hidden int
	err := q.QueryRow(`SELECT hidden FROM viewers WHERE id = ?`, viewerID).Scan(&hidden)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return errors.Errorf("load viewer %q: %w", viewerID, err)
	}
	if hidden != 0 {
		return ErrNotFound
	}

	return nil
}

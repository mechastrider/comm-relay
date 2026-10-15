package store

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

// ErrInvalidLiveEventsQuery identifies malformed filters, bounds or cursors.
var ErrInvalidLiveEventsQuery = errors.New("invalid live events query")

// LiveEventsQuery selects one bounded current-session page.
type LiveEventsQuery struct {
	Category string
	Limit    int
	Cursor   string
}

// LiveEvent contains only operator-safe presentation data, never chat content.
type LiveEvent struct {
	ID            string `json:"id"`
	Kind          string `json:"kind"`
	ViewerName    string `json:"viewer_name"`
	RecipientName string `json:"recipient_name"`
	Label         string `json:"label"`
	Points        int    `json:"points"`
	CreatedAt     string `json:"created_at"`
}

// LiveEventsPage is a newest-first keyset page of the current stream.
type LiveEventsPage struct {
	SessionID  string      `json:"session_id"`
	Entries    []LiveEvent `json:"entries"`
	NextCursor string      `json:"next_cursor,omitempty"`
}

type liveEventsCursor struct {
	Session  string `json:"session"`
	Category string `json:"category"`
	Time     string `json:"time"`
	ID       string `json:"id"`
}

func parseLiveEventsQuery(query LiveEventsQuery) (LiveEventsQuery, liveEventsCursor, error) {
	if query.Category == "" {
		query.Category = "all"
	}
	switch query.Category {
	case "all", "reactions", "commands", "progress":
	default:
		return query, liveEventsCursor{}, ErrInvalidLiveEventsQuery
	}
	if query.Limit == 0 {
		query.Limit = 50
	}
	if query.Limit < 1 || query.Limit > 100 || len(query.Cursor) > 1024 {
		return query, liveEventsCursor{}, ErrInvalidLiveEventsQuery
	}
	var cursor liveEventsCursor
	if query.Cursor != "" {
		data, err := base64.RawURLEncoding.DecodeString(query.Cursor)
		if err != nil || json.Unmarshal(data, &cursor) != nil {
			return query, cursor, ErrInvalidLiveEventsQuery
		}
		stamp, err := time.Parse("2006-01-02T15:04:05.000Z", cursor.Time)
		if err != nil || stamp.Format("2006-01-02T15:04:05.000Z") != cursor.Time || cursor.Category != query.Category || cursor.Session == "" || cursor.ID == "" || len(cursor.ID) > 128 {
			return query, cursor, ErrInvalidLiveEventsQuery
		}
	}
	return query, cursor, nil
}

// ListLiveEvents reads existing facts without creating or changing a session.
func (s *Store) ListLiveEvents(ctx context.Context, query LiveEventsQuery) (LiveEventsPage, error) {
	query, cursor, err := parseLiveEventsQuery(query)
	if err != nil {
		return LiveEventsPage{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	page := LiveEventsPage{Entries: []LiveEvent{}}
	session, err := s.openSessionLocked()
	if errors.Is(err, sql.ErrNoRows) {
		return page, nil
	}
	if err != nil {
		return page, errors.Errorf("read live events session: %w", err)
	}
	page.SessionID = session
	if query.Cursor != "" && cursor.Session != session {
		return page, ErrInvalidLiveEventsQuery
	}
	where := "1 = 1"
	switch query.Category {
	case "reactions":
		where = "kind IN ('award', 'like', 'buff')"
	case "commands":
		where = "kind = 'command'"
	case "progress":
		where = "kind IN ('achievement', 'level')"
	}
	args := []any{session, session, session}
	if query.Cursor != "" {
		where += " AND (created_at < ? OR (created_at = ? AND id < ?))"
		args = append(args, cursor.Time, cursor.Time, cursor.ID)
	}
	args = append(args, query.Limit+1)
	// Timestamp precision is normalized across the three existing storage formats.
	// Only bounded page rows resolve names, avoiding per-event queries in Go.
	rows, err := s.db.QueryContext(ctx, liveEventsSQL+`
 SELECT f.id, f.kind, `+liveEventNameSQL("v")+`, `+liveEventNameSQL("r")+`, f.label, f.points, f.created_at
 FROM (SELECT * FROM facts WHERE `+where+` ORDER BY created_at DESC, id DESC LIMIT ?) f
 LEFT JOIN viewers v ON v.id = f.viewer_id
 LEFT JOIN viewers r ON r.id = f.recipient_id
 ORDER BY f.created_at DESC, f.id DESC`, args...)
	if err != nil {
		return page, errors.Errorf("list live events: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var entry LiveEvent
		if err := rows.Scan(&entry.ID, &entry.Kind, &entry.ViewerName, &entry.RecipientName, &entry.Label, &entry.Points, &entry.CreatedAt); err != nil {
			return page, errors.Errorf("scan live event: %w", err)
		}
		page.Entries = append(page.Entries, entry)
	}
	if err := rows.Err(); err != nil {
		return page, errors.Errorf("iterate live events: %w", err)
	}
	if len(page.Entries) > query.Limit {
		page.Entries = page.Entries[:query.Limit]
		last := page.Entries[len(page.Entries)-1]
		encoded, err := json.Marshal(liveEventsCursor{Session: session, Category: query.Category, Time: last.CreatedAt, ID: last.ID})
		if err != nil {
			return page, errors.Errorf("encode live events cursor: %w", err)
		}
		page.NextCursor = base64.RawURLEncoding.EncodeToString(encoded)
	}
	return page, nil
}

func liveEventNameSQL(alias string) string {
	// Alias is an internal constant, never a request value.
	return strings.ReplaceAll(`COALESCE(NULLIF(@.display_name, ''),
 (SELECT COALESCE(NULLIF(vi.display_name, ''), NULLIF(vi.username, '')) FROM viewer_identities vi
 WHERE vi.viewer_id = @.id ORDER BY vi.last_seen_at DESC, vi.platform, vi.user_id LIMIT 1), '')`, "@", alias)
}

const liveEventsSQL = `WITH facts AS (
 SELECT 'i:' || e.id AS id,
 CASE WHEN e.kind = 'award' AND e.actor_viewer_id IS NOT NULL THEN 'like' ELSE e.kind END AS kind,
 CASE WHEN e.actor_viewer_id IS NOT NULL THEN e.actor_viewer_id ELSE e.viewer_id END AS viewer_id,
 CASE WHEN e.actor_viewer_id IS NOT NULL THEN e.viewer_id ELSE e.recipient_viewer_id END AS recipient_id,
 COALESCE(e.reward_name, e.command_trigger, '') AS label, e.points,
 strftime('%Y-%m-%dT%H:%M:%fZ', e.created_at) AS created_at
 FROM interaction_events e WHERE e.session_id = ? AND e.kind != 'activity' AND e.feed_hidden = 0
 UNION ALL
 SELECT 'a:' || id, 'achievement', viewer_id, NULL, name, 0,
 strftime('%Y-%m-%dT%H:%M:%fZ', unlocked_at)
 FROM viewer_achievement_unlocks WHERE session_id = ? AND backfilled = 0
 UNION ALL
 SELECT 'l:' || id, 'level', viewer_id, NULL, level_title, 0,
 strftime('%Y-%m-%dT%H:%M:%fZ', created_at)
 FROM viewer_level_events WHERE session_id = ?
)`

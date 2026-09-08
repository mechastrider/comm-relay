package store

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const (
	defaultRewardHistoryLimit = 50
	maxRewardHistoryLimit     = 100
	maxRewardHistoryCursorLen = 1024
)

type rewardHistoryCursor struct {
	Version   int    `json:"v"`
	CreatedAt string `json:"created_at"`
	ID        string `json:"id"`
}

// ListRewardHistory returns a bounded, award-only keyset page. Viewer scopes
// must identify a visible canonical viewer.
func (s *Store) ListRewardHistory(query RewardHistoryQuery) (RewardHistoryPage, error) {
	limit, err := rewardHistoryLimit(query.Limit)
	if err != nil {
		return RewardHistoryPage{}, err
	}
	cursor, err := decodeRewardHistoryCursor(query.Cursor)
	if err != nil {
		return RewardHistoryPage{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	viewerID := strings.TrimSpace(query.ViewerID)
	if viewerID != "" {
		if visibleViewerErr := loadVisibleViewer(s.db, viewerID); visibleViewerErr != nil {
			return RewardHistoryPage{}, visibleViewerErr
		}
	}

	args := []any{string(InteractionEventAward)}
	where := "WHERE e.kind = ? AND v.hidden = 0"
	if viewerID != "" {
		where += " AND e.viewer_id = ?"
		args = append(args, viewerID)
	}
	if cursor != nil {
		where += " AND (e.created_at < ? OR (e.created_at = ? AND e.id < ?))"
		args = append(args, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}
	args = append(args, limit+1)

	rows, err := s.db.Query(`
		SELECT e.id, e.kind, e.viewer_id,
		       COALESCE(
		           NULLIF(v.display_name, ''),
		           (SELECT vi.display_name FROM viewer_identities vi
		            WHERE vi.viewer_id = v.id ORDER BY vi.last_seen_at DESC LIMIT 1),
		           (SELECT vi.username FROM viewer_identities vi
		            WHERE vi.viewer_id = v.id ORDER BY vi.last_seen_at DESC LIMIT 1),
		           ''
		       ),
		       e.award_id, e.reward_name, e.points, e.created_at
		FROM interaction_events e
		JOIN viewers v ON v.id = e.viewer_id
		`+where+`
		ORDER BY e.created_at DESC, e.id DESC
		LIMIT ?`, args...)
	if err != nil {
		return RewardHistoryPage{}, errors.Errorf("list reward history: %w", err)
	}
	defer func() { _ = rows.Close() }()

	entries := make([]RewardHistoryEntry, 0, limit)
	for rows.Next() {
		var entry RewardHistoryEntry
		var createdAtRaw string
		if scanErr := rows.Scan(
			&entry.ID,
			&entry.Kind,
			&entry.ViewerID,
			&entry.ViewerDisplayName,
			&entry.RewardID,
			&entry.RewardName,
			&entry.Points,
			&createdAtRaw,
		); scanErr != nil {
			return RewardHistoryPage{}, errors.Errorf("scan reward history: %w", scanErr)
		}
		createdAt, parseErr := parseTime(createdAtRaw)
		if parseErr != nil {
			return RewardHistoryPage{}, parseErr
		}
		entry.CreatedAt = createdAt
		entries = append(entries, entry)
	}
	if rowsErr := rows.Err(); rowsErr != nil {
		return RewardHistoryPage{}, errors.Errorf("iterate reward history: %w", rowsErr)
	}

	page := RewardHistoryPage{Entries: entries}
	if len(entries) <= limit {
		return page, nil
	}

	entries = entries[:limit]
	page.Entries = entries
	page.NextCursor, err = encodeRewardHistoryCursor(entries[len(entries)-1])
	if err != nil {
		return RewardHistoryPage{}, err
	}
	return page, nil
}

func rewardHistoryLimit(limit int) (int, error) {
	if limit == 0 {
		return defaultRewardHistoryLimit, nil
	}
	if limit < 1 || limit > maxRewardHistoryLimit {
		return 0, ErrInvalidRewardHistoryLimit
	}
	return limit, nil
}

func encodeRewardHistoryCursor(entry RewardHistoryEntry) (string, error) {
	payload, err := json.Marshal(rewardHistoryCursor{
		Version:   1,
		CreatedAt: formatInteractionEventTime(entry.CreatedAt),
		ID:        entry.ID,
	})
	if err != nil {
		return "", errors.Errorf("encode reward history cursor: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(payload), nil
}

func decodeRewardHistoryCursor(encoded string) (*rewardHistoryCursor, error) {
	encoded = strings.TrimSpace(encoded)
	if encoded == "" {
		return nil, nil
	}
	if len(encoded) > maxRewardHistoryCursorLen {
		return nil, ErrInvalidRewardHistoryCursor
	}
	payload, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, ErrInvalidRewardHistoryCursor
	}
	var cursor rewardHistoryCursor
	if unmarshalErr := json.Unmarshal(payload, &cursor); unmarshalErr != nil {
		return nil, ErrInvalidRewardHistoryCursor
	}
	if cursor.Version != 1 || strings.TrimSpace(cursor.ID) == "" || len(cursor.ID) > 128 {
		return nil, ErrInvalidRewardHistoryCursor
	}
	createdAt, err := time.Parse(time.RFC3339Nano, cursor.CreatedAt)
	if err != nil || formatInteractionEventTime(createdAt) != cursor.CreatedAt {
		return nil, ErrInvalidRewardHistoryCursor
	}
	return &cursor, nil
}

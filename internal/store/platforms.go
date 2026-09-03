package store

import (
	"sort"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

type platformIdentityRow struct {
	Platform   string
	LastSeenAt time.Time
}

func uniquePlatforms(lastSeenPlatform string, rows []platformIdentityRow) []string {
	if len(rows) == 0 {
		return []string{}
	}

	sorted := append([]platformIdentityRow(nil), rows...)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].LastSeenAt.After(sorted[j].LastSeenAt)
	})

	seen := make(map[string]struct{})
	result := make([]string, 0, len(sorted))

	if lastSeenPlatform != "" {
		for _, row := range sorted {
			if row.Platform == lastSeenPlatform {
				result = append(result, lastSeenPlatform)
				seen[lastSeenPlatform] = struct{}{}
				break
			}
		}
	}

	for _, row := range sorted {
		if _, ok := seen[row.Platform]; ok {
			continue
		}
		seen[row.Platform] = struct{}{}
		result = append(result, row.Platform)
	}

	return result
}

func platformRowsFromIdentities(identities []Identity) []platformIdentityRow {
	rows := make([]platformIdentityRow, 0, len(identities))
	for _, identity := range identities {
		rows = append(rows, platformIdentityRow{
			Platform:   identity.Platform,
			LastSeenAt: identity.LastSeenAt,
		})
	}

	return rows
}

func (s *Store) attachPlatformsLocked(viewers []Viewer) error {
	if len(viewers) == 0 {
		return nil
	}

	placeholders := make([]string, len(viewers))
	args := make([]any, len(viewers))
	viewerIndex := make(map[string]int, len(viewers))
	for i, viewer := range viewers {
		placeholders[i] = "?"
		args[i] = viewer.ID
		viewerIndex[viewer.ID] = i
	}

	query := `
		SELECT viewer_id, platform, last_seen_at
		FROM viewer_identities
		WHERE viewer_id IN (` + strings.Join(placeholders, ",") + `)`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return errors.Errorf("load viewer platforms: %w", err)
	}
	defer func() { _ = rows.Close() }()

	grouped := make(map[string][]platformIdentityRow, len(viewers))
	for rows.Next() {
		var viewerID string
		var platform string
		var lastSeenRaw string
		if err := rows.Scan(&viewerID, &platform, &lastSeenRaw); err != nil {
			return errors.Errorf("scan viewer platform row: %w", err)
		}

		lastSeenAt, err := parseTime(lastSeenRaw)
		if err != nil {
			return errors.Errorf("parse viewer platform last_seen_at: %w", err)
		}

		grouped[viewerID] = append(grouped[viewerID], platformIdentityRow{
			Platform:   platform,
			LastSeenAt: lastSeenAt,
		})
	}
	if err := rows.Err(); err != nil {
		return errors.Errorf("iterate viewer platform rows: %w", err)
	}

	for viewerID, index := range viewerIndex {
		viewers[index].Platforms = uniquePlatforms(viewers[index].LastSeen.Platform, grouped[viewerID])
	}

	return nil
}

func attachPlatformsFromIdentities(viewer *Viewer) {
	if viewer == nil {
		return
	}

	viewer.Platforms = uniquePlatforms(viewer.LastSeen.Platform, platformRowsFromIdentities(viewer.Identities))
}

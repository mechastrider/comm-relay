package store

import (
	"sort"

	"github.com/muonsoft/errors"
)

// ViewerProgressionLevels resolves a directory snapshot's all-time XP against
// one level-catalog snapshot, without issuing queries for each viewer.
func (s *Store) ViewerProgressionLevels(viewers []Viewer) (map[string]ProgressionLevel, error) {
	result := make(map[string]ProgressionLevel, len(viewers))
	if len(viewers) == 0 {
		return result, nil
	}
	levels, err := s.ListProgressionLevels()
	if err != nil {
		return nil, errors.Errorf("load directory progression levels: %w", err)
	}
	for _, viewer := range viewers {
		// The catalog is ordered by threshold, then id. The last qualified
		// entry matches the single-viewer query's descending tie-break.
		index := sort.Search(len(levels), func(i int) bool {
			return levels[i].MinXP > viewer.XP
		}) - 1
		if index < 0 {
			return nil, ErrProgressionLevelNotFound
		}
		result[viewer.ID] = levels[index]
	}
	return result, nil
}

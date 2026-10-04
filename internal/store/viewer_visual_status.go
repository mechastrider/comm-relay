package store

import (
	"database/sql"
	"strings"

	"github.com/muonsoft/errors"
)

// ViewerStatusIdentity identifies a platform account without creating it.
type ViewerStatusIdentity struct {
	Platform string `json:"platform"`
	UserID   string `json:"user_id"`
}

// ViewerVisualStatus is a coherent snapshot of a canonical viewer's display state.
type ViewerVisualStatus struct {
	Identity      ViewerStatusIdentity
	ViewerID      string
	SessionID     string
	Level         ProgressionLevel
	LikeRemaining int
	BuffRemaining int
}

// ViewerVisualStatuses reads at most 100 identities under one store lock. Unknown
// identities are omitted; presentation reads never create viewers or spend uses.
func (s *Store) ViewerVisualStatuses(identities []ViewerStatusIdentity) ([]ViewerVisualStatus, error) {
	if len(identities) > 100 {
		return nil, ErrProgressionValidation
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]ViewerVisualStatus, 0, len(identities))
	cache := make(map[string]ViewerVisualStatus)
	for _, identity := range identities {
		identity.Platform = strings.TrimSpace(identity.Platform)
		identity.UserID = strings.TrimSpace(identity.UserID)
		var viewerID string
		err := s.db.QueryRow(`SELECT i.viewer_id FROM viewer_identities i JOIN viewers v ON v.id = i.viewer_id WHERE i.platform = ? AND i.user_id = ? AND v.hidden = 0`, identity.Platform, identity.UserID).Scan(&viewerID)
		if errors.Is(err, sql.ErrNoRows) {
			continue
		}
		if err != nil {
			return nil, errors.Errorf("resolve visual status identity: %w", err)
		}
		status, ok := cache[viewerID]
		if !ok {
			status, err = s.viewerVisualStatusLocked(viewerID)
			if err != nil {
				return nil, err
			}
			cache[viewerID] = status
		}
		status.Identity = identity
		result = append(result, status)
	}
	return result, nil
}

// ViewerVisualStatusByID reads current level and remaining uses for viewer detail.
func (s *Store) ViewerVisualStatusByID(viewerID string) (ViewerVisualStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := loadVisibleViewer(s.db, viewerID); err != nil {
		return ViewerVisualStatus{}, err
	}
	return s.viewerVisualStatusLocked(viewerID)
}

func (s *Store) viewerVisualStatusLocked(viewerID string) (ViewerVisualStatus, error) {
	status := ViewerVisualStatus{ViewerID: viewerID}
	var xp int
	if err := s.db.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, viewerID).Scan(&xp); err != nil {
		return status, errors.Errorf("read visual status xp: %w", err)
	}
	level, err := progressionLevelAtXP(s.db, xp)
	if err != nil {
		return status, errors.Errorf("read visual status level: %w", err)
	}
	status.Level = *level
	sessionID, err := s.openSessionLocked()
	if err != nil {
		return status, errors.Errorf("read visual status session: %w", err)
	}
	status.SessionID = sessionID
	likeUses, err := s.socialUsesLocked(s.db, sessionID, viewerID, true)
	if err != nil {
		return status, err
	}
	buffUses, err := s.socialUsesLocked(s.db, sessionID, viewerID, false)
	if err != nil {
		return status, err
	}
	status.LikeRemaining = max(0, level.LikeQuota-likeUses)
	status.BuffRemaining = max(0, level.BuffQuota-buffUses)
	return status, nil
}

func validLevelEmblem(emblem string) bool {
	switch emblem {
	case "", "shield", "chevron_1", "chevron_2", "chevron_3", "star", "laurel":
		return true
	default:
		return false
	}
}

func starterLevelEmblem(id string) string {
	switch id {
	case "recruit":
		return "chevron_1"
	case "regular":
		return "chevron_2"
	case "veteran":
		return "chevron_3"
	case "elite":
		return "star"
	case "legend":
		return "laurel"
	default:
		return "shield"
	}
}

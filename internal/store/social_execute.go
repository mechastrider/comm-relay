package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/nicks"
)

const socialOutcomeFired = "fired"
const socialOutcomeRejected = "rejected"

// sqlExcludePeerLikeAwards filters award interaction_events produced by successful like commands.
func sqlExcludePeerLikeAwards(eventTable string) string {
	return `
	AND NOT EXISTS (
		SELECT 1 FROM commands c
		WHERE c.id = ` + eventTable + `.command_id AND c.action = ?
	)`
}

// SocialCommandInput describes one like or buff attempt after cooldown passed.
type SocialCommandInput struct {
	GiverIdentity          ChatIdentity
	Command                Command
	Remainder              string
	MessagePlatform        string
	MessageID              string
	DayResetHour           int
	BuffsPerAwardPerViewer int
	BuffMaxUniqueViewers   int
	Now                    time.Time
}

// SocialCommandResult is the durable outcome of a social command attempt.
type SocialCommandResult struct {
	Status               string
	RejectReason         string
	LikeGrant            *ApplyAwardResult
	RecipientViewerID    string
	RecipientIdentity    ChatIdentity
	GiverProgression     ProgressionResultBundle
	RecipientProgression ProgressionResultBundle
	MeaningfulRankChange bool
	BuffPoints           int
}

type operatorAwardTarget struct {
	EventID   string
	ViewerID  string
	AwardID   string
	AwardName string
	Points    int
}

// ExecuteSocialCommand validates and applies a like or buff under the store mutex.
func (s *Store) ExecuteSocialCommand(input SocialCommandInput) (SocialCommandResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureOpenSessionLocked(input.Now); err != nil {
		return SocialCommandResult{}, errors.Errorf("ensure open session: %w", err)
	}

	switch input.Command.Action {
	case CommandActionLike:
		return s.executeLikeLocked(input)
	case CommandActionBuff:
		return s.executeBuffLocked(input)
	default:
		return SocialCommandResult{}, errors.New("unsupported social command action")
	}
}

func (s *Store) executeLikeLocked(input SocialCommandInput) (SocialCommandResult, error) {
	reject := func(reason string) SocialCommandResult {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: reason}
	}

	remainder := nicks.PrepareRemainder(input.Remainder)
	if remainder == "" {
		return reject("missing_arg"), nil
	}

	award, err := s.getAwardLocked(strings.TrimSpace(input.Command.AwardID))
	if err != nil {
		if errors.Is(err, ErrAwardNotFound) {
			return reject("no_award"), nil
		}
		return SocialCommandResult{}, err
	}

	candidates, err := s.sessionNickCandidatesLocked()
	if err != nil {
		return SocialCommandResult{}, err
	}
	recipientID, nickReason := nicks.ResolveNick(remainder, input.MessagePlatform, candidates)
	switch nickReason {
	case nicks.ResolveAmbiguous:
		return reject("ambiguous"), nil
	case nicks.ResolveNotFound:
		return reject("not_found"), nil
	}

	giverID, err := s.viewerIDForIdentityLocked(input.GiverIdentity.Platform, input.GiverIdentity.UserID)
	if err != nil {
		return SocialCommandResult{}, err
	}
	if giverID == "" {
		return SocialCommandResult{}, errors.New("giver viewer id missing")
	}
	if recipientID == giverID {
		return reject("self"), nil
	}

	if ok, quotaErr := s.socialQuotaAvailableLocked(nil, giverID, true); quotaErr != nil {
		return SocialCommandResult{}, quotaErr
	} else if !ok {
		return reject("quota"), nil
	}

	return s.commitLikeLocked(input, giverID, recipientID, award)
}

func (s *Store) executeBuffLocked(input SocialCommandInput) (SocialCommandResult, error) {
	reject := func(reason string) SocialCommandResult {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: reason}
	}

	if input.BuffMaxUniqueViewers == 0 {
		return reject("award_full"), nil
	}

	giverID, err := s.viewerIDForIdentityLocked(input.GiverIdentity.Platform, input.GiverIdentity.UserID)
	if err != nil {
		return SocialCommandResult{}, err
	}
	if giverID == "" {
		return SocialCommandResult{}, errors.New("giver viewer id missing")
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("lookup open session: %w", err)
	}

	var target *operatorAwardTarget
	remainder := nicks.PrepareRemainder(input.Remainder)
	if remainder == "" {
		target, err = s.latestOperatorAwardLocked(sessionID, "")
	} else {
		candidates, candidateErr := s.sessionNickCandidatesLocked()
		if candidateErr != nil {
			return SocialCommandResult{}, candidateErr
		}
		recipientID, nickReason := nicks.ResolveNick(remainder, input.MessagePlatform, candidates)
		switch nickReason {
		case nicks.ResolveAmbiguous:
			return reject("ambiguous"), nil
		case nicks.ResolveNotFound:
			return reject("not_found"), nil
		}
		target, err = s.latestOperatorAwardLocked(sessionID, recipientID)
	}
	if err != nil {
		return SocialCommandResult{}, err
	}
	if target == nil {
		return reject("no_award"), nil
	}
	if target.ViewerID == giverID {
		return reject("self"), nil
	}

	if atCap, capErr := s.viewerBuffCountAtCapLocked(sessionID, target.EventID, giverID, input.BuffsPerAwardPerViewer); capErr != nil {
		return SocialCommandResult{}, capErr
	} else if atCap {
		return reject("already_buffed"), nil
	}

	if full, capErr := s.awardBuffUniqueCapFullLocked(sessionID, target.EventID, input.BuffMaxUniqueViewers, giverID); capErr != nil {
		return SocialCommandResult{}, capErr
	} else if full {
		return reject("award_full"), nil
	}

	if ok, quotaErr := s.socialQuotaAvailableLocked(nil, giverID, false); quotaErr != nil {
		return SocialCommandResult{}, quotaErr
	} else if !ok {
		return reject("quota"), nil
	}

	points := 0
	if input.Command.Points != nil {
		points = *input.Command.Points
	}
	if points < minCommandBuffPoints {
		return reject("no_award"), nil
	}

	return s.commitBuffLocked(input, giverID, target, points)
}

func (s *Store) viewerIDForIdentityLocked(platform, userID string) (string, error) {
	platform = strings.TrimSpace(platform)
	userID = strings.TrimSpace(userID)
	if platform == "" || userID == "" {
		return "", nil
	}
	var viewerID string
	err := s.db.QueryRow(
		`SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?`,
		platform,
		userID,
	).Scan(&viewerID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", errors.Errorf("lookup giver viewer id: %w", err)
	}
	return viewerID, nil
}

func (s *Store) sessionNickCandidatesLocked() ([]nicks.Candidate, error) {
	sessionID, err := s.openSessionLocked()
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, errors.Errorf("lookup open session for nick candidates: %w", err)
	}

	rows, err := s.db.Query(`
		SELECT v.id, v.display_name, vi.platform, vi.username, vi.display_name
		FROM viewers v
		INNER JOIN viewer_identities vi ON vi.viewer_id = v.id
		WHERE v.hidden = 0
		  AND (
		    EXISTS (
		      SELECT 1 FROM viewer_session_stats vss
		      WHERE vss.viewer_id = v.id AND vss.session_id = ? AND vss.message_count > 0
		    )
		    OR EXISTS (
		      SELECT 1 FROM interaction_events ie
		      WHERE ie.viewer_id = v.id AND ie.session_id = ? AND ie.kind = 'award'`+sqlExcludePeerLikeAwards("ie")+`
		    )
		  )`, sessionID, sessionID, CommandActionLike)
	if err != nil {
		return nil, errors.Errorf("list session nick candidate viewers: %w", err)
	}
	defer func() { _ = rows.Close() }()

	type acc struct {
		keys      map[string]struct{}
		platforms map[string]struct{}
	}
	byViewer := make(map[string]*acc)
	displayOverride := make(map[string]sql.NullString)

	for rows.Next() {
		var viewerID, platform, username, identityDisplay string
		var override sql.NullString
		if scanErr := rows.Scan(&viewerID, &override, &platform, &username, &identityDisplay); scanErr != nil {
			return nil, errors.Errorf("scan session nick candidate row: %w", scanErr)
		}
		if _, ok := byViewer[viewerID]; !ok {
			byViewer[viewerID] = &acc{keys: make(map[string]struct{}), platforms: make(map[string]struct{})}
			displayOverride[viewerID] = override
		}
		entry := byViewer[viewerID]
		platform = strings.ToLower(strings.TrimSpace(platform))
		if platform != "" {
			entry.platforms[platform] = struct{}{}
		}
		for _, raw := range []string{username, identityDisplay} {
			key := nicks.NormalizeKey(raw)
			if key != "" {
				entry.keys[key] = struct{}{}
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate session nick candidate rows: %w", err)
	}

	candidates := make([]nicks.Candidate, 0, len(byViewer))
	for viewerID, entry := range byViewer {
		if override, ok := displayOverride[viewerID]; ok && override.Valid {
			if key := nicks.NormalizeKey(override.String); key != "" {
				entry.keys[key] = struct{}{}
			}
		}
		if len(entry.keys) == 0 {
			continue
		}
		keys := make([]string, 0, len(entry.keys))
		for key := range entry.keys {
			keys = append(keys, key)
		}
		candidates = append(candidates, nicks.Candidate{
			ViewerID:  viewerID,
			Keys:      keys,
			Platforms: entry.platforms,
		})
	}
	return candidates, nil
}

func (s *Store) latestOperatorAwardLocked(sessionID, viewerID string) (*operatorAwardTarget, error) {
	query := `
		SELECT id, viewer_id, award_id, reward_name, points
		FROM interaction_events
		WHERE session_id = ? AND kind = 'award'` + sqlExcludePeerLikeAwards("interaction_events")
	args := []any{sessionID, CommandActionLike}
	if strings.TrimSpace(viewerID) != "" {
		query += ` AND viewer_id = ?`
		args = append(args, viewerID)
	}
	query += ` ORDER BY created_at DESC, id DESC LIMIT 1`

	var target operatorAwardTarget
	err := s.db.QueryRow(query, args...).Scan(
		&target.EventID,
		&target.ViewerID,
		&target.AwardID,
		&target.AwardName,
		&target.Points,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, errors.Errorf("lookup latest operator award: %w", err)
	}
	if !s.operatorAwardEventValidLocked(target.EventID, sessionID) {
		return nil, nil
	}
	return &target, nil
}

func (s *Store) operatorAwardEventValidLocked(eventID, sessionID string) bool {
	var id string
	err := s.db.QueryRow(`
		SELECT id FROM interaction_events
		WHERE id = ? AND session_id = ? AND kind = 'award'`+sqlExcludePeerLikeAwards("interaction_events"),
		eventID, sessionID, CommandActionLike,
	).Scan(&id)
	return err == nil
}

func (s *Store) viewerBuffCountAtCapLocked(sessionID, parentEventID, giverID string, perViewerCap int) (bool, error) {
	if perViewerCap <= 0 {
		return true, nil
	}
	if !s.operatorAwardEventValidLocked(parentEventID, sessionID) {
		return false, nil
	}
	count, err := s.viewerBuffCountOnParentLocked(sessionID, parentEventID, giverID)
	if err != nil {
		return false, err
	}
	return count >= perViewerCap, nil
}

func (s *Store) viewerBuffCountOnParentLocked(sessionID, parentEventID, giverID string) (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM interaction_events
		WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ? AND viewer_id = ?`,
		sessionID, parentEventID, giverID,
	).Scan(&count)
	if err != nil {
		return 0, errors.Errorf("count viewer buffs on award: %w", err)
	}
	return count, nil
}

func (s *Store) awardBuffUniqueCapFullLocked(sessionID, parentEventID string, maxUnique int, giverID string) (bool, error) {
	if maxUnique <= 0 {
		return true, nil
	}
	if !s.operatorAwardEventValidLocked(parentEventID, sessionID) {
		return true, nil
	}
	var distinct int
	err := s.db.QueryRow(`
		SELECT COUNT(DISTINCT viewer_id) FROM interaction_events
		WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ?`,
		sessionID, parentEventID,
	).Scan(&distinct)
	if err != nil {
		return false, errors.Errorf("count distinct buff viewers: %w", err)
	}
	if distinct >= maxUnique {
		var already int
		err = s.db.QueryRow(`
			SELECT COUNT(*) FROM interaction_events
			WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ? AND viewer_id = ?`,
			sessionID, parentEventID, giverID,
		).Scan(&already)
		if err != nil {
			return false, errors.Errorf("lookup giver buff membership: %w", err)
		}
		return already == 0, nil
	}
	return false, nil
}

func (s *Store) socialQuotaAvailableLocked(tx *sql.Tx, giverID string, like bool) (bool, error) {
	q := rowQuerier(s.db)
	if tx != nil {
		q = tx
	}
	var xp int
	if err := q.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, giverID).Scan(&xp); err != nil {
		return false, errors.Errorf("read giver xp for social quota: %w", err)
	}
	level, err := progressionLevelAtXP(q, xp)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, errors.Errorf("resolve giver level for social quota: %w", err)
	}
	quota := level.BuffQuota
	if like {
		quota = level.LikeQuota
	}
	if quota <= 0 {
		return false, nil
	}

	sessionID, err := s.openSessionQuerierLocked(q)
	if err != nil {
		return false, errors.Errorf("lookup open session for social quota: %w", err)
	}

	uses, err := s.socialUsesLocked(q, sessionID, giverID, like)
	if err != nil {
		return false, err
	}
	return uses < quota, nil
}

func (s *Store) socialUsesLocked(q rowQuerier, sessionID, giverID string, like bool) (int, error) {
	var uses int
	var err error
	if like {
		err = q.QueryRow(`
			SELECT COUNT(*) FROM interaction_events ie
			INNER JOIN commands c ON c.id = ie.command_id
			WHERE ie.session_id = ? AND ie.viewer_id = ? AND ie.kind = 'command' AND c.action = ?`,
			sessionID, giverID, CommandActionLike,
		).Scan(&uses)
	} else {
		err = q.QueryRow(`
			SELECT COUNT(*) FROM interaction_events
			WHERE session_id = ? AND viewer_id = ? AND kind = 'buff'`,
			sessionID, giverID,
		).Scan(&uses)
	}
	if err != nil {
		return 0, errors.Errorf("count social uses: %w", err)
	}
	return uses, nil
}

func (s *Store) commitLikeLocked(input SocialCommandInput, giverID, recipientID string, award *AwardType) (SocialCommandResult, error) {
	identity, err := s.primaryIdentityLocked(recipientID)
	if err != nil {
		return SocialCommandResult{}, err
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("lookup open session: %w", err)
	}
	dayKey := DayKey(input.Now, input.DayResetHour)

	tx, err := s.db.Begin()
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("begin like transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if ok, quotaErr := s.socialQuotaAvailableLocked(tx, giverID, true); quotaErr != nil {
		return SocialCommandResult{}, quotaErr
	} else if !ok {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: "quota"}, nil
	}

	beforeRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return SocialCommandResult{}, err
	}

	var previousXP int
	if queryErr := tx.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, recipientID).Scan(&previousXP); queryErr != nil {
		return SocialCommandResult{}, errors.Errorf("read recipient xp before like: %w", queryErr)
	}

	points := award.Points
	if _, execErr := tx.Exec(
		`UPDATE viewers SET xp = xp + ?, last_seen_at = ? WHERE id = ?`,
		points, formatTime(input.Now), recipientID,
	); execErr != nil {
		return SocialCommandResult{}, errors.Errorf("increment recipient xp for like: %w", execErr)
	}
	if err = s.addPeriodXPLocked(tx, recipientID, sessionID, dayKey, points); err != nil {
		return SocialCommandResult{}, err
	}

	awardEvent := AppendInteractionEventInput{
		Kind:      InteractionEventAward,
		ViewerID:  recipientID,
		CommandID: input.Command.ID,
		AwardID:   award.ID,
		AwardName: award.Name,
		Points:    points,
		Now:       input.Now,
	}
	if appendErr := s.appendInteractionEventLocked(tx, awardEvent); appendErr != nil {
		return SocialCommandResult{}, appendErr
	}

	commandEvent := AppendInteractionEventInput{
		Kind:           InteractionEventCommand,
		ViewerID:       giverID,
		CommandID:      input.Command.ID,
		CommandTrigger: input.Command.Trigger,
		Points:         0,
		Now:            input.Now,
	}
	if appendErr := s.appendInteractionEventLocked(tx, commandEvent); appendErr != nil {
		return SocialCommandResult{}, appendErr
	}

	progressionResults := make([]ProgressionEvaluationResult, 0, 3)
	xpResult, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{
		ViewerID: recipientID, CauseMetric: ProgressionMetricXP,
		PreviousXP: previousXP, HasPreviousXP: true, Now: input.Now,
	})
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("evaluate like recipient xp progression: %w", err)
	}
	progressionResults = append(progressionResults, xpResult)
	awardResult, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{
		ViewerID: recipientID, CauseMetric: ProgressionMetricAwardCount, Now: input.Now,
	})
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("evaluate like award-count progression: %w", err)
	}
	progressionResults = append(progressionResults, awardResult)
	giverResult, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{
		ViewerID: giverID, CauseMetric: ProgressionMetricCommandCount, Now: input.Now,
	})
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("evaluate like giver command progression: %w", err)
	}

	afterRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return SocialCommandResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return SocialCommandResult{}, errors.Errorf("commit like transaction: %w", err)
	}

	return SocialCommandResult{
		Status:               socialOutcomeFired,
		RecipientViewerID:    recipientID,
		RecipientIdentity:    identity,
		LikeGrant:            &ApplyAwardResult{ViewerID: recipientID, Username: identity.Username, DisplayName: identity.DisplayName, AvatarURL: identity.AvatarURL, MeaningfulRankChange: topThreeChanged(beforeRanks, afterRanks), Progression: newProgressionResultBundle(progressionResults...)},
		GiverProgression:     newProgressionResultBundle(giverResult),
		RecipientProgression: newProgressionResultBundle(progressionResults...),
		MeaningfulRankChange: topThreeChanged(beforeRanks, afterRanks),
	}, nil
}

func (s *Store) commitBuffLocked(input SocialCommandInput, giverID string, target *operatorAwardTarget, points int) (SocialCommandResult, error) {
	identity, err := s.primaryIdentityLocked(target.ViewerID)
	if err != nil {
		return SocialCommandResult{}, err
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("lookup open session: %w", err)
	}
	dayKey := DayKey(input.Now, input.DayResetHour)

	tx, err := s.db.Begin()
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("begin buff transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if ok, quotaErr := s.socialQuotaAvailableLocked(tx, giverID, false); quotaErr != nil {
		return SocialCommandResult{}, quotaErr
	} else if !ok {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: "quota"}, nil
	}

	if atCap, capErr := s.viewerBuffCountAtCapTxLocked(tx, sessionID, target.EventID, giverID, input.BuffsPerAwardPerViewer); capErr != nil {
		return SocialCommandResult{}, capErr
	} else if atCap {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: "already_buffed"}, nil
	}
	if full, capErr := s.awardBuffUniqueCapFullTxLocked(tx, sessionID, target.EventID, input.BuffMaxUniqueViewers, giverID); capErr != nil {
		return SocialCommandResult{}, capErr
	} else if full {
		return SocialCommandResult{Status: socialOutcomeRejected, RejectReason: "award_full"}, nil
	}

	beforeRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return SocialCommandResult{}, err
	}

	var previousXP int
	if queryErr := tx.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, target.ViewerID).Scan(&previousXP); queryErr != nil {
		return SocialCommandResult{}, errors.Errorf("read recipient xp before buff: %w", queryErr)
	}

	if _, execErr := tx.Exec(
		`UPDATE viewers SET xp = xp + ?, last_seen_at = ? WHERE id = ?`,
		points, formatTime(input.Now), target.ViewerID,
	); execErr != nil {
		return SocialCommandResult{}, errors.Errorf("increment recipient xp for buff: %w", execErr)
	}
	if err = s.addPeriodXPLocked(tx, target.ViewerID, sessionID, dayKey, points); err != nil {
		return SocialCommandResult{}, err
	}

	buffEvent := AppendInteractionEventInput{
		Kind:              InteractionEventBuff,
		ViewerID:          giverID,
		RecipientViewerID: target.ViewerID,
		ParentEventID:     target.EventID,
		Points:            points,
		Now:               input.Now,
	}
	if appendErr := s.appendInteractionEventLocked(tx, buffEvent); appendErr != nil {
		return SocialCommandResult{}, appendErr
	}

	commandEvent := AppendInteractionEventInput{
		Kind:           InteractionEventCommand,
		ViewerID:       giverID,
		CommandID:      input.Command.ID,
		CommandTrigger: input.Command.Trigger,
		Points:         0,
		Now:            input.Now,
	}
	if appendErr := s.appendInteractionEventLocked(tx, commandEvent); appendErr != nil {
		return SocialCommandResult{}, appendErr
	}

	xpResult, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{
		ViewerID: target.ViewerID, CauseMetric: ProgressionMetricXP,
		PreviousXP: previousXP, HasPreviousXP: true, Now: input.Now,
	})
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("evaluate buff recipient xp progression: %w", err)
	}
	giverResult, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{
		ViewerID: giverID, CauseMetric: ProgressionMetricCommandCount, Now: input.Now,
	})
	if err != nil {
		return SocialCommandResult{}, errors.Errorf("evaluate buff giver command progression: %w", err)
	}

	afterRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return SocialCommandResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return SocialCommandResult{}, errors.Errorf("commit buff transaction: %w", err)
	}

	return SocialCommandResult{
		Status:               socialOutcomeFired,
		RecipientViewerID:    target.ViewerID,
		RecipientIdentity:    identity,
		BuffPoints:           points,
		GiverProgression:     newProgressionResultBundle(giverResult),
		RecipientProgression: newProgressionResultBundle(xpResult),
		MeaningfulRankChange: topThreeChanged(beforeRanks, afterRanks),
	}, nil
}

func (s *Store) primaryIdentityLocked(viewerID string) (ChatIdentity, error) {
	var identity ChatIdentity
	err := s.db.QueryRow(`
		SELECT platform, user_id, username, display_name, avatar_url
		FROM viewer_identities
		WHERE viewer_id = ?
		ORDER BY last_seen_at DESC
		LIMIT 1`, viewerID).Scan(
		&identity.Platform,
		&identity.UserID,
		&identity.Username,
		&identity.DisplayName,
		&identity.AvatarURL,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ChatIdentity{}, errors.New("recipient identity not found")
	}
	if err != nil {
		return ChatIdentity{}, errors.Errorf("load recipient identity: %w", err)
	}
	return identity, nil
}

func (s *Store) viewerBuffCountAtCapTxLocked(tx *sql.Tx, sessionID, parentEventID, giverID string, perViewerCap int) (bool, error) {
	if perViewerCap <= 0 {
		return true, nil
	}
	var count int
	err := tx.QueryRow(`
		SELECT COUNT(*) FROM interaction_events
		WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ? AND viewer_id = ?`,
		sessionID, parentEventID, giverID,
	).Scan(&count)
	if err != nil {
		return false, errors.Errorf("count viewer buffs on award in tx: %w", err)
	}
	return count >= perViewerCap, nil
}

func (s *Store) awardBuffUniqueCapFullTxLocked(tx *sql.Tx, sessionID, parentEventID string, maxUnique int, giverID string) (bool, error) {
	if maxUnique <= 0 {
		return true, nil
	}
	var distinct int
	err := tx.QueryRow(`
		SELECT COUNT(DISTINCT viewer_id) FROM interaction_events
		WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ?`,
		sessionID, parentEventID,
	).Scan(&distinct)
	if err != nil {
		return false, errors.Errorf("count distinct buff viewers in tx: %w", err)
	}
	if distinct >= maxUnique {
		var already int
		err = tx.QueryRow(`
			SELECT COUNT(*) FROM interaction_events
			WHERE session_id = ? AND kind = 'buff' AND parent_event_id = ? AND viewer_id = ?`,
			sessionID, parentEventID, giverID,
		).Scan(&already)
		if err != nil {
			return false, errors.Errorf("lookup giver buff membership in tx: %w", err)
		}
		return already == 0, nil
	}
	return false, nil
}

package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

type execQuerier interface {
	Exec(query string, args ...any) (sql.Result, error)
}

// InteractionEventKind is the persisted interaction event category.
type InteractionEventKind string

const (
	// InteractionEventCommand records a successful chat command fire.
	InteractionEventCommand InteractionEventKind = "command"
	// InteractionEventAward records a successful operator award grant.
	InteractionEventAward InteractionEventKind = "award"
)

// InteractionEvent is a persisted command fire or operator award grant.
type InteractionEvent struct {
	ID              string
	Kind            InteractionEventKind
	ViewerID        string
	CommandTrigger  string
	AwardID         string
	Points          int
	MessagePlatform string
	MessageID       string
	CreatedAt       time.Time
}

// AppendInteractionEventInput describes one append-only interaction event.
type AppendInteractionEventInput struct {
	Kind            InteractionEventKind
	ViewerID        string
	CommandTrigger  string
	AwardID         string
	Points          int
	MessagePlatform string
	MessageID       string
	Now             time.Time
}

// ViewerIDForIdentity returns the canonical viewer id for a platform identity when known.
func (s *Store) ViewerIDForIdentity(platform, userID string) (string, bool) {
	platform = strings.TrimSpace(platform)
	userID = strings.TrimSpace(userID)
	if platform == "" || userID == "" {
		return "", false
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	var viewerID string
	err := s.db.QueryRow(
		`SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?`,
		platform,
		userID,
	).Scan(&viewerID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	if err != nil {
		return "", false
	}

	return viewerID, true
}

// AppendInteractionEvent inserts one interaction event under the store mutex.
func (s *Store) AppendInteractionEvent(input AppendInteractionEventInput) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.appendInteractionEventLocked(s.db, input)
}

func (s *Store) appendInteractionEventLocked(q execQuerier, input AppendInteractionEventInput) error {
	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}

	var viewerID any
	if strings.TrimSpace(input.ViewerID) != "" {
		viewerID = input.ViewerID
	}

	var commandTrigger, awardID, messagePlatform, messageID any
	points := input.Points

	switch input.Kind {
	case InteractionEventCommand:
		commandTrigger = strings.TrimSpace(input.CommandTrigger)
		if commandTrigger == "" {
			return errors.New("command trigger is required for command events")
		}
		awardID = nil
		messagePlatform = nil
		messageID = nil
		points = 0
	case InteractionEventAward:
		awardID = strings.TrimSpace(input.AwardID)
		if awardID == "" {
			return errors.New("award id is required for award events")
		}
		commandTrigger = nil
		if strings.TrimSpace(input.MessagePlatform) != "" {
			messagePlatform = strings.TrimSpace(input.MessagePlatform)
		}
		if strings.TrimSpace(input.MessageID) != "" {
			messageID = strings.TrimSpace(input.MessageID)
		}
	default:
		return errors.Errorf("unsupported interaction event kind %q", input.Kind)
	}

	id := uuid.NewString()
	createdAt := formatTime(now)
	if _, err := q.Exec(
		`INSERT INTO interaction_events (
			id, kind, viewer_id, command_trigger, award_id, points,
			message_platform, message_id, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id,
		string(input.Kind),
		viewerID,
		commandTrigger,
		awardID,
		points,
		messagePlatform,
		messageID,
		createdAt,
	); err != nil {
		return errors.Errorf("insert interaction event: %w", err)
	}

	return nil
}

// ListInteractionEventsByViewer returns events for one viewer ordered by created_at.
func (s *Store) ListInteractionEventsByViewer(viewerID string) ([]InteractionEvent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.listInteractionEventsLocked(`WHERE viewer_id = ?`, viewerID)
}

// CountInteractionEvents returns the total number of persisted interaction events.
func (s *Store) CountInteractionEvents() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM interaction_events`).Scan(&count)
	if err != nil {
		return 0, errors.Errorf("count interaction events: %w", err)
	}

	return count, nil
}

func (s *Store) listInteractionEventsLocked(whereClause string, args ...any) ([]InteractionEvent, error) {
	query := `
		SELECT id, kind, viewer_id, command_trigger, award_id, points,
		       message_platform, message_id, created_at
		FROM interaction_events ` + whereClause + ` ORDER BY created_at`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, errors.Errorf("list interaction events: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var events []InteractionEvent
	for rows.Next() {
		event, scanErr := scanInteractionEvent(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate interaction events: %w", err)
	}

	return events, nil
}

type interactionEventScanner interface {
	Scan(dest ...any) error
}

func scanInteractionEvent(row interactionEventScanner) (InteractionEvent, error) {
	var event InteractionEvent
	var viewerID, commandTrigger, awardID, messagePlatform, messageID sql.NullString
	var createdAtRaw string
	if err := row.Scan(
		&event.ID,
		&event.Kind,
		&viewerID,
		&commandTrigger,
		&awardID,
		&event.Points,
		&messagePlatform,
		&messageID,
		&createdAtRaw,
	); err != nil {
		return InteractionEvent{}, errors.Errorf("scan interaction event: %w", err)
	}

	if viewerID.Valid {
		event.ViewerID = viewerID.String
	}
	if commandTrigger.Valid {
		event.CommandTrigger = commandTrigger.String
	}
	if awardID.Valid {
		event.AwardID = awardID.String
	}
	if messagePlatform.Valid {
		event.MessagePlatform = messagePlatform.String
	}
	if messageID.Valid {
		event.MessageID = messageID.String
	}

	createdAt, err := parseTime(createdAtRaw)
	if err != nil {
		return InteractionEvent{}, err
	}
	event.CreatedAt = createdAt

	return event, nil
}

// QueryInteractionEventColumns returns interaction_events column names for tests.
func (s *Store) QueryInteractionEventColumns() ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`PRAGMA table_info(interaction_events)`)
	if err != nil {
		return nil, errors.Errorf("query interaction_events schema: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var columns []string
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var defaultValue any
		if err := rows.Scan(&cid, &name, &colType, &notNull, &defaultValue, &pk); err != nil {
			return nil, errors.Errorf("scan interaction_events schema row: %w", err)
		}
		columns = append(columns, name)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate interaction_events schema: %w", err)
	}

	return columns, nil
}

func (s *Store) rewriteInteractionEventsLocked(tx *sql.Tx, fromID, intoID string) error {
	if _, err := tx.Exec(
		`UPDATE interaction_events SET viewer_id = ? WHERE viewer_id = ?`,
		intoID,
		fromID,
	); err != nil {
		return errors.Errorf("rewrite interaction events viewer_id: %w", err)
	}

	return nil
}

package store

import (
	"database/sql"
	"embed"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
	"github.com/pressly/goose/v3"

	_ "modernc.org/sqlite" // register pure-Go SQLite driver
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

// Store is the local SQLite viewer stats database.
type Store struct {
	mu            sync.Mutex
	db            *sql.DB
	path          string
	openSessionID string
}

func sqliteDSN(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", errors.Errorf("resolve database path: %w", err)
	}

	dsn := "file:" + filepath.ToSlash(abs) +
		"?_pragma=busy_timeout(5000)" +
		"&_pragma=foreign_keys(1)" +
		"&_pragma=journal_mode(WAL)"

	return dsn, nil
}

// Open opens or creates the SQLite database at path, runs migrations, and ensures an open session.
func Open(path string) (*Store, error) {
	dsn, err := sqliteDSN(path)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, errors.Errorf("open sqlite database: %w", err)
	}
	db.SetMaxOpenConns(1)

	goose.SetBaseFS(embedMigrations)
	if err := goose.SetDialect("sqlite3"); err != nil {
		closeErr := db.Close()
		if closeErr != nil {
			return nil, errors.Errorf("set goose dialect: %w (close database: %w)", err, closeErr)
		}
		return nil, errors.Errorf("set goose dialect: %w", err)
	}

	if err := goose.Up(db, "migrations"); err != nil {
		closeErr := db.Close()
		if closeErr != nil {
			return nil, errors.Errorf("run migrations: %w (close database: %w)", err, closeErr)
		}
		return nil, errors.Errorf("run migrations: %w", err)
	}

	s := &Store{
		db:   db,
		path: path,
	}

	if err := s.ensureOpenSessionLocked(time.Now()); err != nil {
		closeErr := db.Close()
		if closeErr != nil {
			return nil, errors.Errorf("ensure open session: %w (close database: %w)", err, closeErr)
		}
		return nil, errors.Errorf("ensure open session: %w", err)
	}

	return s, nil
}

// Close closes the underlying database connection.
func (s *Store) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return nil
	}

	err := s.db.Close()
	s.db = nil
	if err != nil {
		return errors.Errorf("close sqlite database: %w", err)
	}

	return nil
}

func formatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func parseTime(raw string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return time.Time{}, errors.Errorf("parse time %q: %w", raw, err)
	}

	return t, nil
}

func (s *Store) openSessionLocked() (string, error) {
	if s.openSessionID != "" {
		return s.openSessionID, nil
	}

	var id string
	err := s.db.QueryRow(`SELECT id FROM stream_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1`).Scan(&id)
	if err == nil {
		s.openSessionID = id
		return id, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return "", sql.ErrNoRows
	}

	return "", errors.Errorf("query open session: %w", err)
}

func (s *Store) ensureOpenSessionLocked(now time.Time) error {
	_, err := s.openSessionLocked()
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return errors.Errorf("lookup open session: %w", err)
	}

	sessionID := uuid.NewString()
	startedAt := formatTime(now)
	if _, err := s.db.Exec(
		`INSERT INTO stream_sessions (id, started_at, ended_at) VALUES (?, ?, NULL)`,
		sessionID,
		startedAt,
	); err != nil {
		return errors.Errorf("insert open session: %w", err)
	}

	s.openSessionID = sessionID
	return nil
}

// EnsureOpenSession creates an open stream session when none exists.
func (s *Store) EnsureOpenSession(now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.ensureOpenSessionLocked(now)
}

// StartSession ends the current open session and starts a new empty one.
func (s *Store) StartSession(now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID, err := s.openSessionLocked()
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return s.ensureOpenSessionLocked(now)
		}
		return errors.Errorf("lookup open session: %w", err)
	}

	endedAt := formatTime(now)
	if _, err := s.db.Exec(`UPDATE stream_sessions SET ended_at = ? WHERE id = ?`, endedAt, sessionID); err != nil {
		return errors.Errorf("end current session: %w", err)
	}

	newSessionID := uuid.NewString()
	startedAt := formatTime(now)
	if _, err := s.db.Exec(
		`INSERT INTO stream_sessions (id, started_at, ended_at) VALUES (?, ?, NULL)`,
		newSessionID,
		startedAt,
	); err != nil {
		return errors.Errorf("insert new session: %w", err)
	}

	s.openSessionID = newSessionID
	return nil
}

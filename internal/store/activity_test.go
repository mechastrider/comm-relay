package store_test

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestApplyChat_WhenTwoLinesInsideInterval_ExpectMessageCountTwoAndXPOnce(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}

	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(identity, defaultActivity(), testDayResetHour, now.Add(30*time.Second)))

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, 2, viewer.MessageCount)
	assert.Equal(t, 1, viewer.XP)
	assert.Equal(t, 2, viewer.SessionMessageCount)
	assert.Equal(t, 1, viewer.SessionXP)
}

func TestApplyChat_WhenFirstLineWithDefaults_ExpectXPInAllWindows(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, 1, viewer.XP)
	assert.Equal(t, 1, viewer.SessionXP)
	assert.Equal(t, 1, viewer.DayXP)
}

func TestApplyChat_WhenSessionCapReached_ExpectMessageCountGrowsWithoutExtraXP(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	activity := store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 1}
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}

	for i := range 10 {
		require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now.Add(time.Duration(i)*2*time.Second)))
	}

	require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now.Add(30*time.Second)))

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, 11, viewer.MessageCount)
	assert.Equal(t, 10, viewer.XP)
}

func TestApplyChat_WhenActivityXPZero_ExpectCountedLinesNeverAddXP(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	activity := store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 0}

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, activity, testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, activity, testDayResetHour, now.Add(5*time.Second)))

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, 2, viewer.MessageCount)
	assert.Equal(t, 0, viewer.XP)
}

func TestApplyChat_WhenStoreReopened_ExpectSessionActivityCountersPersist(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)

	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	activity := store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 1}
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}

	for i := range 3 {
		require.NoError(t, s.ApplyChat(identity, activity, testDayResetHour, now.Add(time.Duration(i)*2*time.Second)))
	}
	require.NoError(t, s.Close())

	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })

	require.NoError(t, reopened.ApplyChat(identity, activity, testDayResetHour, now.Add(4*time.Second)))

	id := viewerID(t, reopened, "twitch", "42", testDayResetHour, now)
	viewer := getAt(t, reopened, id, testDayResetHour, now)
	assert.Equal(t, 4, viewer.MessageCount)
	assert.Equal(t, 3, viewer.XP)
}

func TestApplyChat_WhenActivityGrant_ExpectInteractionEventWithoutAlertKind(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))

	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	events, err := s.ListInteractionEventsByViewer(id)
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, store.InteractionEventActivity, events[0].Kind)
	assert.Equal(t, 1, events[0].Points)
}

func TestOpen_WhenPreMigrationScore42_ExpectXP42AfterMigrate(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)

	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrationsDir := filepath.Join(filepath.Dir(filename), "migrations")

	migration01, err := os.ReadFile(filepath.Join(migrationsDir, "00001_viewer_schema.sql"))
	require.NoError(t, err)
	migration02, err := os.ReadFile(filepath.Join(migrationsDir, "00002_commands_awards.sql"))
	require.NoError(t, err)

	for _, stmt := range splitGooseStatements(string(migration01)) {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		require.NoError(t, err)
	}
	for _, stmt := range splitGooseStatements(string(migration02)) {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		require.NoError(t, err)
	}

	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	_, err = db.Exec(
		`INSERT INTO viewers (id, display_name, message_count, score, last_seen_at, hidden, created_at)
		 VALUES ('viewer-1', 'Legacy', 1, 42, ?, 0, ?)`,
		now.UTC().Format(time.RFC3339),
		now.UTC().Format(time.RFC3339),
	)
	require.NoError(t, err)
	_, err = db.Exec(`CREATE TABLE goose_db_version (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		version_id INTEGER NOT NULL,
		is_applied INTEGER NOT NULL,
		tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO goose_db_version (version_id, is_applied) VALUES (1, 1)`)
	require.NoError(t, err)
	_, err = db.Exec(`INSERT INTO goose_db_version (version_id, is_applied) VALUES (2, 1)`)
	require.NoError(t, err)
	require.NoError(t, db.Close())

	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	viewer, err := s.Get("viewer-1", testDayResetHour, now)
	require.NoError(t, err)
	assert.Equal(t, 42, viewer.XP)
}

func TestMerge_WhenSameSession_ExpectActivityCountersCombined(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	activity := store.ActivitySettings{IntervalSeconds: 300, SessionLimit: 10, XP: 1}

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, activity, testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, activity, testDayResetHour, now.Add(100*time.Millisecond)))

	fromID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	intoID := viewerID(t, s, "youtube", "2", testDayResetHour, now)
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now.Add(10*time.Second)))

	afterMerge := now.Add(300*time.Second + 50*time.Millisecond)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, activity, testDayResetHour, afterMerge))

	target := getAt(t, s, intoID, testDayResetHour, now)
	assert.Equal(t, 3, target.MessageCount)
	assert.Equal(t, 2, target.XP)
	assert.Equal(t, 3, target.SessionMessageCount)
	assert.Equal(t, 2, target.SessionXP)
}

func splitGooseStatements(sqlText string) []string {
	var statements []string
	var current string
	for _, line := range strings.Split(sqlText, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "-- +goose") {
			if strings.Contains(trimmed, "Down") {
				break
			}
			continue
		}
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		current += line + "\n"
		if strings.HasSuffix(trimmed, ";") {
			statements = append(statements, strings.TrimSpace(current))
			current = ""
		}
	}
	return statements
}

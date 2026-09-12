package store

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestMerge_WhenCrossPlatformHistoryOverlaps_ConsolidatesSessionsAndWritesOneAudit(t *testing.T) {
	// Arrange: both identities have one overlapping session and the source also
	// participated in an older session. This is the durable participation input
	// for session-count achievements, not merely a current-session counter.
	s, err := Open(filepath.Join(t.TempDir(), "comm-relay.db"), OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	activity := ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 0}
	from := ChatIdentity{Platform: "twitch", UserID: "merge-history-from", DisplayName: "From"}
	into := ChatIdentity{Platform: "youtube", UserID: "merge-history-into", DisplayName: "Into"}
	require.NoError(t, s.ApplyChat(from, activity, 6, now))
	require.NoError(t, s.ApplyChat(into, activity, 6, now))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	require.NoError(t, s.ApplyChat(from, activity, 6, now.Add(2*time.Minute)))

	var fromID, intoID string
	require.NoError(t, s.db.QueryRow(`SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?`, from.Platform, from.UserID).Scan(&fromID))
	require.NoError(t, s.db.QueryRow(`SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?`, into.Platform, into.UserID).Scan(&intoID))

	// Act.
	require.NoError(t, s.Merge(fromID, intoID, 6, now.Add(3*time.Minute)))

	// Assert: the overlapping session sums to two messages, the old source-only
	// session remains, and exactly one audit record describes the merge.
	var sessionRows, messages, audits int
	require.NoError(t, s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(message_count), 0) FROM viewer_session_stats WHERE viewer_id = ?`, intoID).Scan(&sessionRows, &messages))
	require.Equal(t, 2, sessionRows)
	require.Equal(t, 3, messages)
	require.NoError(t, s.db.QueryRow(`SELECT COUNT(*) FROM viewer_merges WHERE from_id = ? AND into_id = ?`, fromID, intoID).Scan(&audits))
	require.Equal(t, 1, audits)
	var sourceRows int
	require.NoError(t, s.db.QueryRow(`SELECT COUNT(*) FROM viewer_session_stats WHERE viewer_id = ?`, fromID).Scan(&sourceRows))
	require.Zero(t, sourceRows)
}

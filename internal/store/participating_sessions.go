package store

// participatingSessionStatsPredicate matches Veteran (session_count) progression:
// only viewer_session_stats rows with at least one counted chat line.
const participatingSessionStatsPredicate = "message_count > 0"

const participatingSessionCountGroupedJoinSQL = `
LEFT JOIN (
  SELECT viewer_id, COUNT(*) AS session_count
  FROM viewer_session_stats
  WHERE ` + participatingSessionStatsPredicate + `
  GROUP BY viewer_id
) vsc ON vsc.viewer_id = v.id`

func participatingSessionCountMetricQuery(viewerID string) (string, []any) {
	return `SELECT COUNT(*) FROM viewer_session_stats WHERE viewer_id = ? AND ` + participatingSessionStatsPredicate, []any{viewerID}
}

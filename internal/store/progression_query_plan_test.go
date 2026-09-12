package store

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProgressionMetricQueryPlan_WhenIndexed_ExpectNoInteractionTableScan(t *testing.T) {
	// Arrange
	s, _ := openTestStoreForQueryPlan(t)
	queries := []struct {
		metric  ProgressionMetric
		subject string
	}{
		{ProgressionMetricMessageCount, ""},
		{ProgressionMetricXP, ""},
		{ProgressionMetricAwardCount, "award"},
		{ProgressionMetricCommandCount, "command"},
		{ProgressionMetricSessionCount, ""},
		{ProgressionMetricContractWinCount, ""},
	}

	for _, test := range queries {
		t.Run(string(test.metric), func(t *testing.T) {
			// Act
			query, args := progressionMetricQuery("viewer", test.metric, test.subject)
			plan := explainQueryPlan(t, s, query, args...)

			// Assert
			if test.metric == ProgressionMetricAwardCount || test.metric == ProgressionMetricCommandCount {
				assert.NotContains(t, plan, "SCAN interaction_events")
				assert.Contains(t, plan, "idx_interaction_events_viewer_")
			}
		})
	}
}

func explainQueryPlan(t *testing.T, s *Store, query string, args ...any) string {
	t.Helper()
	rows, err := s.db.Query(`EXPLAIN QUERY PLAN `+query, args...)
	require.NoError(t, err)
	defer func() { require.NoError(t, rows.Close()) }()
	var details []string
	for rows.Next() {
		var id, parent, notUsed int
		var detail string
		require.NoError(t, rows.Scan(&id, &parent, &notUsed, &detail))
		details = append(details, detail)
	}
	require.NoError(t, rows.Err())
	return strings.Join(details, "\n")
}

func openTestStoreForQueryPlan(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := Open(path, OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	return s, path
}

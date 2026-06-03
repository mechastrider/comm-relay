package api

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOAuthStateStore_WhenIssueAndConsume_ExpectSingleUse(t *testing.T) {
	t.Parallel()

	store := newOAuthStateStore()
	state, err := store.issue()
	require.NoError(t, err)
	require.True(t, store.consume(state))
	require.False(t, store.consume(state))
}

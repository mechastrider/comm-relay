package store_test

import (
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestViewerProgressionLevels_WhenDirectorySnapshot_ExpectAllTimeThresholds(t *testing.T) {
	t.Parallel()
	// Arrange
	s, _ := openTestStore(t)
	_, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{
		ID: "custom_threshold", Title: "Operator", MinXP: 1000,
		LikeQuota: 7, BuffQuota: 3, Now: time.Now(),
	})
	require.NoError(t, err)
	xps := []int{0, 99, 100, 499, 500, 999, 1000, 1499, 1500, 5000, 1000000}
	viewers := make([]store.Viewer, 0, len(xps))
	for i, xp := range xps {
		viewers = append(viewers, store.Viewer{ID: strconv.Itoa(i), XP: xp, SessionXP: 0, DayXP: 1})
	}

	// Act
	got, err := s.ViewerProgressionLevels(viewers)

	// Assert
	require.NoError(t, err)
	require.Len(t, got, len(viewers))
	for _, viewer := range viewers {
		want, resolveErr := s.ResolveProgressionLevel(viewer.XP)
		require.NoError(t, resolveErr)
		assert.Equal(t, *want, got[viewer.ID])
	}
	assert.Equal(t, "Operator", got["6"].Title)
	assert.Equal(t, 7, got["6"].LikeQuota)
}

func TestViewerProgressionLevels_WhenEmpty_ExpectEmptyResult(t *testing.T) {
	t.Parallel()
	// Arrange
	s, _ := openTestStore(t)
	// Act
	got, err := s.ViewerProgressionLevels(nil)
	// Assert
	require.NoError(t, err)
	assert.Empty(t, got)
}

func TestViewerProgressionLevels_WhenNoQualifiedLevel_ExpectError(t *testing.T) {
	t.Parallel()
	// Arrange
	s, _ := openTestStore(t)
	// Act
	_, err := s.ViewerProgressionLevels([]store.Viewer{{ID: "invalid-xp", XP: -1}})
	// Assert
	require.ErrorIs(t, err, store.ErrProgressionLevelNotFound)
}

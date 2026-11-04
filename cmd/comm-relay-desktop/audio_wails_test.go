//go:build wails

package main

import (
	"context"
	"math"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDesktopAudio_WhenUnavailable_ExpectError(t *testing.T) {
	t.Parallel()
	// Arrange
	var api *DesktopAPI
	// Act / Assert
	require.Error(t, api.PrepareMessageAudio())
	require.Error(t, api.PlayMessageSound("ping", 1))
}

func TestDesktopAudio_WhenMalformed_ExpectErrorBeforeNativeDispatch(t *testing.T) {
	t.Parallel()
	// Arrange
	api := &DesktopAPI{app: &desktopApp{wailsCtx: context.Background()}}
	for _, item := range []struct {
		sound  string
		volume float64
	}{
		{"');evil();//", 1}, {"", 1}, {"ping", -1}, {"ping", 2}, {"ping", math.NaN()}, {"ping", math.Inf(1)},
	} {
		// Act / Assert
		require.Error(t, api.PlayMessageSound(item.sound, item.volume))
	}
}

func TestDesktopAudio_WhenZeroVolume_ExpectNoNativeDispatch(t *testing.T) {
	t.Parallel()
	// Arrange: no native runtime in this context; a dispatch would fail.
	api := &DesktopAPI{app: &desktopApp{wailsCtx: context.Background()}}
	// Act / Assert
	require.NoError(t, api.PlayMessageSound("ping", 0))
}

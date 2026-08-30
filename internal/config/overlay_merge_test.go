package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMergeOverlayPresetsFrom_WhenPresetsAbsent_ExpectPreviousPresetsKept(t *testing.T) {
	t.Parallel()

	prev := Default()
	prev.Overlay.Presets = append(prev.Overlay.Presets, OverlayPreset{
		ID:          "stream-main",
		Name:        "Stream",
		MaxMessages: 30,
		FontSizePx:  18,
		DisplayMode: OverlayDisplayModeNormal,
		Theme:       OverlayThemeDashboard,
	})
	prev.Overlay.Presets[1].applyDefaults()
	prev.Overlay.ActivePresetID = "stream-main"
	prev.Overlay.EnsurePresets()

	incoming := Default()
	incoming.Overlay.Presets = nil
	incoming.Overlay.ActivePresetID = ""
	incoming.Overlay.Theme = OverlayThemeCockpitPopups

	incoming.MergeOverlayPresetsFrom(*prev, false)
	incoming.Overlay.EnsurePresets()

	require.Len(t, incoming.Overlay.Presets, 2)
	require.Equal(t, "stream-main", incoming.Overlay.ActivePresetID)
	require.Equal(t, OverlayThemeCockpitPopups, incoming.Overlay.Presets[1].Theme)
}

func TestMergeOverlayPresetsFrom_WhenPresetsPresent_ExpectIncomingPresetsUsed(t *testing.T) {
	t.Parallel()

	prev := Default()
	prev.Overlay.Presets = append(prev.Overlay.Presets, OverlayPreset{
		ID:          "stream-main",
		Name:        "Stream",
		MaxMessages: 30,
		FontSizePx:  18,
		DisplayMode: OverlayDisplayModeNormal,
		Theme:       OverlayThemeDashboard,
	})
	prev.Overlay.Presets[1].applyDefaults()

	incoming := Default()
	incoming.Overlay.Presets = []OverlayPreset{{
		ID:          "solo",
		Name:        "Solo",
		MaxMessages: 12,
		FontSizePx:  20,
		DisplayMode: OverlayDisplayModeCompact,
		Theme:       OverlayThemeDefault,
	}}
	incoming.Overlay.Presets[0].applyDefaults()
	incoming.Overlay.ActivePresetID = "solo"

	incoming.MergeOverlayPresetsFrom(*prev, true)
	incoming.Overlay.EnsurePresets()

	require.Len(t, incoming.Overlay.Presets, 1)
	require.Equal(t, "solo", incoming.Overlay.ActivePresetID)
}

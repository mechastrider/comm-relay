package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOverlayConfig_EnsurePresets_WhenLegacyFlat_ExpectDefaultPreset(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets = nil
	cfg.Overlay.Theme = OverlayThemeDashboard
	cfg.Overlay.MaxMessages = 12

	cfg.Overlay.EnsurePresets()

	require.Len(t, cfg.Overlay.Presets, 1)
	require.Equal(t, OverlayDefaultPresetID, cfg.Overlay.Presets[0].ID)
	require.Equal(t, OverlayThemeDashboard, cfg.Overlay.Presets[0].Theme)
	require.Equal(t, 12, cfg.Overlay.Presets[0].MaxMessages)
	require.Equal(t, OverlayDefaultPresetID, cfg.Overlay.ActivePresetID)
}

func TestOverlayConfig_ResolvedPreset_WhenPresetID_ExpectMatch(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets = []OverlayPreset{
		defaultOverlayPreset(),
		{
			ID:                "mw5",
			Name:              "MW5",
			MaxMessages:       20,
			MessageTTLSeconds: 30,
			FontSizePx:        22,
			DisplayMode:       OverlayDisplayModeCompact,
			Theme:             OverlayThemeCockpitPanel,
			Style:             defaultOverlayStyle(),
		},
	}
	cfg.Overlay.ActivePresetID = OverlayDefaultPresetID

	preset := cfg.Overlay.ResolvedPreset("mw5")
	require.Equal(t, "mw5", preset.ID)
	require.Equal(t, OverlayThemeCockpitPanel, preset.Theme)
}

func TestValidate_WhenOverlayHighlightsEnabledWithoutWords_ExpectInvalid(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Highlights.Enabled = true
	cfg.Overlay.Highlights.Rules = []OverlayHighlightRule{
		{
			ID:          "streamer",
			Words:       nil,
			Match:       OverlayHighlightMatchWord,
			BorderColor: "#f5c518",
		},
	}

	err := cfg.Validate()
	require.Error(t, err)
	require.Contains(t, ValidationFields(err), "overlay_highlight_0_words")
}

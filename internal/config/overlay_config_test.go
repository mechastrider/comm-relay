package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestEnsurePresets_WhenLegacyFlatOverlay_ExpectDefaultPresetAndMirroredFields(t *testing.T) {
	t.Parallel()

	overlay := OverlayConfig{
		MaxMessages:       12,
		MessageTTLSeconds: 8,
		FontSizePx:        22,
		DisplayMode:       OverlayDisplayModeCompact,
		Theme:             OverlayThemeDashboard,
	}

	overlay.EnsurePresets()

	require.Equal(t, OverlayDefaultPresetID, overlay.ActivePresetID)
	require.Len(t, overlay.Presets, 1)
	preset := overlay.Presets[0]
	require.Equal(t, OverlayDefaultPresetID, preset.ID)
	require.Equal(t, "Default", preset.Name)
	require.Equal(t, 12, preset.MaxMessages)
	require.Equal(t, OverlayThemeDashboard, preset.Theme)
	require.Equal(t, OverlayPlatformMarkerIcon, preset.Style.PlatformMarker)
	require.Equal(t, OverlayTextEdgeOutline, preset.Style.TextEdge)
	require.InDelta(t, 0.0, preset.Style.PanelOpacity, 0.001)
	require.Equal(t, 12, overlay.MaxMessages)
	require.Equal(t, OverlayThemeDashboard, overlay.Theme)
	require.Empty(t, overlay.People)
}

func TestValidate_WhenDuplicatePersonIdentity_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.People = []OverlayPerson{
		{
			ID:    "person_a",
			Label: "A",
			Identities: []OverlayPersonIdentity{
				{Platform: "twitch", Username: "same_user"},
			},
		},
		{
			ID:    "person_b",
			Label: "B",
			Identities: []OverlayPersonIdentity{
				{Platform: "twitch", Username: "Same_User"},
			},
		},
	}

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_person_1_identity_0_username")
}

func TestValidate_WhenPageOpacitySet_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	opacity := 0.4
	cfg.Overlay.PageOpacity = &opacity

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_page_opacity")
}

func TestValidate_WhenStyleFontInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Style.FontFamily = "comic-sans"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_style_font_family")
}

func TestValidate_WhenPanelImageFitInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Style.PanelImageFit = "stretch"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_style_panel_image_fit")
}

func TestValidate_WhenPanelImageScopeInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Style.PanelImageScope = "viewport"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_style_panel_image_scope")
}

func TestLoad_WhenLegacyOverlayJSON_ExpectMigratedPreset(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 17877,
  "overlay": { "max_messages": 14, "message_ttl_seconds": 9, "theme": "dashboard" }
}`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, 14, cfg.Overlay.MaxMessages)
	require.Equal(t, OverlayThemeDashboard, cfg.Overlay.Theme)
	require.Equal(t, OverlayDefaultPresetID, cfg.Overlay.ActivePresetID)
	require.Len(t, cfg.Overlay.Presets, 1)
	require.Equal(t, OverlayThemeDashboard, cfg.Overlay.Presets[0].Theme)
	require.Equal(t, OverlayPlatformMarkerIcon, cfg.Overlay.Presets[0].Style.PlatformMarker)
}

func TestDefault_WhenCalled_ExpectPresetMirrorsFlatFields(t *testing.T) {
	t.Parallel()

	cfg := Default()
	require.NoError(t, cfg.Validate())
	require.Len(t, cfg.Overlay.Presets, 1)
	require.Equal(t, OverlayDefaultPresetID, cfg.Overlay.ActivePresetID)
	require.Equal(t, cfg.Overlay.MaxMessages, cfg.Overlay.Presets[0].MaxMessages)
	require.Equal(t, cfg.Overlay.Theme, cfg.Overlay.Presets[0].Theme)

	data, err := json.Marshal(cfg)
	require.NoError(t, err)
	require.NotContains(t, string(data), `"page_opacity"`)
}

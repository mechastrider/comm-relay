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

func TestDefaultOverlayStyleForTheme_WhenGRebelsPopups_ExpectBothPlatformMarker(t *testing.T) {
	t.Parallel()

	style := defaultOverlayStyleForTheme(OverlayThemeGRebelsPopups)
	require.Equal(t, OverlayPlatformMarkerBoth, style.PlatformMarker)
	require.InDelta(t, 0.0, style.PanelOpacity, 0.001)
}

func TestDefault_WhenCalled_ExpectPresetMirrorsFlatFields(t *testing.T) {
	t.Parallel()

	cfg := Default()
	require.NoError(t, cfg.Validate())
	require.Len(t, cfg.Overlay.Presets, 1)
	require.Equal(t, OverlayDefaultPresetID, cfg.Overlay.ActivePresetID)
	require.Equal(t, cfg.Overlay.MaxMessages, cfg.Overlay.Presets[0].MaxMessages)
	require.Equal(t, cfg.Overlay.Theme, cfg.Overlay.Presets[0].Theme)
	require.Equal(t, OverlayLeaderboardLayoutPanel, cfg.Overlay.Presets[0].LeaderboardLayout())
	require.Equal(t, cfg.Overlay.Presets[0].FontSizePx, cfg.Overlay.Presets[0].LeaderboardFontSizePx())

	data, err := json.Marshal(cfg)
	require.NoError(t, err)
	require.NotContains(t, string(data), `"page_opacity"`)
}

func TestValidate_WhenLeaderboardLayoutInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.Layout = "grid"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_surfaces_leaderboard_layout")
}

func TestValidate_WhenLeaderboardFontOutOfRange_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.FontSizePx = 8

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_surfaces_leaderboard_font_size_px")
}

func TestLeaderboardSurface_WhenFontOmitted_ExpectInheritsPresetFont(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].FontSizePx = 22
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.FontSizePx = 0
	cfg.Overlay.EnsurePresets()

	require.NoError(t, cfg.Validate())
	require.Equal(t, 22, cfg.Overlay.Presets[0].LeaderboardFontSizePx())
	require.Equal(t, OverlayLeaderboardLayoutPanel, cfg.Overlay.Presets[0].LeaderboardLayout())
}

func TestLeaderboardSurface_WhenStored_ExpectOverridesAndPublicJSON(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].FontSizePx = 18
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.FontSizePx = 14
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.Layout = OverlayLeaderboardLayoutChips
	cfg.Overlay.EnsurePresets()

	require.NoError(t, cfg.Validate())
	require.Equal(t, 14, cfg.Overlay.Presets[0].LeaderboardFontSizePx())
	require.Equal(t, OverlayLeaderboardLayoutChips, cfg.Overlay.Presets[0].LeaderboardLayout())

	data, err := json.Marshal(cfg.Public())
	require.NoError(t, err)
	require.Contains(t, string(data), `"font_size_px":14`)
	require.Contains(t, string(data), `"layout":"chips"`)
}

func TestOverlayPreset_WhenSurfaceOpacityOmitted_ExpectSharedStyleFallback(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Style.PanelOpacity = 0.58

	require.Nil(t, cfg.Overlay.Presets[0].Surfaces.Chat.PanelOpacity)
	require.Nil(t, cfg.Overlay.Presets[0].Surfaces.Leaderboard.PanelOpacity)
	require.Nil(t, cfg.Overlay.Presets[0].Surfaces.Alerts.PanelOpacity)
	require.InDelta(t, 0.58, cfg.Overlay.Presets[0].ChatPanelOpacity(), 0.001)
	require.InDelta(t, 0.58, cfg.Overlay.Presets[0].LeaderboardPanelOpacity(), 0.001)
	require.InDelta(t, 0.58, cfg.Overlay.Presets[0].AlertsPanelOpacity(), 0.001)
}

func TestOverlayPreset_WhenSurfaceOpacityOverridesStored_ExpectExplicitZeroAndEndpointsPreserved(t *testing.T) {
	t.Parallel()

	cfg := Default()
	zero, middle, one := 0.0, 0.35, 1.0
	cfg.Overlay.Presets[0].Surfaces.Chat.PanelOpacity = &zero
	cfg.Overlay.Presets[0].Surfaces.Leaderboard.PanelOpacity = &middle
	cfg.Overlay.Presets[0].Surfaces.Alerts.PanelOpacity = &one

	require.NoError(t, cfg.Validate())
	require.Equal(t, 0.0, cfg.Overlay.Presets[0].ChatPanelOpacity())
	require.Equal(t, 0.35, cfg.Overlay.Presets[0].LeaderboardPanelOpacity())
	require.Equal(t, 1.0, cfg.Overlay.Presets[0].AlertsPanelOpacity())

	data, err := json.Marshal(cfg.Public())
	require.NoError(t, err)
	require.Contains(t, string(data), `"chat":{"panel_opacity":0}`)
	require.Contains(t, string(data), `"panel_opacity":0.35`)
	require.Contains(t, string(data), `"alerts":{"panel_opacity":1}`)
}

func TestValidate_WhenSurfacePanelOpacityOutOfRange_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	invalid := 1.01
	cfg.Overlay.Presets[0].Surfaces.Alerts.PanelOpacity = &invalid

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_surfaces_alerts_panel_opacity")
}

func TestValidate_WhenAlertsImageSizeOutOfRange_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Presets[0].Surfaces.Alerts.ImageSizePct = 400

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "overlay_preset_0_surfaces_alerts_image_size_pct")
}

func TestOverlayPreset_AlertsImageSizePct_ExpectDefaultAndClamp(t *testing.T) {
	t.Parallel()

	preset := OverlayPreset{}
	require.Equal(t, OverlayAlertImageSizeDefault, preset.AlertsImageSizePct())

	preset.Surfaces.Alerts.ImageSizePct = 180
	require.Equal(t, 180, preset.AlertsImageSizePct())

	preset.Surfaces.Alerts.ImageSizePct = 999
	require.Equal(t, OverlayAlertImageSizeMax, preset.AlertsImageSizePct())
}

func TestLoad_WhenLegacyPresetHasOnlySharedOpacity_ExpectNoSurfaceOverrides(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "overlay": {
    "active_preset_id": "legacy",
    "presets": [{
      "id": "legacy", "name": "Legacy", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal",
      "theme": "default", "style": {"font_family":"system","line_height":1.35,"text_edge":"shadow","text_edge_strength":2,"platform_marker":"stripe","panel_color":"#000000","panel_opacity":0.35,"border_width":0,"border_color":"#ffffff","border_radius":8}
    }]
  }
}`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	preset := cfg.Overlay.Presets[0]
	require.Nil(t, preset.Surfaces.Chat.PanelOpacity)
	require.Nil(t, preset.Surfaces.Leaderboard.PanelOpacity)
	require.Nil(t, preset.Surfaces.Alerts.PanelOpacity)
	require.Equal(t, 0.35, preset.ChatPanelOpacity())
	require.Equal(t, 0.35, preset.LeaderboardPanelOpacity())
	require.Equal(t, 0.35, preset.AlertsPanelOpacity())
}

func TestLoad_WhenSurfacePanelOpacityHasMalformedType_ExpectError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "surfaces": { "chat": { "panel_opacity": "opaque" } }
    }]
  }
}`), 0o644))

	_, err := Load(path)
	require.Error(t, err)
}

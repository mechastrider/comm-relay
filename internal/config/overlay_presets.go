package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/muonsoft/errors"
)

const (
	// OverlayDefaultPresetID is the id used when migrating a flat overlay config.
	OverlayDefaultPresetID = "default"
	// MaxOverlayPresets is the maximum number of named overlay looks.
	MaxOverlayPresets    = 32
	overlayPresetNameMax = 64
)

// Leaderboard layout values for overlay.presets[].surfaces.leaderboard.layout.
const (
	OverlayLeaderboardLayoutPanel = "panel"
	OverlayLeaderboardLayoutChips = "chips"
)

// OverlayPreset is a named overlay look for a scene or game.
type OverlayPreset struct {
	ID                string                `json:"id"`
	Name              string                `json:"name"`
	MaxMessages       int                   `json:"max_messages"`
	MessageTTLSeconds int                   `json:"message_ttl_seconds"`
	FontSizePx        int                   `json:"font_size_px"`
	DisplayMode       string                `json:"display_mode"`
	Theme             string                `json:"theme"`
	Style             OverlayStyleConfig    `json:"style"`
	Surfaces          OverlayPresetSurfaces `json:"surfaces"`
}

// OverlayPresetSurfaces holds optional per-surface overrides on a preset.
type OverlayPresetSurfaces struct {
	Chat        OverlayChatSurface        `json:"chat"`
	Leaderboard OverlayLeaderboardSurface `json:"leaderboard"`
	Alerts      OverlayAlertsSurface      `json:"alerts"`
}

// OverlayChatSurface holds optional chat-only appearance overrides.
type OverlayChatSurface struct {
	PanelOpacity *float64 `json:"panel_opacity,omitempty"`
}

// OverlayLeaderboardSurface is the leaderboard look for one overlay preset.
type OverlayLeaderboardSurface struct {
	FontSizePx   int      `json:"font_size_px,omitempty"`
	Layout       string   `json:"layout,omitempty"`
	PanelOpacity *float64 `json:"panel_opacity,omitempty"`
}

// OverlayAlertsSurface holds optional alert-only appearance overrides.
type OverlayAlertsSurface struct {
	PanelOpacity *float64 `json:"panel_opacity,omitempty"`
}

func (p *OverlayPreset) applyDefaults() {
	if strings.TrimSpace(p.Name) == "" {
		p.Name = "Default"
	}
	if p.MaxMessages < 1 {
		p.MaxMessages = 30
	}
	if p.MessageTTLSeconds < 0 {
		p.MessageTTLSeconds = 20
	}
	if p.FontSizePx < 1 {
		p.FontSizePx = 18
	}
	if p.DisplayMode == "" {
		p.DisplayMode = OverlayDisplayModeNormal
	}
	if p.Theme == "" {
		p.Theme = OverlayThemeDefault
	}
	p.Style.applyDefaults(p.Theme)
	p.Surfaces.Leaderboard.applyDefaults()
}

func (p OverlayPreset) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	key := func(name string) string {
		if prefix == "" {
			return name
		}
		return prefix + "_" + name
	}

	id := strings.TrimSpace(p.ID)
	if id == "" {
		fields[key("id")] = "Preset id is required."
	}
	name := strings.TrimSpace(p.Name)
	if name == "" {
		fields[key("name")] = "Preset name is required."
	} else if len([]rune(name)) > overlayPresetNameMax {
		fields[key("name")] = fmt.Sprintf("Preset name must be at most %d characters.", overlayPresetNameMax)
	}
	if p.MaxMessages < 1 {
		fields[key("max_messages")] = "Enter at least 1 message."
	}
	if p.MessageTTLSeconds < 0 {
		fields[key("message_ttl_seconds")] = "TTL must be 0 or greater."
	}
	if p.FontSizePx < OverlayFontSizeMin || p.FontSizePx > OverlayFontSizeMax {
		fields[key("font_size_px")] = fmt.Sprintf(
			"Font size must be between %d and %d px.",
			OverlayFontSizeMin,
			OverlayFontSizeMax,
		)
	}
	switch p.DisplayMode {
	case OverlayDisplayModeNormal, OverlayDisplayModeCompact:
	default:
		fields[key("display_mode")] = "Choose normal or compact layout."
	}
	switch p.Theme {
	case OverlayThemeDefault, OverlayThemeDashboard, OverlayThemeCockpitPanel, OverlayThemeCockpitPopups, OverlayThemeGRebelsPopups:
	default:
		fields[key("theme")] = "Choose a supported overlay theme."
	}
	mergeFieldErrors(fields, p.Style.validateFields(key("style")))
	mergeFieldErrors(fields, p.Surfaces.Chat.validateFields(key("surfaces_chat")))
	mergeFieldErrors(fields, p.Surfaces.Leaderboard.validateFields(key("surfaces_leaderboard")))
	mergeFieldErrors(fields, p.Surfaces.Alerts.validateFields(key("surfaces_alerts")))
	return fields
}

func (s *OverlayLeaderboardSurface) applyDefaults() {
	if s.Layout == "" {
		s.Layout = OverlayLeaderboardLayoutPanel
	}
}

func (s OverlayLeaderboardSurface) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	key := func(name string) string {
		if prefix == "" {
			return name
		}
		return prefix + "_" + name
	}
	if s.FontSizePx != 0 && (s.FontSizePx < OverlayFontSizeMin || s.FontSizePx > OverlayFontSizeMax) {
		fields[key("font_size_px")] = fmt.Sprintf(
			"Font size must be between %d and %d px.",
			OverlayFontSizeMin,
			OverlayFontSizeMax,
		)
	}
	switch s.Layout {
	case "", OverlayLeaderboardLayoutPanel, OverlayLeaderboardLayoutChips:
	default:
		fields[key("layout")] = "Choose panel or chips layout."
	}
	mergeFieldErrors(fields, validateSurfacePanelOpacity(prefix, s.PanelOpacity))
	return fields
}

func (s OverlayChatSurface) validateFields(prefix string) FieldErrors {
	return validateSurfacePanelOpacity(prefix, s.PanelOpacity)
}

func (s OverlayAlertsSurface) validateFields(prefix string) FieldErrors {
	return validateSurfacePanelOpacity(prefix, s.PanelOpacity)
}

func validateSurfacePanelOpacity(prefix string, opacity *float64) FieldErrors {
	if opacity == nil || (*opacity >= overlayPanelOpacityMin && *opacity <= overlayPanelOpacityMax) {
		return FieldErrors{}
	}

	return FieldErrors{prefix + "_panel_opacity": "Panel opacity must be between 0 and 1."}
}

// ChatPanelOpacity returns the chat override or the shared style value for legacy presets.
func (p OverlayPreset) ChatPanelOpacity() float64 {
	return resolvedSurfacePanelOpacity(p.Style.PanelOpacity, p.Surfaces.Chat.PanelOpacity)
}

// LeaderboardPanelOpacity returns the leaderboard override or the shared style value.
func (p OverlayPreset) LeaderboardPanelOpacity() float64 {
	return resolvedSurfacePanelOpacity(p.Style.PanelOpacity, p.Surfaces.Leaderboard.PanelOpacity)
}

// AlertsPanelOpacity returns the alerts override or the shared style value.
func (p OverlayPreset) AlertsPanelOpacity() float64 {
	return resolvedSurfacePanelOpacity(p.Style.PanelOpacity, p.Surfaces.Alerts.PanelOpacity)
}

func resolvedSurfacePanelOpacity(fallback float64, override *float64) float64 {
	if override != nil {
		return *override
	}
	return fallback
}

// LeaderboardFontSizePx returns the leaderboard font, inheriting the preset font when unset.
func (p OverlayPreset) LeaderboardFontSizePx() int {
	if p.Surfaces.Leaderboard.FontSizePx >= OverlayFontSizeMin {
		return p.Surfaces.Leaderboard.FontSizePx
	}
	return p.FontSizePx
}

// LeaderboardLayout returns panel unless chips is stored.
func (p OverlayPreset) LeaderboardLayout() string {
	if p.Surfaces.Leaderboard.Layout == OverlayLeaderboardLayoutChips {
		return OverlayLeaderboardLayoutChips
	}
	return OverlayLeaderboardLayoutPanel
}

// EnsurePresets migrates legacy flat overlay fields into presets when presets are absent.
func (o *OverlayConfig) EnsurePresets() {
	if len(o.Presets) == 0 {
		preset := OverlayPreset{
			ID:                OverlayDefaultPresetID,
			Name:              "Default",
			MaxMessages:       o.MaxMessages,
			MessageTTLSeconds: o.MessageTTLSeconds,
			FontSizePx:        o.FontSizePx,
			DisplayMode:       o.DisplayMode,
			Theme:             o.Theme,
			Style:             defaultOverlayStyleForTheme(o.Theme),
		}
		preset.applyDefaults()
		o.Presets = []OverlayPreset{preset}
		if strings.TrimSpace(o.ActivePresetID) == "" {
			o.ActivePresetID = OverlayDefaultPresetID
		}
	}
	for i := range o.Presets {
		if strings.TrimSpace(o.Presets[i].ID) == "" {
			id, err := newOverlayID("preset")
			if err != nil {
				o.Presets[i].ID = fmt.Sprintf("preset_%d", i+1)
			} else {
				o.Presets[i].ID = id
			}
		}
		o.Presets[i].applyDefaults()
	}
	o.normalizeActivePreset()
	o.syncLegacyFieldsFromActive()
}

func (o *OverlayConfig) normalizeActivePreset() {
	if len(o.Presets) == 0 {
		return
	}
	active := strings.TrimSpace(o.ActivePresetID)
	if active == "" {
		o.ActivePresetID = o.Presets[0].ID
		return
	}
	if _, ok := o.PresetByID(active); ok {
		o.ActivePresetID = active
		return
	}
	o.ActivePresetID = o.Presets[0].ID
}

func (o *OverlayConfig) syncLegacyFieldsFromActive() {
	preset, ok := o.PresetByID(o.ActivePresetID)
	if !ok {
		return
	}
	o.MaxMessages = preset.MaxMessages
	o.MessageTTLSeconds = preset.MessageTTLSeconds
	o.FontSizePx = preset.FontSizePx
	o.DisplayMode = preset.DisplayMode
	o.Theme = preset.Theme
}

// PresetByID returns a preset copy and whether it was found.
func (o OverlayConfig) PresetByID(id string) (OverlayPreset, bool) {
	id = strings.TrimSpace(id)
	for _, preset := range o.Presets {
		if preset.ID == id {
			return preset, true
		}
	}
	return OverlayPreset{}, false
}

// ResolvedPreset returns the preset for overlay rendering (query id or active).
func (o OverlayConfig) ResolvedPreset(presetID string) OverlayPreset {
	presetID = strings.TrimSpace(presetID)
	if presetID == "" {
		presetID = o.ActivePresetID
	}
	if preset, ok := o.PresetByID(presetID); ok {
		return preset
	}
	if preset, ok := o.PresetByID(o.ActivePresetID); ok {
		return preset
	}
	if len(o.Presets) > 0 {
		return o.Presets[0]
	}
	fallback := OverlayPreset{
		ID:                OverlayDefaultPresetID,
		Name:              "Default",
		MaxMessages:       o.MaxMessages,
		MessageTTLSeconds: o.MessageTTLSeconds,
		FontSizePx:        o.FontSizePx,
		DisplayMode:       o.DisplayMode,
		Theme:             o.Theme,
	}
	fallback.applyDefaults()
	return fallback
}

func (o OverlayConfig) validatePresetFields() FieldErrors {
	fields := FieldErrors{}
	if len(o.Presets) == 0 {
		fields["overlay_presets"] = "Add at least one overlay preset."
		return fields
	}
	if len(o.Presets) > MaxOverlayPresets {
		fields["overlay_presets"] = fmt.Sprintf("Maximum %d overlay presets allowed.", MaxOverlayPresets)
	}
	seen := make(map[string]struct{}, len(o.Presets))
	for i, preset := range o.Presets {
		prefix := fmt.Sprintf("overlay_preset_%d", i)
		mergeFieldErrors(fields, preset.validateFields(prefix))
		id := strings.TrimSpace(preset.ID)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			fields[prefix+"_id"] = "Duplicate preset id."
			continue
		}
		seen[id] = struct{}{}
	}
	active := strings.TrimSpace(o.ActivePresetID)
	if active == "" {
		fields["overlay_active_preset_id"] = "Choose an active overlay preset."
	} else if _, ok := o.PresetByID(active); !ok {
		fields["overlay_active_preset_id"] = "Active preset id does not match any preset."
	}
	return fields
}

func newOverlayID(prefix string) (string, error) {
	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", errors.Errorf("generate overlay id: %w", err)
	}
	return prefix + "_" + hex.EncodeToString(buf[:]), nil
}

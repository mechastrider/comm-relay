package config

import (
	"fmt"
	"regexp"
	"strings"
)

const (
	OverlayDefaultPresetID = "default"
	MaxOverlayPresets      = 32
)

var overlayPresetIDRe = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,31}$`)

// OverlayPreset is a named overlay appearance profile for OBS scenes.
type OverlayPreset struct {
	ID                string             `json:"id"`
	Name              string             `json:"name"`
	MaxMessages       int                `json:"max_messages"`
	MessageTTLSeconds int                `json:"message_ttl_seconds"`
	FontSizePx        int                `json:"font_size_px"`
	DisplayMode       string             `json:"display_mode"`
	Theme             string             `json:"theme"`
	Style             OverlayStyleConfig `json:"style"`
}

func defaultOverlayPreset() OverlayPreset {
	return OverlayPreset{
		ID:                OverlayDefaultPresetID,
		Name:              "Default",
		MaxMessages:       30,
		MessageTTLSeconds: 20,
		FontSizePx:        18,
		DisplayMode:       OverlayDisplayModeNormal,
		Theme:             OverlayThemeDefault,
		Style:             defaultOverlayStyle(),
	}
}

func (p *OverlayPreset) applyDefaults() {
	def := defaultOverlayPreset()
	if strings.TrimSpace(p.ID) == "" {
		p.ID = def.ID
	}
	if strings.TrimSpace(p.Name) == "" {
		p.Name = def.Name
	}
	if p.MaxMessages < 1 {
		p.MaxMessages = def.MaxMessages
	}
	if p.MessageTTLSeconds < 0 {
		p.MessageTTLSeconds = def.MessageTTLSeconds
	}
	if p.FontSizePx < 1 {
		p.FontSizePx = def.FontSizePx
	}
	if p.DisplayMode == "" {
		p.DisplayMode = def.DisplayMode
	}
	if p.Theme == "" {
		p.Theme = def.Theme
	}
	p.Style.applyDefaults()
}

func (p OverlayPreset) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	key := func(suffix string) string {
		if prefix == "" {
			return suffix
		}
		return prefix + "_" + suffix
	}

	id := strings.TrimSpace(p.ID)
	if id == "" || !overlayPresetIDRe.MatchString(id) {
		fields[key("id")] = "Preset id must start with a letter and use lowercase letters, numbers, underscore, or hyphen."
	}
	name := strings.TrimSpace(p.Name)
	if name == "" || len(name) > 64 {
		fields[key("name")] = "Preset name is required (up to 64 characters)."
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
	case OverlayThemeDefault, OverlayThemeDashboard, OverlayThemeCockpitPanel,
		OverlayThemeCockpitPopups, OverlayThemeGRebelsPopups:
	default:
		fields[key("theme")] = "Choose a supported overlay theme."
	}
	mergeFieldErrors(fields, p.Style.validateFields(key("style")))

	return fields
}

// EnsurePresets migrates legacy flat overlay fields into presets when presets are absent.
func (o *OverlayConfig) EnsurePresets() {
	if len(o.Presets) > 0 {
		o.normalizeActivePreset()
		return
	}

	preset := OverlayPreset{
		ID:                OverlayDefaultPresetID,
		Name:              "Default",
		MaxMessages:       o.MaxMessages,
		MessageTTLSeconds: o.MessageTTLSeconds,
		FontSizePx:        o.FontSizePx,
		DisplayMode:       o.DisplayMode,
		Theme:             o.Theme,
		Style:             defaultOverlayStyle(),
	}
	preset.applyDefaults()
	o.Presets = []OverlayPreset{preset}
	if strings.TrimSpace(o.ActivePresetID) == "" {
		o.ActivePresetID = OverlayDefaultPresetID
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
	for _, preset := range o.Presets {
		if preset.ID == active {
			return
		}
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

// ResolvedPreset returns the preset for overlay rendering (preset query param or active).
func (o OverlayConfig) ResolvedPreset(presetID string) OverlayPreset {
	presetID = strings.TrimSpace(presetID)
	if presetID == "" {
		presetID = o.ActivePresetID
	}
	if preset, ok := o.PresetByID(presetID); ok {
		return preset
	}
	if len(o.Presets) > 0 {
		return o.Presets[0]
	}
	return defaultOverlayPreset()
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
		if id != "" {
			if _, dup := seen[id]; dup {
				fields[prefix+"_id"] = "Duplicate preset id."
			}
			seen[id] = struct{}{}
		}
	}
	active := strings.TrimSpace(o.ActivePresetID)
	if active == "" {
		fields["overlay_active_preset_id"] = "Choose an active overlay preset."
	} else if _, ok := seen[active]; !ok {
		fields["overlay_active_preset_id"] = "Active preset id does not match any preset."
	}
	return fields
}

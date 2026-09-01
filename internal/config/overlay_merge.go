package config

import "strings"

// MergeOverlayPresetsFrom keeps stored presets when an update body omits overlay.presets.
// Legacy flat overlay fields in the incoming body are mirrored onto the active preset.
func (c *Config) MergeOverlayPresetsFrom(prev Config, presetsPresent bool) {
	if presetsPresent {
		return
	}

	c.Overlay.mergePresetsFrom(prev.Overlay)
	c.Overlay.applyFlatFieldsToActivePreset()
}

func (o *OverlayConfig) mergePresetsFrom(prev OverlayConfig) {
	if len(prev.Presets) == 0 {
		return
	}

	o.Presets = append([]OverlayPreset(nil), prev.Presets...)
	if strings.TrimSpace(o.ActivePresetID) == "" {
		o.ActivePresetID = prev.ActivePresetID
	}
}

func (o *OverlayConfig) applyFlatFieldsToActivePreset() {
	if len(o.Presets) == 0 {
		return
	}

	activeID := strings.TrimSpace(o.ActivePresetID)
	if activeID == "" {
		activeID = o.Presets[0].ID
	}

	for i := range o.Presets {
		if o.Presets[i].ID != activeID {
			continue
		}
		if o.MaxMessages >= 1 {
			o.Presets[i].MaxMessages = o.MaxMessages
		}
		if o.MessageTTLSeconds >= 0 {
			o.Presets[i].MessageTTLSeconds = o.MessageTTLSeconds
		}
		if o.FontSizePx >= OverlayFontSizeMin && o.FontSizePx <= OverlayFontSizeMax {
			o.Presets[i].FontSizePx = o.FontSizePx
		}
		if o.DisplayMode == OverlayDisplayModeNormal || o.DisplayMode == OverlayDisplayModeCompact {
			o.Presets[i].DisplayMode = o.DisplayMode
		}
		if o.Theme != "" {
			o.Presets[i].Theme = o.Theme
		}
		return
	}
}

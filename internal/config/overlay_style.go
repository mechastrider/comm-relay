package config

import (
	"fmt"
	"regexp"
	"strings"
)

// Overlay font family presets (CSS stack keys).
const (
	OverlayFontFamilySystem    = "system"
	OverlayFontFamilySegoe     = "segoe"
	OverlayFontFamilyCondensed = "condensed_hud"
)

// Overlay text readability effects.
const (
	OverlayTextEffectShadow  = "shadow"
	OverlayTextEffectOutline = "outline"
	OverlayTextEffectNone    = "none"
)

// Overlay platform marker modes.
const (
	OverlayPlatformMarkerStripe = "stripe"
	OverlayPlatformMarkerIcon   = "icon"
	OverlayPlatformMarkerBoth   = "both"
	OverlayPlatformMarkerNone   = "none"
)

const (
	overlayLineHeightMin         = 1.0
	overlayLineHeightMax         = 2.0
	overlayMessageGapMin         = 0
	overlayMessageGapMax         = 24
	overlayTextEffectStrengthMin = 1
	overlayTextEffectStrengthMax = 3
	overlayBgOpacityMin          = 0.0
	overlayBgOpacityMax          = 1.0
	overlayBorderWidthMax        = 8
	overlayBorderRadiusMax       = 24
)

var overlayHexColorRe = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

// OverlayStyleConfig holds per-preset visual tokens applied via CSS variables in the overlay.
type OverlayStyleConfig struct {
	FontFamily            string  `json:"font_family"`
	LineHeight            float64 `json:"line_height"`
	MessageGapPx          int     `json:"message_gap_px"`
	TextEffect            string  `json:"text_effect"`
	TextEffectStrength    int     `json:"text_effect_strength"`
	PlatformMarker        string  `json:"platform_marker"`
	MessageBgColor        string  `json:"message_bg_color"`
	MessageBgOpacity      float64 `json:"message_bg_opacity"`
	PanelBgColor          string  `json:"panel_bg_color"`
	PanelBgOpacity        float64 `json:"panel_bg_opacity"`
	PanelBgImage          string  `json:"panel_bg_image"`
	MessageBorderColor    string  `json:"message_border_color"`
	MessageBorderWidthPx  int     `json:"message_border_width_px"`
	MessageBorderRadiusPx int     `json:"message_border_radius_px"`
	PanelBorderColor      string  `json:"panel_border_color"`
	PanelBorderWidthPx    int     `json:"panel_border_width_px"`
}

func defaultOverlayStyle() OverlayStyleConfig {
	return OverlayStyleConfig{
		FontFamily:            OverlayFontFamilySystem,
		LineHeight:            1.35,
		MessageGapPx:          6,
		TextEffect:            OverlayTextEffectShadow,
		TextEffectStrength:    2,
		PlatformMarker:        OverlayPlatformMarkerStripe,
		MessageBgColor:        "#000000",
		MessageBgOpacity:      0.58,
		PanelBgColor:          "#000000",
		PanelBgOpacity:        0.0,
		PanelBgImage:          "",
		MessageBorderColor:    "#000000",
		MessageBorderWidthPx:  0,
		MessageBorderRadiusPx: 8,
		PanelBorderColor:      "#000000",
		PanelBorderWidthPx:    0,
	}
}

func (s *OverlayStyleConfig) applyDefaults() {
	def := defaultOverlayStyle()
	if s.FontFamily == "" {
		s.FontFamily = def.FontFamily
	}
	if s.LineHeight < overlayLineHeightMin {
		s.LineHeight = def.LineHeight
	}
	if s.MessageGapPx < 0 {
		s.MessageGapPx = def.MessageGapPx
	}
	if s.TextEffect == "" {
		s.TextEffect = def.TextEffect
	}
	if s.TextEffectStrength < overlayTextEffectStrengthMin {
		s.TextEffectStrength = def.TextEffectStrength
	}
	if s.PlatformMarker == "" {
		s.PlatformMarker = def.PlatformMarker
	}
	if s.MessageBgColor == "" {
		s.MessageBgColor = def.MessageBgColor
	}
	if s.MessageBgOpacity < 0 {
		s.MessageBgOpacity = def.MessageBgOpacity
	}
	if s.PanelBgColor == "" {
		s.PanelBgColor = def.PanelBgColor
	}
	if s.PanelBgOpacity < 0 {
		s.PanelBgOpacity = def.PanelBgOpacity
	}
	if s.MessageBorderColor == "" {
		s.MessageBorderColor = def.MessageBorderColor
	}
	if s.MessageBorderWidthPx < 0 {
		s.MessageBorderWidthPx = def.MessageBorderWidthPx
	}
	if s.MessageBorderRadiusPx < 0 {
		s.MessageBorderRadiusPx = def.MessageBorderRadiusPx
	}
	if s.PanelBorderColor == "" {
		s.PanelBorderColor = def.PanelBorderColor
	}
	if s.PanelBorderWidthPx < 0 {
		s.PanelBorderWidthPx = def.PanelBorderWidthPx
	}
}

func (s OverlayStyleConfig) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	key := func(suffix string) string {
		if prefix == "" {
			return suffix
		}
		return prefix + "_" + suffix
	}

	switch s.FontFamily {
	case OverlayFontFamilySystem, OverlayFontFamilySegoe, OverlayFontFamilyCondensed:
	default:
		fields[key("font_family")] = "Choose a supported font family."
	}
	if s.LineHeight < overlayLineHeightMin || s.LineHeight > overlayLineHeightMax {
		fields[key("line_height")] = fmt.Sprintf(
			"Line height must be between %.1f and %.1f.",
			overlayLineHeightMin,
			overlayLineHeightMax,
		)
	}
	if s.MessageGapPx < overlayMessageGapMin || s.MessageGapPx > overlayMessageGapMax {
		fields[key("message_gap_px")] = fmt.Sprintf(
			"Message gap must be between %d and %d px.",
			overlayMessageGapMin,
			overlayMessageGapMax,
		)
	}
	switch s.TextEffect {
	case OverlayTextEffectShadow, OverlayTextEffectOutline, OverlayTextEffectNone:
	default:
		fields[key("text_effect")] = "Choose shadow, outline, or none."
	}
	if s.TextEffectStrength < overlayTextEffectStrengthMin ||
		s.TextEffectStrength > overlayTextEffectStrengthMax {
		fields[key("text_effect_strength")] = fmt.Sprintf(
			"Text effect strength must be between %d and %d.",
			overlayTextEffectStrengthMin,
			overlayTextEffectStrengthMax,
		)
	}
	switch s.PlatformMarker {
	case OverlayPlatformMarkerStripe, OverlayPlatformMarkerIcon,
		OverlayPlatformMarkerBoth, OverlayPlatformMarkerNone:
	default:
		fields[key("platform_marker")] = "Choose stripe, icon, both, or none."
	}
	validateOverlayHexColor(fields, key("message_bg_color"), s.MessageBgColor)
	validateOverlayOpacity(fields, key("message_bg_opacity"), s.MessageBgOpacity)
	validateOverlayHexColor(fields, key("panel_bg_color"), s.PanelBgColor)
	validateOverlayOpacity(fields, key("panel_bg_opacity"), s.PanelBgOpacity)
	if s.PanelBgImage != "" && !overlayAssetFilenameValid(s.PanelBgImage) {
		fields[key("panel_bg_image")] = "Background image filename is invalid."
	}
	validateOverlayHexColor(fields, key("message_border_color"), s.MessageBorderColor)
	if s.MessageBorderWidthPx < 0 || s.MessageBorderWidthPx > overlayBorderWidthMax {
		fields[key("message_border_width_px")] = fmt.Sprintf(
			"Border width must be between 0 and %d px.",
			overlayBorderWidthMax,
		)
	}
	if s.MessageBorderRadiusPx < 0 || s.MessageBorderRadiusPx > overlayBorderRadiusMax {
		fields[key("message_border_radius_px")] = fmt.Sprintf(
			"Border radius must be between 0 and %d px.",
			overlayBorderRadiusMax,
		)
	}
	validateOverlayHexColor(fields, key("panel_border_color"), s.PanelBorderColor)
	if s.PanelBorderWidthPx < 0 || s.PanelBorderWidthPx > overlayBorderWidthMax {
		fields[key("panel_border_width_px")] = fmt.Sprintf(
			"Panel border width must be between 0 and %d px.",
			overlayBorderWidthMax,
		)
	}

	return fields
}

func validateOverlayHexColor(fields FieldErrors, key, color string) {
	if color == "" {
		fields[key] = "Enter a color (#rgb or #rrggbb)."
		return
	}
	if !overlayHexColorRe.MatchString(color) {
		fields[key] = "Use a hex color (#rgb or #rrggbb)."
	}
}

func validateOverlayOpacity(fields FieldErrors, key string, opacity float64) {
	if opacity < overlayBgOpacityMin || opacity > overlayBgOpacityMax {
		fields[key] = "Opacity must be between 0 and 1."
	}
}

// overlayAssetFilenameValid checks safe local asset filenames (no path components).
func overlayAssetFilenameValid(name string) bool {
	name = strings.TrimSpace(name)
	if name == "" || name != filepathBaseSafe(name) {
		return false
	}
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".png") ||
		strings.HasSuffix(lower, ".jpg") ||
		strings.HasSuffix(lower, ".jpeg") ||
		strings.HasSuffix(lower, ".webp") ||
		strings.HasSuffix(lower, ".gif") ||
		strings.HasSuffix(lower, ".svg")
}

func filepathBaseSafe(name string) string {
	name = strings.ReplaceAll(name, "\\", "/")
	if strings.Contains(name, "/") || strings.Contains(name, "..") {
		return ""
	}
	return name
}

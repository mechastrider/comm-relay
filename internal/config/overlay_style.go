package config

import (
	"fmt"
	"regexp"
	"strings"
)

// Overlay font family keys (CSS stacks are applied in the overlay).
const (
	OverlayFontSystem    = "system"
	OverlayFontSegoe     = "segoe"
	OverlayFontGeorgia   = "georgia"
	OverlayFontTrebuchet = "trebuchet"
	OverlayFontMono      = "mono"
)

// Overlay text-edge modes.
const (
	OverlayTextEdgeNone    = "none"
	OverlayTextEdgeShadow  = "shadow"
	OverlayTextEdgeOutline = "outline"
)

// Overlay platform-marker modes.
const (
	OverlayPlatformMarkerStripe = "stripe"
	OverlayPlatformMarkerIcon   = "icon"
	OverlayPlatformMarkerBoth   = "both"
	OverlayPlatformMarkerNone   = "none"
)

// Overlay panel-image fit modes.
const (
	OverlayPanelImageFitCover   = "cover"
	OverlayPanelImageFitContain = "contain"
	OverlayPanelImageFitFill    = "fill"
	OverlayPanelImageFitTile    = "tile"
)

// Overlay panel-image scope modes.
const (
	OverlayPanelImageScopeMessage = "message"
	OverlayPanelImageScopeColumn  = "column"
)

const (
	overlayLineHeightMin       = 1.0
	overlayLineHeightMax       = 2.0
	overlayTextEdgeStrengthMin = 0
	overlayTextEdgeStrengthMax = 8
	overlayPanelOpacityMin     = 0.0
	overlayPanelOpacityMax     = 1.0
	overlayBorderWidthMax      = 8
	overlayBorderRadiusMax     = 24
)

var overlayHexColorRe = regexp.MustCompile(`(?i)^#(?:[0-9a-f]{3}|[0-9a-f]{6})$`)

// OverlayStyleConfig holds per-preset visual tokens applied via CSS variables.
type OverlayStyleConfig struct {
	FontFamily       string  `json:"font_family"`
	LineHeight       float64 `json:"line_height"`
	TextEdge         string  `json:"text_edge"`
	TextEdgeStrength int     `json:"text_edge_strength"`
	PlatformMarker   string  `json:"platform_marker"`
	PanelColor       string  `json:"panel_color"`
	PanelOpacity     float64 `json:"panel_opacity"`
	PanelImage       string  `json:"panel_image,omitempty"`
	PanelImageFit    string  `json:"panel_image_fit,omitempty"`
	PanelImageScope  string  `json:"panel_image_scope,omitempty"`
	BorderWidth      int     `json:"border_width"`
	BorderColor      string  `json:"border_color"`
	BorderRadius     int     `json:"border_radius"`
}

func defaultOverlayStyleForTheme(theme string) OverlayStyleConfig {
	style := OverlayStyleConfig{
		FontFamily:       OverlayFontSystem,
		LineHeight:       1.35,
		TextEdge:         OverlayTextEdgeShadow,
		TextEdgeStrength: 2,
		PlatformMarker:   OverlayPlatformMarkerStripe,
		PanelColor:       "#000000",
		PanelOpacity:     0.58,
		BorderWidth:      0,
		BorderColor:      "#ffffff",
		BorderRadius:     8,
	}
	switch theme {
	case OverlayThemeDashboard:
		style.PlatformMarker = OverlayPlatformMarkerIcon
		style.PanelOpacity = 0
		style.TextEdge = OverlayTextEdgeOutline
	case OverlayThemeCockpitPanel:
		style.PanelOpacity = 0
	case OverlayThemeCockpitPopups, OverlayThemeGRebelsPopups:
		style.PlatformMarker = OverlayPlatformMarkerBoth
		style.PanelOpacity = 0
	}
	return style
}

func (s *OverlayStyleConfig) applyDefaults(theme string) {
	def := defaultOverlayStyleForTheme(theme)
	if *s == (OverlayStyleConfig{}) {
		*s = def
		return
	}
	if s.FontFamily == "" {
		s.FontFamily = def.FontFamily
	}
	if s.LineHeight == 0 {
		s.LineHeight = def.LineHeight
	}
	if s.TextEdge == "" {
		s.TextEdge = def.TextEdge
	}
	if s.PlatformMarker == "" {
		s.PlatformMarker = def.PlatformMarker
	}
	if s.PanelColor == "" {
		s.PanelColor = def.PanelColor
	}
	if s.BorderColor == "" {
		s.BorderColor = def.BorderColor
	}
	if s.PanelImageFit == "" {
		s.PanelImageFit = OverlayPanelImageFitCover
	}
	if s.PanelImageScope == "" {
		s.PanelImageScope = OverlayPanelImageScopeMessage
	}
}

func (s OverlayStyleConfig) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	key := func(name string) string {
		if prefix == "" {
			return name
		}
		return prefix + "_" + name
	}

	switch s.FontFamily {
	case OverlayFontSystem, OverlayFontSegoe, OverlayFontGeorgia, OverlayFontTrebuchet, OverlayFontMono:
	default:
		fields[key("font_family")] = "Choose a supported overlay font."
	}
	if s.LineHeight < overlayLineHeightMin || s.LineHeight > overlayLineHeightMax {
		fields[key("line_height")] = fmt.Sprintf(
			"Line height must be between %.1f and %.1f.",
			overlayLineHeightMin,
			overlayLineHeightMax,
		)
	}
	switch s.TextEdge {
	case OverlayTextEdgeNone, OverlayTextEdgeShadow, OverlayTextEdgeOutline:
	default:
		fields[key("text_edge")] = "Choose none, shadow, or outline."
	}
	if s.TextEdgeStrength < overlayTextEdgeStrengthMin || s.TextEdgeStrength > overlayTextEdgeStrengthMax {
		fields[key("text_edge_strength")] = fmt.Sprintf(
			"Text edge strength must be between %d and %d.",
			overlayTextEdgeStrengthMin,
			overlayTextEdgeStrengthMax,
		)
	}
	switch s.PlatformMarker {
	case OverlayPlatformMarkerStripe, OverlayPlatformMarkerIcon, OverlayPlatformMarkerBoth, OverlayPlatformMarkerNone:
	default:
		fields[key("platform_marker")] = "Choose stripe, icon, both, or none."
	}
	if !validOverlayHexColor(s.PanelColor) {
		fields[key("panel_color")] = "Enter a hex color such as #000000."
	}
	if s.PanelOpacity < overlayPanelOpacityMin || s.PanelOpacity > overlayPanelOpacityMax {
		fields[key("panel_opacity")] = "Panel opacity must be between 0 and 1."
	}
	if s.PanelImage != "" && !validOverlayAssetName(s.PanelImage) {
		fields[key("panel_image")] = "Panel image must be a stored overlay asset filename."
	}
	switch s.PanelImageFit {
	case OverlayPanelImageFitCover, OverlayPanelImageFitContain, OverlayPanelImageFitFill, OverlayPanelImageFitTile:
	default:
		fields[key("panel_image_fit")] = "Choose cover, contain, fill, or tile."
	}
	switch s.PanelImageScope {
	case OverlayPanelImageScopeMessage, OverlayPanelImageScopeColumn:
	default:
		fields[key("panel_image_scope")] = "Choose message or column."
	}
	if s.BorderWidth < 0 || s.BorderWidth > overlayBorderWidthMax {
		fields[key("border_width")] = fmt.Sprintf("Border width must be between 0 and %d px.", overlayBorderWidthMax)
	}
	if !validOverlayHexColor(s.BorderColor) {
		fields[key("border_color")] = "Enter a hex color such as #ffffff."
	}
	if s.BorderRadius < 0 || s.BorderRadius > overlayBorderRadiusMax {
		fields[key("border_radius")] = fmt.Sprintf("Border radius must be between 0 and %d px.", overlayBorderRadiusMax)
	}
	return fields
}

func validOverlayHexColor(value string) bool {
	return overlayHexColorRe.MatchString(strings.TrimSpace(value))
}

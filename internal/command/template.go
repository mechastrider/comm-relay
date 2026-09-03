package command

import (
	"strconv"
	"strings"
)

// TemplateVars holds splash template placeholder values.
type TemplateVars struct {
	Viewer   string
	Streamer string
	Points   int
	Message  string
}

// SubstituteTemplate replaces known placeholders in splash templates.
// Unknown placeholders are left unchanged.
func SubstituteTemplate(template string, vars TemplateVars) string {
	text := strings.ReplaceAll(template, "{viewer}", vars.Viewer)
	text = strings.ReplaceAll(text, "{name}", vars.Viewer)
	text = strings.ReplaceAll(text, "{streamer}", vars.Streamer)
	text = strings.ReplaceAll(text, "{points}", strconv.Itoa(vars.Points))
	text = strings.ReplaceAll(text, "{message}", vars.Message)

	return text
}

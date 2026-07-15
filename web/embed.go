// Package web embeds static admin, OBS dock, overlay, and shared assets for release builds.
// For local UI work without recompile, run comm-relay-server with -web ./web.
package web

import "embed"

// FS contains admin/, dock/, overlay/, and shared/ trees (siblings of this file).
//
//go:embed admin dock overlay shared
var FS embed.FS

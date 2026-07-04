// Package web embeds static admin, OBS dock, and overlay assets for release builds.
// For local UI work without recompile, run comm-relay-server with -web ./web.
package web

import "embed"

// FS contains admin/, dock/, and overlay/ trees (siblings of this file).
//
//go:embed admin dock overlay
var FS embed.FS

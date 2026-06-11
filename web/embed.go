// Package web embeds static admin and OBS overlay assets for release builds.
// For local UI work without recompile, run comm-relay-server with -web ./web.
package web

import "embed"

// FS contains admin/ and overlay/ trees (siblings of this file).
//
//go:embed admin overlay
var FS embed.FS

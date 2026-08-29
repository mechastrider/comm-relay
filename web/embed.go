// Package web embeds static admin, OBS dock, overlay, leaderboard, and shared assets for release builds.
// For local UI work without recompile, run comm-relay-server with -web ./web.
package web

import "embed"

// FS contains admin/, dock/, overlay/, leaderboard/, and shared/ trees (siblings of this file).
//
//go:embed admin dock overlay leaderboard shared
var FS embed.FS

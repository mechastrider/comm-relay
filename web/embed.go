// Package web embeds static admin, OBS dock, overlay, leaderboard, and shared assets for release builds.
// Build the admin with npm run build before compiling Go. For live admin development,
// use task web:dev; -web ./web serves the last compiled admin and unbundled OBS surfaces.
package web

import "embed"

// FS contains compiled admin/dist/, dock/, overlay/, leaderboard/, alert/, recap/, and shared/ trees (siblings of this file).
//
//go:embed admin/dist/* dock overlay leaderboard alert recap shared
var FS embed.FS

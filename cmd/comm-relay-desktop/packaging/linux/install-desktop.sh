#!/usr/bin/env bash
# Install CommRelay into the current user's application menu (Linux Mint, Ubuntu, …).
# The desktop app also does this automatically on first launch; use this script if
# you want the menu entry before the first run, or after moving the install folder.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec_path="$script_dir/CommRelay"
icon_src="$script_dir/comm-relay.png"
app_id="comm-relay"

if [[ ! -x "$exec_path" ]]; then
  echo "CommRelay binary not found or not executable: $exec_path" >&2
  exit 1
fi
if [[ ! -f "$icon_src" ]]; then
  echo "Icon not found: $icon_src" >&2
  exit 1
fi

apps_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
icons_dir="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps"
pixmaps_dir="${XDG_DATA_HOME:-$HOME/.local/share}/pixmaps"
mkdir -p "$apps_dir" "$icons_dir" "$pixmaps_dir"

cp "$icon_src" "$icons_dir/${app_id}.png"
cp "$icon_src" "$pixmaps_dir/${app_id}.png"

icon_path="$icons_dir/${app_id}.png"
desktop_path="$apps_dir/${app_id}.desktop"
cat >"$desktop_path" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=CommRelay
Comment=Local multi-platform chat overlay for OBS
Exec=$exec_path
Icon=$icon_path
Terminal=false
Categories=AudioVideo;Network;
StartupNotify=true
StartupWMClass=CommRelay
EOF

chmod 644 "$desktop_path"
update-desktop-database "$apps_dir" >/dev/null 2>&1 || true

echo "Installed desktop entry: $desktop_path"
echo "You may need to log out/in or restart the panel for the icon to appear."

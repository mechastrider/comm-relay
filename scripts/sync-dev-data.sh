#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
src="${COMM_RELAY_DATA_SOURCE:-${XDG_CONFIG_HOME:-$HOME/.config}/comm-relay}"
dest="$repo_root/var/data"

if [[ ! -d "$src" ]]; then
  echo "Desktop data directory not found: $src" >&2
  exit 1
fi

mkdir -p "$dest"

for name in config.json comm-relay.db comm-relay.db-wal comm-relay.db-shm; do
  if [[ -f "$src/$name" ]]; then
    cp -f "$src/$name" "$dest/$name"
    echo "copied $name"
  fi
done

if [[ -d "$src/overlay-assets" ]]; then
  mkdir -p "$dest/overlay-assets"
  cp -af "$src/overlay-assets/." "$dest/overlay-assets/"
  count="$(find "$dest/overlay-assets" -maxdepth 1 -type f | wc -l | tr -d ' ')"
  echo "copied overlay-assets ($count files)"
fi

echo "Dev data ready at $dest"

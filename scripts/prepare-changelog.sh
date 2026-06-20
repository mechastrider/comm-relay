#!/usr/bin/env bash
# Promote CHANGELOG.md [Unreleased] to a versioned release section (Keep a Changelog).
#
# Usage:
#   scripts/prepare-changelog.sh 0.1.2 [YYYY-MM-DD]
#   scripts/prepare-changelog.sh 0.1.2 --check-only
#
# If the version section already exists, the script exits successfully without changes.

set -euo pipefail

VERSION="${1:?version required (for example 0.1.2)}"
CHANGELOG="${CHANGELOG_FILE:-CHANGELOG.md}"

DATE=""
CHECK_ONLY=false

shift
while [ "$#" -gt 0 ]; do
	case "$1" in
	--check-only)
		CHECK_ONLY=true
		;;
	--*)
		echo "unknown option: $1" >&2
		exit 1
		;;
	*)
		if [ -n "$DATE" ]; then
			echo "unexpected extra argument: $1" >&2
			exit 1
		fi
		DATE="$1"
		;;
	esac
	shift
done

if [ -z "$DATE" ]; then
	DATE="$(date -u +%Y-%m-%d)"
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
	echo "invalid changelog version: $VERSION" >&2
	exit 1
fi

if [ ! -f "$CHANGELOG" ]; then
	echo "changelog file not found: $CHANGELOG" >&2
	exit 1
fi

if grep -qE "^## \\[${VERSION}\\]" "$CHANGELOG"; then
	echo "changelog section [${VERSION}] already exists"
	exit 0
fi

if ! grep -qE '^## \[Unreleased\]' "$CHANGELOG"; then
	echo "missing [Unreleased] section in $CHANGELOG" >&2
	exit 1
fi

if ! awk '
	/^## \[Unreleased\]/ { in_unreleased = 1; next }
	in_unreleased && /^## \[/ { exit }
	in_unreleased && /^### / { found = 1; exit }
	END { exit(found ? 0 : 1) }
' "$CHANGELOG"; then
	echo "[Unreleased] has no release notes (expected at least one ### section)" >&2
	exit 1
fi

if [ "$CHECK_ONLY" = true ]; then
	echo "[Unreleased] is ready for version ${VERSION}"
	exit 0
fi

tmp="$(mktemp)"
awk -v ver="$VERSION" -v dt="$DATE" '
	/^## \[Unreleased\]/ {
		print "## [Unreleased]"
		print ""
		print "## [" ver "] - " dt
		next
	}
	{ print }
' "$CHANGELOG" >"$tmp"
mv "$tmp" "$CHANGELOG"

echo "promoted [Unreleased] to [${VERSION}] - ${DATE} in ${CHANGELOG}"

#!/usr/bin/env bash
# build-journal.sh — Sync journal markdown files into docs/journal/ and generate manifest.json
# Run from the habitat repo root: ./build-journal.sh
# Called by the site sync cron job and can be run manually.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
JOURNAL_SRC="$REPO_ROOT/journal"
JOURNAL_DEST="$REPO_ROOT/docs/journal"

# Ensure destination exists
mkdir -p "$JOURNAL_DEST"

# Copy all .md files from journal/ to docs/journal/
if [ -d "$JOURNAL_SRC" ] && ls "$JOURNAL_SRC"/*.md 1>/dev/null 2>&1; then
    cp "$JOURNAL_SRC"/*.md "$JOURNAL_DEST/"
else
    echo "No journal entries found in $JOURNAL_SRC"
    exit 0
fi

# Generate manifest.json — entries sorted newest first
# Each entry has: file (filename), date (extracted from filename YYYY-MM-DD)
echo '{"entries":[' > "$JOURNAL_DEST/manifest.json"

FIRST=true
for f in $(ls -r "$JOURNAL_DEST"/*.md 2>/dev/null); do
    BASENAME=$(basename "$f")
    # Extract date from filename (expects YYYY-MM-DD.md)
    DATE="${BASENAME%.md}"
    
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ',' >> "$JOURNAL_DEST/manifest.json"
    fi
    
    echo -n "{\"file\":\"$BASENAME\",\"date\":\"$DATE\"}" >> "$JOURNAL_DEST/manifest.json"
done

echo ']}' >> "$JOURNAL_DEST/manifest.json"

echo "Journal built: $(ls "$JOURNAL_DEST"/*.md 2>/dev/null | wc -l) entries synced to docs/journal/"

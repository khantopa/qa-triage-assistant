#!/usr/bin/env bash
# Run this once in a project that installs the qa-triage-assistant plugin.
# Creates the local reports/ directory for triage report output.
set -euo pipefail

mkdir -p reports

# Add to .gitignore if not already present
touch .gitignore
grep -qxF "reports/" .gitignore || echo "reports/" >> .gitignore
grep -qxF "temp/" .gitignore || echo "temp/" >> .gitignore

echo "Project initialized for QA Triage Assistant"

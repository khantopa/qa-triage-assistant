#!/usr/bin/env bash
set -euo pipefail

#===============================================================================
# QA Triage Assistant - Claude Code Wrapper
#===============================================================================
#
# Usage:
#   ./triage.sh <zip_file> [branch] [run_type]
#
# Examples:
#   ./triage.sh /path/to/test-reports.zip
#   ./triage.sh /path/to/test-reports.zip release/boo "Run 1"
#   ./triage.sh /path/to/test-reports.zip release/boo "Run 2"
#
# Prerequisites:
#   - Claude Code CLI installed (`claude` command available)
#   - Git repos cloned locally (paths configured below)
#   - ZIP file containing test reports from Jenkins
#
#===============================================================================

# ── Configuration ─────────────────────────────────────────────────────────────
FE_REPO="${FE_REPO:-/Users/khantopa/dev/sa-v3}"
BE_REPO="${BE_REPO:-/Users/khantopa/dev/seeking}"
QA_REPO="${QA_REPO:-/Users/khantopa/dev/sa-ui-automation}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
TEMP_DIR="${PROJECT_DIR}/temp"
REPORTS_DIR="${PROJECT_DIR}/reports"

# ── Argument parsing ─────────────────────────────────────────────────────────
ZIP_FILE="${1:-}"
BRANCH="${2:-}"
RUN_TYPE="${3:-}"

if [[ -z "$ZIP_FILE" ]]; then
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  QA Triage Assistant                                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: ./triage.sh <zip_file> [branch] [run_type]"
    echo ""
    echo "Arguments:"
    echo "  zip_file   Path to ZIP containing test reports (required)"
    echo "  branch     Target release branch, e.g. release/boo (optional)"
    echo "  run_type   'Run 1' or 'Run 2' (optional)"
    echo ""
    echo "Examples:"
    echo "  ./triage.sh ./test-reports.zip"
    echo "  ./triage.sh ./test-reports.zip release/boo 'Run 1'"
    echo ""
    echo "Configuration (set via env vars or edit this script):"
    echo "  FE_REPO=$FE_REPO"
    echo "  BE_REPO=$BE_REPO"
    echo "  QA_REPO=$QA_REPO"
    exit 1
fi

if [[ ! -f "$ZIP_FILE" ]]; then
    echo "ERROR: ZIP file not found: $ZIP_FILE"
    exit 1
fi

ZIP_FILE="$(cd "$(dirname "$ZIP_FILE")" && pwd)/$(basename "$ZIP_FILE")"

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo "── Pre-flight checks ──────────────────────────────────"

if ! command -v claude &>/dev/null; then
    echo "ERROR: 'claude' CLI not found. Install Claude Code first."
    echo "  npm install -g @anthropic-ai/claude-code"
    exit 1
fi

REPOS_AVAILABLE=()
for repo_var in FE_REPO BE_REPO QA_REPO; do
    repo_path="${!repo_var}"
    if [[ -d "$repo_path/.git" ]]; then
        echo "  ✓ ${repo_var}=${repo_path}"
        REPOS_AVAILABLE+=("${repo_var}=${repo_path}")
    else
        echo "  ✗ ${repo_var}=${repo_path} (not found or not a git repo)"
    fi
done

if [[ ${#REPOS_AVAILABLE[@]} -eq 0 ]]; then
    echo ""
    echo "WARNING: No git repos found. Git correlation will be skipped."
fi

# ── Prepare workspace ────────────────────────────────────────────────────────
echo ""
echo "── Preparing workspace ────────────────────────────────"

rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR" "$REPORTS_DIR"

echo "  Extracting: $ZIP_FILE"
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"
echo "  Extracted to: $TEMP_DIR"

FILE_COUNT=$(find "$TEMP_DIR" -type f | wc -l)
echo "  Files found: $FILE_COUNT"
find "$TEMP_DIR" -type f | head -20 | while read -r f; do
    echo "    $(basename "$f")"
done
if [[ $FILE_COUNT -gt 20 ]]; then
    echo "    ... and $((FILE_COUNT - 20)) more"
fi

# ── Build the prompt ─────────────────────────────────────────────────────────
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="${REPORTS_DIR}/triage-report-${TIMESTAMP}.md"

PROMPT="Analyze the test reports extracted in temp/ directory for QA failure triage.

## Context
- ZIP file: $(basename "$ZIP_FILE")
- Files extracted: ${FILE_COUNT} files in temp/
"

if [[ -n "$BRANCH" ]]; then
    PROMPT+="- Target branch: ${BRANCH}
"
fi

if [[ -n "$RUN_TYPE" ]]; then
    PROMPT+="- Run type: ${RUN_TYPE}
"
fi

PROMPT+="
## Available Repositories
"
for repo_info in "${REPOS_AVAILABLE[@]:-}"; do
    if [[ -n "$repo_info" ]]; then
        PROMPT+="- ${repo_info}
"
    fi
done

PROMPT+="
## Instructions

Run /qa-triage:triage to execute the full workflow:

1. Stage 0 FIRST — call mcp__qa-triage__match_patterns to run hypothesis engine
2. Inventory all files in temp/
3. Parse all failures from the reports
4. Extract build context (commit SHA, branch, build number)
5. Run Evidence-First Gate before any git correlation
6. Git correlation scoped to implicated repo only (not all 3 by default)
7. Classify each failure with evidence and confidence levels
8. Generate the triage report to: ${REPORT_FILE}
9. Stage 10 — run feedback capture before closing

Start by calling mcp__qa-triage__match_patterns, then listing what's in temp/."

# ── Run Claude Code ──────────────────────────────────────────────────────────
echo ""
echo "── Running Claude Code triage analysis ────────────────"
echo "  Report will be saved to: $REPORT_FILE"
echo ""

cd "$PROJECT_DIR"

claude --dangerously-skip-permissions -p "$PROMPT"

# ── Post-run ─────────────────────────────────────────────────────────────────
echo ""
echo "── Triage complete ────────────────────────────────────"

if [[ -f "$REPORT_FILE" ]]; then
    echo "  Report saved: $REPORT_FILE"
    echo ""
    echo "  To view: cat $REPORT_FILE"
else
    echo "  NOTE: Report file not found at expected path."
    echo "  Check reports/ directory for the latest report."
    LATEST=$(ls -t "$REPORTS_DIR"/triage-report-*.md 2>/dev/null | head -1)
    if [[ -n "$LATEST" ]]; then
        echo "  Latest report: $LATEST"
    fi
fi

echo ""
echo "  Cleaning up temp/ directory..."
rm -rf "$TEMP_DIR"
echo "  Done."
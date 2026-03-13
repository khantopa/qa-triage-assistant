# QA Impediment Triage Assistant

AI-assisted root cause analysis and ownership attribution for Run 1 / Run 2 QA failures, powered by Claude Code.

## Quick Start

### 1. Configure repo paths

Edit `scripts/triage.sh` and update the three repo paths at the top:

```bash
FE_REPO=/path/to/fe-repo
BE_REPO=/path/to/be-repo
QA_REPO=/path/to/qa-automation-repo
```

Or set them as environment variables:

```bash
export FE_REPO=/home/you/repos/fe-app
export BE_REPO=/home/you/repos/be-api
export QA_REPO=/home/you/repos/qa-automation
```

### 2. Run a triage

```bash
# Basic — just a ZIP file
./scripts/triage.sh /path/to/test-reports.zip

# With branch context
./scripts/triage.sh /path/to/test-reports.zip release/boo

# With branch and run type
./scripts/triage.sh /path/to/test-reports.zip release/boo "Run 1"
```

### 3. View the report

Reports are saved to `reports/triage-report-<timestamp>.md`.

```bash
# View the latest report
cat reports/$(ls -t reports/ | head -1)
```

## Alternative: Direct Claude Code Usage

If you prefer to work interactively instead of using the wrapper script:

```bash
cd /path/to/qa-triage-assistant

# Start Claude Code in this directory (it reads CLAUDE.md automatically)
claude

# Then in the Claude Code session:
# "I have test reports at /path/to/reports.zip — please analyze them for Run 1 triage on branch release/boo"
```

## Project Structure

```
qa-triage-assistant/
├── CLAUDE.md              # Claude Code project instructions (core brain)
├── README.md              # This file
├── scripts/
│   └── triage.sh          # Wrapper script for one-command triage
├── prompts/               # (reserved for future prompt templates)
├── reports/               # Generated triage reports land here
└── temp/                  # Temporary extraction directory (auto-cleaned)
```

## What It Does

1. Extracts your ZIP of test reports
2. Parses JUnit XML, HTML reports, and console logs
3. Identifies failing tests with error messages and stack traces
4. Correlates failures with recent git commits on the release branch
5. Classifies each failure: FE code / BE code / QA automation / CI config
6. Generates a structured Markdown triage report with:
   - Root cause analysis per failure
   - Suspected commit and author
   - Confidence level (HIGH / MEDIUM / LOW)
   - Recommended fix and owner

## What It Does NOT Do

- Modify any code
- Create or assign tickets
- Push commits or create branches
- Make autonomous decisions

All output is advisory. Humans confirm and act.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/overview) installed
- Git repos cloned locally
- Node.js 18+ (for Claude Code)
- `unzip` command available

## Adapting to Your Test Reports

Since test report formats vary, after your first run you may want to update `CLAUDE.md` with specifics about your report structure. For example:

- If your JUnit XMLs have a specific naming convention
- If your console logs include custom markers
- If your QA framework uses specific error types

The `CLAUDE.md` file is the "brain" — tune it based on what works for your setup.

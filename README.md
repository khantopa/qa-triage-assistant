# QA Triage Assistant

Claude Code plugin for triaging QA automation failures from Serenity BDD test reports. Features a pattern-matching hypothesis engine, evidence-first git correlation, and a feedback loop that improves with every run.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- Git repos cloned locally:
  - Front-end (`sa-v3`)
  - Back-end (`seeking`)
  - QA automation (`sa-ui-automation`)
- Access to test report ZIPs from Jenkins

## Installation

### As a plugin directory (local development)

```bash
claude --plugin-dir ./qa-triage-assistant
```

### Configuration

Set repo paths as environment variables:

```bash
export FE_REPO=/path/to/sa-v3
export BE_REPO=/path/to/seeking
export QA_REPO=/path/to/sa-ui-automation
```

### Project setup

Run once in a project where you want to use the plugin:

```bash
./scripts/init-project.sh
```

## Usage

### Triage a test report

```
/qa-triage:triage
```

Claude will ask for the ZIP file path, then execute the full workflow:

1. **Stage 0** — Hypothesis Engine matches failures against known patterns via MCP
2. **Steps 1-2** — Extract and parse failures from the ZIP
3. **Step 3** — Stability gate checks test history via MCP
4. **Steps 4-7** — Group, correlate, classify with evidence
5. **Step 8** — Generate report locally, update history via MCP
6. **Stage 10** — Feedback capture (always runs)

### Capture feedback

```
/qa-triage:feedback
```

Use this to capture feedback for a completed triage run, amend existing feedback, or review pattern candidates for promotion.

### Shell wrapper

```bash
./triage.sh /path/to/test-reports.zip [branch] [run_type]
```

## Architecture

```
Plugin (read-only)              MCP Server                    Database
┌─────────────────┐    tools    ┌──────────────┐    SQL    ┌──────────┐
│ commands/        │───────────>│ match_patterns│──────────>│ patterns │
│ skills/          │            │ get_protocol  │           │ history  │
│ agents/          │            │ save_feedback │           │ feedback │
│                  │            │ get_history   │           │ runs     │
│ writes reports   │            │ update_history│           │          │
│ to ./reports/    │            │ create_pattern│           │          │
└─────────────────┘            └──────────────┘            └──────────┘
```

- **Plugin** is read-only — never modifies source code, creates branches, or pushes commits
- **Reports** stay local in `./reports/` — they are project-scoped working artifacts
- **Patterns, history, feedback** are shared via the MCP server database
- **Skills load lazily** — only activated at the relevant workflow step

## Pattern Library

The hypothesis engine matches failures against known patterns before running expensive git correlation. Patterns grow through the feedback loop.

Current patterns:
- `face-comparison` — Duplicate test photos causing false selfie comparison failures
- `dragyn-false-positive` — Dragyn ML misclassification of test images
- `config-setup-inversion` — Setup step sending inverted boolean to config API
- `admin-session-cookie-survival` — Admin session cookies surviving user switch

## License

MIT

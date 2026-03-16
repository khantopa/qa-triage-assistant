---
description: Run a full QA failure triage session against a Serenity test report ZIP
argument-hint: [zip_file_path]
allowed-tools: [Bash, Read, Write, Glob, Grep, mcp__qa-triage__match_patterns, mcp__qa-triage__get_pattern_protocol, mcp__qa-triage__save_feedback, mcp__qa-triage__get_history, mcp__qa-triage__update_history, mcp__qa-triage__create_pattern]
---

# /triage Command

Runs a full QA failure triage session against a Serenity test report ZIP.

## Usage

```
/triage
```

Claude will ask for the ZIP file path, then execute the full workflow automatically.

## What happens

### Stage 0 — Hypothesis Engine (first)

Call `mcp__qa-triage__match_patterns` with the failure inventory. Match each failure against known patterns.

- Pattern match found → call `mcp__qa-triage__get_pattern_protocol` and execute that pattern's protocol directly
- No match → run standard investigation + mandatory feedback capture after

### Steps 1–2 — Extract & Parse

Extract ZIP to `temp/`. Parse failures from CSV, JUnit XML, Serenity JSON.
Build failure inventory: test name, error message, stack trace, URL context.

### Step 3 — Stability & History Gate

Call `mcp__qa-triage__get_history` with test keys. Route each failure to Skip / Quick / Full / Critical tier.

### Step 4 — Group by Common Root Cause

Group failures sharing the same error signature before git correlation.

### Step 5 — Evidence-First Gate (before any git)

For each failure, read from Serenity JSON:

- actual_value vs expected_value
- error_type: element missing / value mismatch / timeout
- failing stack frame: which repo owns it

Only run git correlation if evidence-first gate confirms it is needed.

### Step 6 — Git Correlation (scoped)

Fetch only the repo owning the failing stack frames — not all 3 by default.
Check QA shared helpers first before FE or BE repos.

### Step 7 — Classify & Root Cause

Assign classification, confidence, sprint trigger, root cause, chain of causation.

### Step 8 — Generate Report & Update History

Save to `reports/triage-report-<timestamp>.md`. Call `mcp__qa-triage__update_history` with results.

### Step 9 — Clean Up

Delete `temp/` directory.

### Stage 10 — Feedback Capture (always, every run)

Ask user to choose Mode A (auto-draft, 2 min) or Mode B (interactive, 5 min).
Call `mcp__qa-triage__save_feedback` with feedback entries.
Offer pattern promotion for any new candidates.

## Key rules

- Hypothesis engine runs BEFORE everything else
- Evidence-First Gate runs BEFORE any git command
- QA shared helpers checked BEFORE FE or BE repos
- Feedback capture is non-negotiable — runs after every single triage

# Git Correlation Rules

## Evidence-First Gate (Run Before Any Git Command)

Before touching any repo, extract these fields from the Serenity JSON for each failure:

| Field            | Where to find it                                  |
| ---------------- | ------------------------------------------------- |
| `actual_value`   | `exception.message` — the value that was returned |
| `expected_value` | `exception.message` — the value the test wanted   |
| `failing_file`   | Top 3 stack trace frames — which file and line    |
| `error_type`     | Element missing vs value mismatch vs timeout      |

### Decision: Does this failure even need git?

```
IF error_type == "element missing" (NoSuchElementException, ElementNotFound):
  → Likely selector broken or rendering issue → git correlation needed
  → BUT: check QA shared helpers first (see 01-workflow.md standing rules)

IF error_type == "value mismatch" (actual_value exists but != expected_value):
  → Upstream data or third-party suspect
  → Ask: "What produced this value?" BEFORE opening any repo
  → Check BE repo only if value comes from an API response
  → Skip FE repo entirely unless stack trace explicitly points to FE source
  → Example: Dragyn reason mismatch → read Serenity recordReportData first,
    never open BE repo until actual reason is confirmed from Serenity JSON

IF error_type == "timeout" (WaitUntil, StaleElement):
  → Check stability history first — if stability = 0.0, classify Flaky, skip git
  → Only run git if history shows test was previously stable (stability >= 0.5)

IF error_type == "config/setup assertion" (step named 'as Enabled' / 'as Disabled'):
  → Check config-setup-inversion pattern before any git correlation
  → Read actual PUT body from Serenity REST interactions or console log first
```

**Never run git correlation to explain a value mismatch without first understanding
what value actually came back and where it came from.**

---

## Stack Trace Repo Routing (Run After Evidence-First Gate)

Scope git correlation to the repo that owns the files in the top 3 stack frames.

```
IF top stack frames are in QA test files (definitions/, steps/, pages/):
  → Check QA shared helpers first (AdminLoginSteps, LoginSteps,
    ProfileWallSteps, BasePageObject, BaseStepObject)
  → Then QA_REPO for the specific test file
  → Do NOT scan FE or BE unless QA frames reference an API call

IF top stack frames are in FE source files (.tsx, .ts, .js):
  → FE_REPO only for the specific component files in the trace
  → Do NOT assume all FE is relevant — scope to the exact files

IF top stack frames are in BE source files (.java, .php service files):
  → BE_REPO only for the specific service/controller files in the trace

IF stack frames span multiple repos:
  → Fetch only the specific files implicated, not a full repo scan
```

**Default is NOT all 3 repos. Default is the repo owning the failing stack frame.**

---

## URL-Based Repo Routing (Fallback Only)

Apply ONLY when stack trace is ambiguous. Stack trace routing takes priority.

| Failing Step URL      | Repos to Check                                      |
| --------------------- | --------------------------------------------------- |
| `admin.*` only        | BE_REPO + QA_REPO (admin pages are server-rendered) |
| React app pages       | FE_REPO + BE_REPO + QA_REPO                         |
| Mixed (admin + React) | Check which page the **failing step** occurred on   |

**How to determine URL context**: In the Serenity JSON for the failing test step,
look at `url`, `restQuery`, or page object references.

Only ask the user for branches for the repos you actually need.

---

## Fetch Latest Before Any Analysis

```bash
git -C <repo_path> fetch origin <branch>
git -C <repo_path> checkout <branch>
git -C <repo_path> pull origin <branch>
```

If branch not found locally:

```bash
git -C <repo_path> fetch origin
git -C <repo_path> branch -a | grep <branch_name>
git -C <repo_path> checkout <branch>
git -C <repo_path> pull origin <branch>
```

Always use `git -C <path>`. Never `cd` into a repo.

---

## Finding the Sprint Trigger (Critical Rule)

**The goal is to find the commit that caused the failure THIS sprint —
not just any related historical commit.**

### Step 1: Look at the sprint window first (last 14 days)

```bash
# Commits in the last 14 days touching files implicated in the failure
git -C <repo_path> log --oneline --since="14 days ago" -- <file_path>
```

If a recent commit (within 14 days) touches the failing area → likely the sprint trigger.

### Step 2: If no recent commits, widen to 30 days then 90 days

Only go further back if nothing recent is found. State clearly when and why.

### Step 3: If git blame points to an old commit, ask "Why now?"

When `git blame` returns a commit that is **months old**, do NOT accept it as direct cause:

1. Was this test recently added to the run suite?
2. Was a related step definition changed more recently?
3. Was there a framework/dependency upgrade that changed behaviour?
4. Did an external service change behaviour?

### Step 4: Report the chain of causation

Always present:

- **Sprint Trigger**: Most recent commit that directly caused the failure
- **Root Cause** (if different): Older commit introducing the underlying defect
- **Link**: How root cause + trigger combine to produce the failure

---

## Git Commands Reference

```bash
# Recent commits on the branch
git -C <repo_path> log --oneline -20 <branch>

# Commits touching a specific file (with follow for renames)
git -C <repo_path> log --oneline --follow -- <file_path>

# Blame a specific line range
git -C <repo_path> blame <file> -L <start>,<end>

# Commits since N days ago touching a path
git -C <repo_path> log --oneline --since="14 days ago" -- <path>

# Search for a specific string change across history
git -C <repo_path> log --oneline -S "search_term" -- <file_path>
```

---

## Multi-Repo Parallelism

When multiple repos ARE confirmed relevant (after routing rules), use the Agent tool
to run git correlation in parallel — one subagent per repo — then synthesise results.

Each subagent should:

1. Fetch and pull the branch
2. Check sprint window (14 days) for relevant commits
3. Run blame on implicated files
4. Return: recent commits list, blame output, suspected sprint trigger

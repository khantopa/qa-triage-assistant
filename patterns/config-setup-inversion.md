# Pattern: Config Setup Step Inversion

**ID**: config-setup-inversion
**Created**: 2026-03-13
**Last Validated**: 2026-03-13
**Confidence**: HIGH
**Times Used**: 1 | **Times Correct**: 1

---

## TRIGGER

Activate this pattern when ALL of the following are true:

- Test has one or more setup steps that call a config/platform-settings API (Zeus, admin config, feature flags)
- The test fails at a **functional step** that depends on a feature being ON (e.g. profile not appearing in a queue, feature not triggering, flow not routing correctly)
- The failure is a **timeout or element not found** — not an assertion mismatch on a value

**Common step patterns that trigger this:**
- `API - Update 'Auto Moderate Settings' for '(.+)' as 'Enabled'`
- `API - Update 'Auto Moderate Settings' for '(.+)' as 'Disabled'`
- `API - Admin Turn ON/OFF ...`
- Any step that sets a boolean config via API in the `@Before` or `Given` phase

**Do NOT activate** when the failure stack trace points directly to a missing element caused by a UI change — investigate FE/BE first in that case.

---

## PROTOCOL

Execute these steps in strict order. **Never assume the value is wrong — prove it from evidence.**

### Step 1 — Extract config API calls from the Serenity JSON (failing run)

The Serenity JSON records REST interactions including request bodies. Use this first — do NOT reach for the console log yet.

```python
# Extract all REST calls from the Serenity JSON for the failing test
import json, sys

with open("<serenity_json_file>") as f:
    data = json.load(f)

def find_rest(steps, depth=0):
    for s in steps:
        # REST interactions captured by Serenity
        for r in s.get('restQuery', []):
            print(f"[REST] {r.get('method')} {r.get('path')} → body: {r.get('content')}")
        # reportData entries (e.g. recordReportData calls)
        for e in s.get('reportData', []):
            print(f"[DATA] {e.get('title')} → {e.get('contents')}")
        find_rest(s.get('children', []), depth+1)

find_rest(data.get('testSteps', []))
```

Look for any `PUT` / `POST` to config/Zeus endpoints. Record:
- **Config key / slug / id**
- **Value sent** (`{"value": true}` or `{"value": false}` or enum string)

**If Serenity did not capture the REST body** (empty `restQuery`, no `reportData` for config calls) → proceed to Step 1b.

#### Step 1b — Fallback: Ask user for console log

Only if Serenity JSON has no REST body evidence:

> "The Serenity JSON doesn't have the request body for the config setup calls. Can you provide the Jenkins console log for the failing run?"

Do not assume what value was sent.

---

### Step 2 — Extract config API calls from the Serenity JSON (passing run)

Repeat Step 1 against the Serenity JSON of a known passing run.

**If no passing Serenity JSON is available** → ask user for the passing console log. Do not assume what the passing run sent.

**Key question**: Does the failing run send the **opposite boolean** to what the passing run sends?

| Step Name says | Passing run sends | Failing run sends | Verdict |
|---|---|---|---|
| `as 'Enabled'` | `{"value":true}` | `{"value":false}` | **INVERSION BUG** |
| `as 'Disabled'` | `{"value":false}` | `{"value":true}` | **INVERSION BUG** |
| `as 'Enabled'` | `{"value":true}` | `{"value":true}` | Not this pattern |

If the values match → this pattern does not apply. Run standard investigation.

---

### Step 3 — Locate the step definition

Find the step definition method for the mismatched step:

```bash
# Search QA repo for the step definition
grep -r "as 'Enabled'\|as 'Disabled'\|updateAutoModerate\|updateZeusConfig" \
  <qa_repo>/src/main/java --include="*.java" -l
```

Open the file. Check: is the boolean hardcoded? Does the method name say `Enabled` but pass `false`?

---

### Step 4 — Git log on the step definition file

```bash
git -C <qa_repo> log --oneline --since="14 days ago" -- <step_definition_file>
```

Find the commit in the sprint window that changed the boolean. Confirm with `git show <sha>`.

---

### Step 5 — Check blast radius

The same step definition is used by all tests that call this step. Find all affected tests:

```bash
grep -r "as 'Enabled'\|as 'Disabled'" \
  <qa_repo>/src/test/resources/features --include="*.feature" -l
```

Report all feature files that use the broken step — they are ALL broken, not just the failing test.

---

## TERMINATION CONDITIONS

| Outcome | Classification | Confidence |
|---|---|---|
| Boolean inverted in step definition + sprint-window commit found | QA Automation | HIGH |
| Boolean inverted + no recent commit (old bug, newly exercised) | QA Automation | MEDIUM |
| Values match between passing/failing runs | Not this pattern — continue standard investigation | N/A |

**Recommended fix**: Revert the boolean in the step definition method to match the step name semantics.
**Owner**: QA author of the inverting commit.

---

## KNOWN INSTANCES

### Instance 1 — Probational Approval Disabled (Sprint: release/ercole, 2026-03-13)
- **Test**: Validate Re-moderation for Eye Verification
- **Step**: `API - Update 'Auto Moderate Settings' for 'PROBATIONAL_APPROVAL_ENABLED' as 'Enabled'`
- **Broken call**: `PUT /api/v1/zeus/platform-config/504` → `{"value":false}`
- **Passing call**: `PUT /api/v1/zeus/platform-config/504` → `{"value":true}`
- **Commit**: `b8957e82bb` (Kamna Pamnani, SATHREE-41696, Mar 6 2026) — changed `true` → `false`, commit message "Updated for testing" (debug change never reverted)
- **File**: `AdminApiConfigurationDefinitions.java:30`
- **Effect**: Probational Approval disabled → no profile can route to Escalated Profile Queue → timeout
- **Blast radius**: All tests using `as 'Enabled'` step were sending `false`
- **Lesson**: "Updated for testing" commit messages on step definitions are high-risk for leftover debug inversions. Prioritise checking these commits when the failure is a missing routing/feature behaviour.

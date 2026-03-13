# Pattern: Face / Selfie Comparison Failures

**ID**: face-comparison
**Created**: 2026-03-06
**Last Validated**: 2026-03-06
**Confidence**: HIGH
**Times Used**: 1 | **Times Correct**: 1

---

## TRIGGER

Activate this pattern when ALL of the following are true:

- Test name or story contains any of: `compare faces`, `selfie`, `IPCF`, `liveness`, `face match`
- Error message contains any of: `Selfie Face Match`, `verifyPhotoHasSelfieFaceMatch`, `Expected: a string containing "Yes"`, `Expected: a string containing "No"`
- Test involves photo upload steps for two or more photos

**Do NOT activate** for general photo upload failures that do not involve face comparison assertions.

---

## PROTOCOL

Execute these steps in strict order. Do not skip to git correlation until Step 2 is resolved.

### Step 1 — Validate Test Inputs FIRST (before any code or git investigation)

This is the most important step. Do not touch any repo until inputs are validated.

```bash
# 1a. Identify which PhotoType values are used in the test feature file
grep -n "PhotoType\|APPROVED\|PUBLIC\|PRIVATE\|SELFIE" <qa_repo>/src/test/resources/features/**/*<test_name>*.feature

# 1b. Resolve each PhotoType to its actual file path using the mapping table below
# 1c. Compute MD5 hash of each resolved file
md5 <qa_repo>/src/test/resources/testdata/profile-photos/<resolved_path_1>
md5 <qa_repo>/src/test/resources/testdata/profile-photos/<resolved_path_2>
```

**PhotoType Resolution Map:**
| PhotoType | Resolved Path |
|-----------|--------------|
| `PUBLIC` | `public/<userType>-1.jpg` (userType from test DB) |
| `PRIVATE` | `private/<userType>-1.jpg` |
| `APPROVED_MALE` | `public/misc-photos/approved_male.jpg` |
| `APPROVED_SELFIE` | `public/misc-photos/approved_selfie.jpg` |
| `APPROVED_FEMALE` | `public/misc-photos/approved_female.jpg` |
| Other | `public/misc-photos/<type_lowercase>.jpg` |

### Step 2 — Decision Gate: Are the photos identical?

**IF hashes match (identical photos):**
→ This is a QA Automation issue. Photos are duplicates. Proceed to Step 3.

**IF hashes differ (different photos):**
→ Input is correct. Photos are genuinely different. Skip to Step 5 (BE investigation).

### Step 3 — Trace the Duplicate (QA path only)

Find when and why the files became identical:

```bash
# Check full rename and replacement history for each photo file
git -C <qa_repo> log --oneline --follow -- <path_to_photo_1>
git -C <qa_repo> log --oneline --follow -- <path_to_photo_2>

# Check the sprint trigger - what changed the test to use this PhotoType?
git -C <qa_repo> log --oneline --since="14 days ago" -- <feature_file_path>
git -C <qa_repo> log --oneline --since="14 days ago" -- <step_definition_path>
```

### Step 4 — Chain of Causation (QA path only)

Identify and report:
- **Root Cause commit**: When did the file get replaced/duplicated? (may be months old)
- **Sprint Trigger commit**: What recent change caused this old duplicate to now produce a failure?
- **Why now**: Was this test recently added to the run suite? Was a PhotoType reference changed?

```bash
# Check if test was recently added to the run suite
git -C <qa_repo> log --oneline --since="14 days ago" -- <ci_config_or_suite_file>
```

**Termination**: Classify as `QA Automation` | `HIGH` confidence. Recommend fix: replace duplicate image with genuinely distinct file.

### Step 5 — BE Investigation (Different photos path only)

Photos are genuinely different but face comparison is still failing:

```bash
# Check BE compare-faces pipeline for recent changes
git -C <be_repo> log --oneline --since="14 days ago" -- <compare_faces_service_path>

# Check for API contract changes
git -C <be_repo> log --oneline --since="14 days ago" -- <api_routes_path>

# Check for third-party service config changes (AWS Rekognition etc.)
git -C <be_repo> log --oneline --since="14 days ago" -- <config_path>
```

**Termination**: Classify as `BE Code` with evidence from commits. If no recent BE changes found, classify as `Flaky/Inconclusive` | `LOW` confidence.

---

## TERMINATION CONDITIONS

| Outcome | Classification | Confidence |
|---------|---------------|------------|
| Duplicate photos found, root cause commit identified | QA Automation | HIGH |
| Duplicate photos found, no clear commit (old rename) | QA Automation | MEDIUM |
| Different photos, recent BE commit found | BE Code | HIGH |
| Different photos, no recent changes anywhere | Flaky/Inconclusive | LOW |

---

## KNOWN INSTANCES

### Instance 1 — SD Generous Compare Faces (Sprint: release/boo, 2026-03-06)
- **Root Cause**: `681e0b9cff` (Jul 31, 2025) — `sd-1.jpg` replaced with byte-identical copy of `approved_male.jpg`
- **Sprint Trigger**: `7aab1a7172` (Oct 16, 2025) — feature file changed from `APPROVED_SELFIE` → `APPROVED_MALE`
- **MD5 Match**: `f8802e2b9db7d8a1767ee1ea04eec691` (both files)
- **Fix Applied**: QA team replaced `sd-1.jpg` with distinct image
- **Lesson**: Always check `sd-1.jpg` when SD userType is involved in selfie tests

---

## KNOWN DUPLICATE RISKS

| File | Duplicate Of | Introduced | Ticket |
|------|-------------|-----------|--------|
| `public/sd-1.jpg` | `public/misc-photos/approved_male.jpg` | 2025-07-31 | SATHREE-39105 |

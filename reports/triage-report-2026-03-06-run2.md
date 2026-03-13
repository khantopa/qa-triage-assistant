# QA Triage Report

**Generated**: 2026-03-06 12:00:00
**Run**: Run 2
**Branch**: `release/dopey` (BE/FE), `release/ercole` (QA)
**Build Commit**: N/A (not available in report metadata)

## Summary

- Total failures: 1
- New regressions (Critical): 0
- Existing issues (Full): 1
- Chronic failures (Skipped): 0
- FE Code: 0 | BE Code: 1 | QA Automation: 0 | CI/Config: 0 | Inconclusive: 0

## Failures

### 1. Validate Generous Members Compare Faces

- **Triage Tier**: Full (Stability = 0.0, but user requested investigation)
- **Classification**: BE Code
- **Confidence**: MEDIUM
- **Error**:
  ```
  API should contain HTML element with specified text
  Expected: a string containing "No"
       but: was "Yes"
  ```
- **Stack Trace** (key frames):
  ```
  incube8.seeking.definitions.general.CommonApiDefinitions.apiShouldContainHtmlElementWithAttribute:69
  Feature step: API 'ADMIN_SEARCH' should contain 'HTML Response' with 'Text' as 'Live Selfie Matches Profile Photos: ' and 'Value' as 'No'
  (Liveness-Generous-Compare-Faces.feature:76)
  ```

- **Root Cause**: The test flow is:
  1. Register user, upload 1 selfie + 1 public photo
  2. Liveness verified with different image 'B' → compare faces runs → `compareFacesAttributes` gets an `APPROVE` recommendation → admin shows "Yes"
  3. User deletes ALL photos (feature line 70-71)
  4. Test expects "Live Selfie Matches Profile Photos: **No**" (line 76) — but API still returns "**Yes**"

  The `hasLivenessMatchCompareFaces` flag in `ProfileController.php:344` is computed from `getLivenessMatchCompareFacesAttribute()` (`LivenessVerification.php:155-178`), which checks if ANY `compareFacesAttributes` record has `APPROVE` recommendation. **When photos are deleted, the existing `compareFacesAttributes` records are NOT soft-deleted or re-evaluated**, so the status remains "APPROVED" → "Yes".

  Compare faces is only triggered on **photo upload** (`PhotoRepository.php:3120-3138`), not on photo deletion. There is no listener or job that re-evaluates compare faces match status when photos are removed.

  This is a **long-standing behavioral gap** in the BE — `Stability = 0.0` confirms this test has never passed in recent runs.

- **Suspected Commit**: No single recent commit caused this. The logic in `LivenessVerification::getLivenessMatchCompareFacesAttribute()` has not been modified recently. The closest related commit is `57a68172ec` (SATHREE-41350, auto-approval workflow by Thet Naing), but it only added a new method to `CompareFacesVerificationRepository` without changing the match status computation.

- **Evidence**:
  - `LivenessVerification.php:155-178` — `getLivenessMatchCompareFacesAttribute()` checks `compareFacesAttributes` for APPROVE records but does not filter by whether the associated photos still exist
  - `ProfileController.php:343-344` — passes this value directly to the blade view
  - `profile.blade.php:875` — renders `{{ $hasLivenessMatchCompareFaces ? 'Yes' : 'No' }}`
  - `PhotoRepository.php:3120-3138` — compare faces is triggered on photo upload, but no equivalent cleanup exists for photo deletion
  - No recent commits modified `LivenessVerification.php` or the photo deletion flow

- **Recommended Fix**:
  - **Option A (Model-level)**: Update `getLivenessMatchCompareFacesAttribute()` in `app/Models/LivenessVerification.php` to join/filter `compareFacesAttributes` against existing (non-deleted) photos, so deleted photos' compare face results are excluded
  - **Option B (Event-driven)**: Add a listener on photo deletion that soft-deletes or re-evaluates the associated `compareFacesAttributes` records
  - **Option C (QA-side workaround)**: If this is expected BE behavior (compare faces history is intentionally retained), update the test assertion at feature line 76 to expect "Yes" instead of "No"

- **Recommended Owner**: BE team (Liveness/Compare Faces domain)

---

## Action Items

- [ ] BE team to clarify intended behavior: should "Live Selfie Matches Profile Photos" reflect only currently-existing photos or historical compare faces results?
- [ ] If it should reflect current photos: implement fix in `getLivenessMatchCompareFacesAttribute()` or add photo-deletion event handler
- [ ] If historical behavior is correct: update QA test assertion on `Liveness-Generous-Compare-Faces.feature:76` to expect "Yes"
- [ ] Consider quarantining this test until the behavior is clarified (Stability = 0.0)

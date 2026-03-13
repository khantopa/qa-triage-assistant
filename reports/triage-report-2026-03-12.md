# QA Triage Report

**Generated**: 2026-03-12 11:00 SGT
**Run**: Run 1 (Test_fx)
**Branch**: release/ercole (BE/FE), feature/release-ercole-run1fixes (QA)

## Summary

- Total failures: 1
- New regressions (Critical): 1
- Existing issues (Full/Quick): 0
- Chronic failures (Skipped): 0
- FE Code: 0 | BE Code: 0 | **QA Automation: 1** | CI/Config: 0 | Inconclusive: 0

---

## Failures

### 1. Validate Generous Members Compare Faces

- **Story**: TC [IPCF] - Validate Compare Faces for New Generous Users
- **Triage Tier**: Critical (first-time failure in history)
- **Classification**: QA Automation
- **Confidence**: HIGH
- **Error**: `There should be only one photo with 'Selfie Face Match: No' — Expected: is <1> but: was <2>`
- **Stack Trace** (key frames):
  ```
  incube8.seeking.steps.admin.general.AdminApiSteps.verifyPhotoHasSelfieFaceMatch(AdminApiSteps.java:586)
  incube8.seeking.definitions.admin.api.AdminApiSelfieDefinitions.apiShouldContainHtmlElementWithSelfieMatchWithBorderColor(AdminApiSelfieDefinitions.java:78)
  ```

- **Root Cause**: **Identical test images uploaded as both selfie and public photo**

  The test uploads two photos for profile N001 (`userType = 'SD'`):
  - Selfie: `APPROVED_MALE` → `public/misc-photos/approved_male.jpg`
  - Public: `PUBLIC` → `public/sd-1.jpg`

  **These two files are byte-for-byte identical** (MD5: `f8802e2b9db7d8a1767ee1ea04eec691`).

  The Thanos compare faces service correctly returns `APPROVE` for both — they're literally the same face. The test fails because it expects 1 photo with "Yes" but finds 2.

- **How this happened — two contributing commits**:

  | # | Commit | Author | Date | Change | Effect |
  |---|--------|--------|------|--------|--------|
  | 1 | `681e0b9cff` | Kamna Pamnani | Jul 31, 2025 | SATHREE-39105: Replaced `sd-1.jpg` (212KB, different person) with same image as `approved_male.jpg` (1.6MB) | `sd-1.jpg` and `approved_male.jpg` became identical files |
  | 2 | **`e5d195a0dd`** | Kamna Pamnani | **Oct 14, 2025** | **SATHREE-40603: Changed selfie upload from `APPROVED_SELFIE` to `APPROVED_MALE`** in `IpcfPhotoDefinitions.java:69` | **The selfie photo now resolves to `approved_male.jpg`, which is identical to `sd-1.jpg` (the PUBLIC photo for SD users)** |

  **The direct culprit is commit `e5d195a0dd`** (SATHREE-40603, Oct 14, 2025). Before this change, the selfie used `APPROVED_SELFIE` → `approved_selfie.jpg` (a completely different person, MD5: `97e0b7325898d6a15fd81f46fd47f186`). After this change, the selfie uses `APPROVED_MALE` → `approved_male.jpg`, which is identical to `sd-1.jpg`.

  The diff:
  ```diff
  # IpcfPhotoDefinitions.java:69
  - ipcfPhotoSteps.browseImageAndUploadOnIPCFForBulkUploadVariant(PhotoType.APPROVED_SELFIE.name().toUpperCase());
  + ipcfPhotoSteps.browseImageAndUploadOnIPCFForBulkUploadVariant(PhotoType.APPROVED_MALE.name().toUpperCase());
  ```

- **Why it wasn't caught until now**:

  This test has been on multiple release branches (boo, valentina, wade) since Oct 2025, but `release/ercole` is the **first release to use Serenity 5.1.0** (upgraded from 3.6.12 in commit `7bec94945e` by Venkatesh, SATHREE-41718, Mar 5, 2026). The Serenity upgrade is only on `release/ercole` — not on any previous release. This major version jump likely changed the test execution pipeline, or the test was simply not included in the Jenkins run suite until this release.

- **Evidence**:
  - `md5 sd-1.jpg` = `f8802e2b9db7d8a1767ee1ea04eec691`
  - `md5 approved_male.jpg` = `f8802e2b9db7d8a1767ee1ea04eec691` (identical)
  - `md5 approved_selfie.jpg` = `97e0b7325898d6a15fd81f46fd47f186` (different — the original selfie image)
  - Commit `e5d195a0dd` changed `APPROVED_SELFIE` → `APPROVED_MALE` in `IpcfPhotoDefinitions.java:69`
  - N001 test data: `userType = 'SD'` → `getPhotoUrl(PUBLIC)` → `public/sd-1.jpg`
  - HTML response confirms 2x `Selfie Face Match: <span style="color: green">Yes</span>`
  - No BE code changes — Thanos service is behaving correctly (same image = same face = APPROVE)
  - Serenity upgrade `3.6.12 → 5.1.0` only on `release/ercole` (commit `7bec94945e`, Mar 5, 2026)

- **Recommended Fix** (pick one):
  1. **Revert the photo type change**: Change `IpcfPhotoDefinitions.java:69` back from `APPROVED_MALE` to `APPROVED_SELFIE` — restoring the original selfie image that is a different person from `sd-1.jpg`
  2. **Replace `sd-1.jpg`**: Replace it with a different person's photo so it doesn't match `approved_male.jpg`
  3. **Use both**: Replace `sd-1.jpg` AND keep `APPROVED_MALE` — just ensure they are different people

- **Recommended Owner**: QA Automation team (Kamna Pamnani)

---

## Additional Notes

- The assert message in `AdminApiSteps.java:586` is hardcoded as "Selfie Face Match: No" but the method is parameterized — cosmetic bug worth fixing
- Consider using `qa_override` for compare faces in the liveness QA callback (infrastructure exists from SATHREE-41334) to make this test deterministic rather than dependent on the real Thanos service
- Audit all `public/*.jpg` test images for other duplicates: `sd-1.jpg` is identical to `approved_male.jpg` — check if other user-type photos (sb-1, sm-1, am-1, etc.) are also duplicated with misc-photos images

## Action Items

- [ ] **QA**: Fix the photo type in `IpcfPhotoDefinitions.java:69` — revert to `APPROVED_SELFIE` or replace `sd-1.jpg` with a unique image
- [ ] **QA**: Audit all `public/*.jpg` and `public/misc-photos/*.jpg` for duplicate images across user types
- [ ] **QA**: Fix hardcoded assert message in `AdminApiSteps.java:586`
- [ ] **QA (optional)**: Consider using `qa_override` for compare faces to avoid dependency on external Thanos service

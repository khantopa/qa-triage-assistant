# Common Failure Patterns

## QA Automation False Positives

- Element not found on non-existent DOM nodes → `NoSuchElementError`
- Stale CSS selectors after UI refactor — production code is correct
- Hard-coded test data that expired or was cleaned up
- Race conditions in test setup/teardown (not production race conditions)
- **Duplicate test images**: Same image uploaded for different roles (selfie vs public). Always verify with `md5` hash comparison — different paths can point to identical content
- Test data images replaced in a prior sprint; step definitions changed later to reference the now-duplicate image

## FE Regression Signals

- Recent merge to release branch touching component files
- CSS/layout changes causing visual regression
- Third-party script interference (VWO, GTM, Freshdesk, etc.)
- Bundle/build configuration changes

## BE Regression Signals

- API contract changes (new required fields, removed endpoints)
- Database migration issues
- Service dependency failures
- Auth/session handling changes

## CI/Config Signals

- Node/npm version mismatches
- Missing environment variables
- Docker image updates
- Jenkins pipeline configuration changes

---

## Deep Triage: Photo/Image Upload Flows

For tests involving photo uploads (IPCF, selfie, profile photos):

1. Identify the **PhotoType** enum value in the step definition
2. Follow `getPhotoUrl()` in `BaseStepObject.java` — resolve the switch case
3. Get the test user's `userType` from the SQL dump (`sa_testdata` → `user_profiles`)
4. Resolve the final file path: `PHOTO_PATH` context + type-specific path + extension
5. **Compare file hashes** using `md5` — never assume different paths mean different files
6. Check `git log --follow` on each image file

### PhotoType Mapping Reference

| PhotoType | Path Resolution | Notes |
|-----------|----------------|-------|
| `PUBLIC` | `public/<userType>-1.jpg` | userType from test DB (SD, SB, SM, EM, AM, etc.) |
| `PRIVATE` | `private/<userType>-1.jpg` | Same user type mapping |
| `APPROVED_MALE` | `public/misc-photos/approved_male.jpg` | Default switch case |
| `APPROVED_SELFIE` | `public/misc-photos/approved_selfie.jpg` | Default switch case |
| `APPROVED_FEMALE` | `public/misc-photos/approved_female.jpg` | Default switch case |
| Other types | `public/misc-photos/<type_lowercase>.jpg` | Default switch case |

**Known duplicate risk**: `sd-1.jpg` was made identical to `approved_male.jpg` in SATHREE-39105 (Jul 2025). Always verify image uniqueness when SD users are involved in selfie/compare-faces tests.

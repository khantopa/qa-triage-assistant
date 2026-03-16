import { describe, it, expect } from "vitest";
import { matchPatterns } from "../src/lib/pattern-matcher.js";
import type { FailureData, PatternRow, MatchRules } from "../src/lib/types.js";

const defaultRules: MatchRules = {
  keyword_required: true,
  min_total_score: 4,
  keyword_weight: 2,
  signature_weight: 3,
};

function makePattern(overrides: Partial<PatternRow>): PatternRow {
  return {
    id: "test-pattern",
    name: "Test Pattern",
    status: "active",
    confidence: "HIGH",
    protocol_md: "# Protocol",
    trigger_keywords: [],
    trigger_error_signatures: [],
    times_used: 0,
    times_correct: 0,
    false_positives: 0,
    false_positive_log: [],
    sprint_validated: null,
    created_by: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeFailure(overrides: Partial<FailureData>): FailureData {
  return {
    test_name: "",
    story: "",
    error_message: "",
    stack_trace: "",
    ...overrides,
  };
}

describe("matchPatterns", () => {
  it("matches when keyword score meets threshold", () => {
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["compare faces", "selfie"],
        trigger_error_signatures: [],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate Compare Faces for Generous Users",
        error_message: "Selfie Face Match: No",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].pattern_id).toBe("face-comparison");
    // "compare faces" matches in test_name (+2), "selfie" matches in error_message (+2) = 4
    expect(result.matches[0].keyword_score).toBe(4);
    expect(result.matches[0].total_score).toBeGreaterThanOrEqual(4);
    expect(result.unmatched_indices).toHaveLength(0);
  });

  it("does not match when only signatures match (keywords mandatory)", () => {
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["compare faces", "selfie"],
        trigger_error_signatures: ["Selfie Face Match: No"],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Some unrelated test",
        error_message: 'Expected: a string containing "Yes" but: was "No"',
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(0);
    expect(result.unmatched_indices).toEqual([0]);
  });

  it("rejects match when total score below threshold", () => {
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["compare faces"],
        trigger_error_signatures: [],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate Compare Faces",
        error_message: "Some error",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    // Only 1 keyword match → score = 2, below threshold of 4
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched_indices).toEqual([0]);
  });

  it("adds signature score on top of keyword score", () => {
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["selfie"],
        trigger_error_signatures: ["Selfie Face Match: No"],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate selfie comparison",
        error_message: "Selfie Face Match: No",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(1);
    // keyword "selfie" in test_name = 2, signature "Selfie Face Match: No" in error = 3, total = 5
    expect(result.matches[0].keyword_score).toBe(2);
    expect(result.matches[0].signature_score).toBe(3);
    expect(result.matches[0].total_score).toBe(5);
  });

  it("skips inactive patterns", () => {
    const patterns = [
      makePattern({
        id: "archived-pattern",
        status: "archived",
        trigger_keywords: ["selfie"],
        trigger_error_signatures: ["Selfie Face Match"],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate selfie comparison",
        error_message: "Selfie Face Match: No",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(0);
  });

  it("handles multiple failures with different matches", () => {
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["compare faces", "selfie"],
        trigger_error_signatures: [],
      }),
      makePattern({
        id: "dragyn-false-positive",
        trigger_keywords: ["Dragyn", "dragyn"],
        trigger_error_signatures: ["Dragyn history table has reason for"],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate Compare Faces selfie test",
        error_message: "Match failed",
      }),
      makeFailure({
        test_name: "Validate Dragyn Photo Moderation",
        error_message: "Dragyn history table has reason for upload",
      }),
      makeFailure({
        test_name: "Some unrelated test",
        error_message: "Timeout waiting for element",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].pattern_id).toBe("face-comparison");
    expect(result.matches[0].failure_index).toBe(0);
    expect(result.matches[1].pattern_id).toBe("dragyn-false-positive");
    expect(result.matches[1].failure_index).toBe(1);
    expect(result.unmatched_indices).toEqual([2]);
  });

  it("reproduces the known false positive case: ID Verification Underage matching face-comparison on generic signature", () => {
    // This was a real false positive from 2026-03-13:
    // The generic signature "Expected: a string containing" matched without keyword hit.
    // After fixing, keyword_required prevents this.
    const patterns = [
      makePattern({
        id: "face-comparison",
        trigger_keywords: ["compare faces", "selfie", "face match", "Selfie Face Match", "liveness"],
        trigger_error_signatures: ["Selfie Face Match: No", "Selfie Face Match: Yes", "verifyPhotoHasSelfieFaceMatch"],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate ID Verification Underage Improvements - Underage Registration",
        story: "TC [PAS] - ID Verification Queue Improvements",
        error_message: 'Expected: a string containing "Yes" but: was "No"',
        stack_trace: "at AdminPASApiSteps.verifyIdVerification(AdminPASApiSteps.java:42)",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    // Should NOT match — no keywords hit (test is about ID Verification, not selfie/compare faces)
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched_indices).toEqual([0]);
  });

  it("is case-insensitive for matching", () => {
    const patterns = [
      makePattern({
        id: "dragyn-false-positive",
        trigger_keywords: ["Dragyn", "photo moderation"],
        trigger_error_signatures: [],
      }),
    ];
    const failures = [
      makeFailure({
        test_name: "Validate DRAGYN PHOTO MODERATION",
        error_message: "Some error",
      }),
    ];

    const result = matchPatterns(failures, patterns, defaultRules);

    expect(result.matches).toHaveLength(1);
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_SUBMISSION_UNAVAILABLE_MESSAGE,
  getContactSubmissionState,
} from "./contactSubmission.js";

test("contact submission reports unavailable delivery when no endpoint exists", () => {
  const result = getContactSubmissionState();

  assert.equal(result.status, "unavailable");
  assert.equal(result.message, CONTACT_SUBMISSION_UNAVAILABLE_MESSAGE);
  assert.notEqual(result.status, "success");
});

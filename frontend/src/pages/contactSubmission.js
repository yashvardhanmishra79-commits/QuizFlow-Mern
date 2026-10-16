export const CONTACT_SUBMISSION_UNAVAILABLE_MESSAGE =
  "Online message delivery is not currently available. Please email support@quizflow.com or call +91 98765 43210.";

export function getContactSubmissionState() {
  return {
    status: "unavailable",
    message: CONTACT_SUBMISSION_UNAVAILABLE_MESSAGE,
  };
}

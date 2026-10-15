import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "../index.js";
import Batch from "../models/Batch.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { createQuizRouter } from "../routes/quizRoutes.js";
import { hashPassword } from "../utils/passwordSecurity.js";

const studentId = "64b000000000000000000010";
const batchId = "64b000000000000000000001";
const otherBatchId = "64b000000000000000000002";
const quizId = "64b000000000000000000020";
const attemptId = "64b000000000000000000030";
const token = "test-session-token";

function replaceMethod(t, target, method, replacement) {
  const descriptor = Object.getOwnPropertyDescriptor(target, method);
  Object.defineProperty(target, method, {
    configurable: true,
    writable: true,
    value: replacement,
  });
  t.after(() => {
    if (descriptor) {
      Object.defineProperty(target, method, descriptor);
    } else {
      delete target[method];
    }
  });
}

function mockBatchProtocol(
  t,
  { exists = true, pendingAssignments = 0, student = null, quiz = null } = {}
) {
  const state = {
    exists,
    deleting: false,
    pendingAssignments,
    student,
    quiz,
    assignmentClaims: 0,
    deletionClaims: 0,
  };

  replaceMethod(t, Batch, "findOneAndUpdate", async (filter, update) => {
    if (!state.exists || String(filter._id) !== batchId) {
      return null;
    }
    if (update.$inc?.pendingAssignments === 1) {
      assert.deepEqual(filter.deletionInProgress, { $ne: true });
      if (state.deleting) {
        return null;
      }
      state.pendingAssignments += 1;
      state.assignmentClaims += 1;
      return { _id: batchId };
    }
    if (update.$set?.deletionInProgress === true) {
      assert.deepEqual(filter.deletionInProgress, { $ne: true });
      assert.deepEqual(filter.$or, [
        { pendingAssignments: 0 },
        { pendingAssignments: { $exists: false } },
      ]);
      if (state.deleting || state.pendingAssignments !== 0) {
        return null;
      }
      state.deleting = true;
      state.deletionClaims += 1;
      return { _id: batchId };
    }
    throw new Error("Unexpected batch claim operation.");
  });
  replaceMethod(t, Batch, "exists", async () =>
    state.exists ? { _id: batchId } : null
  );
  replaceMethod(t, Batch, "updateOne", async (_filter, update) => {
    if (update.$inc?.pendingAssignments === -1) {
      if (state.pendingAssignments <= 0) {
        return { matchedCount: 0 };
      }
      state.pendingAssignments -= 1;
      return { matchedCount: 1 };
    }
    if (update.$set?.deletionInProgress === false) {
      if (!state.deleting || state.pendingAssignments !== 0) {
        return { matchedCount: 0 };
      }
      state.deleting = false;
      return { matchedCount: 1 };
    }
    throw new Error("Unexpected batch release operation.");
  });
  replaceMethod(t, Batch, "findOneAndDelete", async () => {
    if (!state.exists || !state.deleting || state.pendingAssignments !== 0) {
      return null;
    }
    state.exists = false;
    state.deleting = false;
    return { _id: batchId };
  });
  replaceMethod(t, User, "exists", async () => state.student);
  replaceMethod(t, Quiz, "exists", async () => state.quiz);
  return state;
}

async function startApi(
  t,
  {
    role = "student",
    batch = batchId,
    authenticated = true,
    quizGenerator,
  } = {}
) {
  if (authenticated) {
    replaceMethod(t, Session, "findOne", async () => ({
      user: studentId,
      sessionVersion: 0,
    }));
    replaceMethod(t, User, "findById", () => ({
      select: async () => ({
        _id: studentId,
        name: "Test User",
        role,
        batch,
        sessionVersion: 0,
      }),
    }));
  }

  const server = createServer(
    createApp({
      quizRouter: quizGenerator
        ? createQuizRouter(quizGenerator)
        : undefined,
    })
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  return `http://127.0.0.1:${server.address().port}`;
}

async function request(baseUrl, path, { method = "GET", body, authenticated = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (authenticated) {
    headers.authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("authentication rejects anonymous access and enforces admin roles", async (t) => {
  const anonymousApi = await startApi(t, { authenticated: false });
  assert.equal(
    (await request(anonymousApi, "/quiz/get-all", { authenticated: false })).status,
    401
  );
  assert.equal(
    (
      await request(anonymousApi, "/batch/add-batch", {
        method: "POST",
        body: { name: "Batch" },
        authenticated: false,
      })
    ).status,
    401
  );

  const studentApi = await startApi(t, { role: "student" });
  assert.equal((await request(studentApi, "/quiz/get-all")).status, 403);
  assert.equal(
    (
      await request(studentApi, "/batch/add-batch", {
        method: "POST",
        body: { name: "Batch" },
      })
    ).status,
    403
  );
});

test("unexpected authentication failures return no internal error details", async (t) => {
  const api = await startApi(t, { role: "admin" });
  replaceMethod(t, Session, "findOne", async () => {
    throw new Error("sensitive database detail");
  });

  const response = await request(api, "/quiz/get-all");
  assert.equal(response.status, 500);
  assert.equal(
    response.body.message,
    "An internal server error occurred."
  );
  assert.doesNotMatch(JSON.stringify(response.body), /sensitive|stack/i);
});

test("login returns the bearer token only with safe user data and stores its hash", async (t) => {
  const api = await startApi(t, { authenticated: false });
  const password = "valid-password-123";
  const user = new User({
    _id: studentId,
    name: "Test User",
    email: "student@example.com",
    passwordHash: await hashPassword(password),
    sessionVersion: 0,
    role: "student",
    batch: batchId,
  });
  replaceMethod(t, User, "findOne", (filter) => {
    assert.equal(filter.email.$options, "i");
    assert.equal(filter.email.$regex, "^student@example\\.com$");
    return { select: async () => user };
  });
  let createdSession;
  replaceMethod(t, Session, "create", async (session) => {
    createdSession = session;
    return session;
  });

  const response = await request(api, "/user/login", {
    method: "POST",
    authenticated: false,
    body: { email: " Student@Example.com ", password },
  });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.authToken, "string");
  assert.equal(Object.hasOwn(response.body.data, "password"), false);
  assert.equal(Object.hasOwn(response.body.data, "passwordHash"), false);
  assert.equal(Object.hasOwn(response.body.data, "sessionVersion"), false);
  assert.equal(
    createdSession.tokenHash,
    createHash("sha256").update(response.body.authToken).digest("hex")
  );
  assert.equal(Object.hasOwn(createdSession, "token"), false);
});

test("student quiz reads enforce batch ownership and exclude answer fields", async (t) => {
  const api = await startApi(t, { role: "student", batch: batchId });
  const publicQuiz = {
    _id: quizId,
    title: "Student quiz",
    batch: batchId,
    questions: [{ title: "Question", options: ["A", "B", "C", "D"] }],
  };

  replaceMethod(t, Batch, "findById", async () => ({ _id: batchId }));
  replaceMethod(t, Quiz, "findById", () => ({
    select: async (projection) => {
      assert.match(projection, /-questions\.correctOption/);
      assert.match(projection, /-questions\.explanation/);
      return publicQuiz;
    },
  }));
  replaceMethod(t, Quiz, "find", () => ({
    select: async (projection) => {
      assert.match(projection, /-questions\.correctOption/);
      assert.match(projection, /-questions\.explanation/);
      return [publicQuiz];
    },
  }));

  const singleQuiz = await request(api, `/quiz/single/${quizId}`);
  assert.equal(singleQuiz.status, 200);
  assert.equal(
    Object.hasOwn(singleQuiz.body.data.questions[0], "correctOption"),
    false
  );
  assert.equal(
    Object.hasOwn(singleQuiz.body.data.questions[0], "explanation"),
    false
  );
  assert.equal((await request(api, `/quiz/${batchId}`)).status, 200);
  assert.equal((await request(api, "/quiz/single/not-an-id")).status, 400);
  assert.equal((await request(api, `/quiz/${otherBatchId}`)).status, 403);

  replaceMethod(t, Quiz, "findById", () => ({
    select: async () => ({ ...publicQuiz, batch: otherBatchId }),
  }));
  assert.equal((await request(api, `/quiz/single/${quizId}`)).status, 403);
});

test("quiz creation validates content and preserves negative decimal marks", async (t) => {
  const api = await startApi(t, { role: "admin" });
  const batchState = mockBatchProtocol(t);
  let savedQuiz;
  let quizSaveCount = 0;
  replaceMethod(t, Quiz.prototype, "save", async function save() {
    quizSaveCount += 1;
    savedQuiz = { ...this.toObject(), _id: quizId };
    return savedQuiz;
  });

  const validQuiz = {
    title: "Validated quiz",
    batch: batchId,
    correctMarks: 2,
    incorrectMarks: -0.5,
    questions: [
      {
        title: "Question text",
        options: ["A", "B", "C", "D"],
        correctOption: 1,
        explanation: "",
      },
    ],
  };
  const created = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: validQuiz,
  });
  assert.equal(created.status, 201);
  assert.equal(savedQuiz.incorrectMarks, -0.5);
  assert.equal(created.body.data.correctMarks, 2);
  assert.equal(batchState.assignmentClaims, 1);
  assert.equal(batchState.pendingAssignments, 0);

  batchState.deleting = true;
  const lockedBatch = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: validQuiz,
  });
  assert.equal(lockedBatch.status, 409);
  assert.equal(quizSaveCount, 1);
  batchState.deleting = false;

  const malformed = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: { ...validQuiz, questions: [{ ...validQuiz.questions[0], correctOption: 4 }] },
  });
  assert.equal(malformed.status, 400);

  batchState.exists = false;
  const missingBatch = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: validQuiz,
  });
  assert.equal(missingBatch.status, 404);

  batchState.exists = true;
  const extremePositiveMarks = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: {
      ...validQuiz,
      correctMarks: Number.MAX_VALUE,
      incorrectMarks: 0,
      questions: [validQuiz.questions[0], validQuiz.questions[0]],
    },
  });
  assert.equal(extremePositiveMarks.status, 400);

  const extremeNegativeMarks = await request(api, "/quiz/add-quiz", {
    method: "POST",
    body: {
      ...validQuiz,
      correctMarks: 1,
      incorrectMarks: -Number.MAX_VALUE,
    },
  });
  assert.equal(extremeNegativeMarks.status, 400);
});

test("user creation validates email and password and rejects duplicate emails", async (t) => {
  const api = await startApi(t, { role: "admin" });
  const batchState = mockBatchProtocol(t);
  replaceMethod(t, User, "findOne", async (filter) => {
    if (filter.email?.$regex?.includes("student")) {
      return { _id: studentId };
    }
    return null;
  });

  const baseUser = {
    name: "Test Student",
    email: "Student@example.com",
    password: "a-long-password",
    batch: batchId,
  };
  const duplicate = await request(api, "/user/add-user", {
    method: "POST",
    body: baseUser,
  });
  assert.equal(duplicate.status, 409);

  const badEmail = await request(api, "/user/add-user", {
    method: "POST",
    body: { ...baseUser, email: "invalid" },
  });
  assert.equal(badEmail.status, 400);
  assert.equal(
    (
      await request(api, "/user/add-user", {
        method: "POST",
        body: { ...baseUser, email: "new@example.com", password: "short" },
      })
    ).status,
    400
  );
  assert.equal(
    (
      await request(api, "/user/update-user", {
        method: "POST",
        body: {
          userId: studentId,
          name: "Test Student",
          email: "new@example.com",
          batch: batchId,
          password: "short",
        },
      })
    ).status,
    400
  );

  replaceMethod(t, User, "findOne", async () => null);
  replaceMethod(t, User.prototype, "save", async () => {
    const duplicateKeyError = new Error("duplicate key");
    duplicateKeyError.code = 11000;
    throw duplicateKeyError;
  });
  const duplicateRace = await request(api, "/user/add-user", {
    method: "POST",
    body: { ...baseUser, email: "race@example.com" },
  });
  assert.equal(duplicateRace.status, 409);
  assert.equal(batchState.pendingAssignments, 0);

  replaceMethod(t, User.prototype, "save", async () => ({
    _id: studentId,
    name: "Safe Student",
    email: "safe@example.com",
    role: "student",
    batch: batchId,
    password: "legacy",
    passwordHash: "argon-hash",
    sessionVersion: 0,
  }));
  const created = await request(api, "/user/add-user", {
    method: "POST",
    body: { ...baseUser, email: "safe@example.com" },
  });
  assert.equal(created.status, 201);
  assert.equal(batchState.assignmentClaims, 2);
  assert.equal(batchState.pendingAssignments, 0);
  assert.equal(Object.hasOwn(created.body.data, "password"), false);
  assert.equal(Object.hasOwn(created.body.data, "passwordHash"), false);
  assert.equal(Object.hasOwn(created.body.data, "sessionVersion"), false);

  replaceMethod(t, User, "findOneAndUpdate", async (filter) => {
    assert.equal(filter._id, studentId);
    return {
      _id: studentId,
      name: "Updated Student",
      email: "updated@example.com",
      role: "student",
      batch: batchId,
    };
  });
  const updated = await request(api, "/user/update-user", {
    method: "POST",
    body: {
      userId: studentId,
      name: "Updated Student",
      email: "updated@example.com",
      batch: batchId,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(batchState.assignmentClaims, 3);
  assert.equal(batchState.pendingAssignments, 0);

  assert.equal(
    (
      await request(api, "/user/add-user", {
        method: "POST",
        body: { email: "new@example.com" },
      })
    ).status,
    400
  );
});

test("AI quiz generation claims its batch and releases the claim", async (t) => {
  const generated = {
    title: "Generated quiz",
    batch: batchId,
    correctMarks: 1,
    incorrectMarks: -0.25,
    questions: [
      {
        title: "Question",
        options: ["A", "B", "C", "D"],
        correctOption: 0,
        explanation: "A is correct.",
      },
    ],
  };
  let failGeneration = false;
  const api = await startApi(t, {
    role: "admin",
    quizGenerator: async () => {
      if (failGeneration) {
        const error = new Error("mocked generation failure");
        error.statusCode = 502;
        throw error;
      }
      return generated;
    },
  });
  const batchState = mockBatchProtocol(t);
  const response = await request(api, "/quiz/generate-ai-quiz", {
    method: "POST",
    body: { topic: "Testing", batch: batchId, questionCount: 1 },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.incorrectMarks, -0.25);
  assert.equal(batchState.assignmentClaims, 1);
  assert.equal(batchState.pendingAssignments, 0);

  failGeneration = true;
  const failedResponse = await request(api, "/quiz/generate-ai-quiz", {
    method: "POST",
    body: { topic: "Testing", batch: batchId, questionCount: 1 },
  });
  assert.equal(failedResponse.status, 502);
  assert.equal(batchState.assignmentClaims, 2);
  assert.equal(batchState.pendingAssignments, 0);
});

test("batch creation rejects invalid names and returns the created batch", async (t) => {
  const api = await startApi(t, { role: "admin" });
  let savedBatch;
  replaceMethod(t, Batch.prototype, "save", async function save() {
    savedBatch = this;
    return this;
  });

  assert.equal(
    (
      await request(api, "/batch/add-batch", {
        method: "POST",
        body: { name: "  " },
      })
    ).status,
    400
  );
  const created = await request(api, "/batch/add-batch", {
    method: "POST",
    body: {
      name: "Morning cohort",
      deletionInProgress: true,
      pendingAssignments: 100,
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, "Morning cohort");
  assert.equal(savedBatch.deletionInProgress, false);
  assert.equal(savedBatch.pendingAssignments, 0);
  assert.equal(Object.hasOwn(created.body.data, "deletionInProgress"), false);
  assert.equal(Object.hasOwn(created.body.data, "pendingAssignments"), false);
});

test("batch operations validate IDs, missing resources, and existing relationships", async (t) => {
  const api = await startApi(t, { role: "admin" });
  const batchState = mockBatchProtocol(t, { student: { _id: studentId } });

  const invalidId = await request(api, "/batch/delete-batch", {
    method: "POST",
    body: { batchId: "bad-id" },
  });

  assert.equal(invalidId.status, 400);

  const referencedBatch = await request(api, "/batch/delete-batch", {
    method: "POST",
    body: { batchId },
  });
  assert.equal(referencedBatch.status, 409);
  assert.equal(batchState.deletionClaims, 1);
  assert.equal(batchState.deleting, false);

  batchState.student = null;
  batchState.quiz = { _id: quizId };
  const quizReferencedBatch = await request(api, "/batch/delete-batch", {
    method: "POST",
    body: { batchId },
  });
  assert.equal(quizReferencedBatch.status, 409);
  assert.equal(batchState.deletionClaims, 2);
  assert.equal(batchState.deleting, false);

  replaceMethod(t, Batch, "findByIdAndUpdate", async () => null);
  const missingBatch = await request(api, "/batch/update-batch", {
    method: "POST",
    body: { batchId, name: "Renamed" },
  });
  assert.equal(missingBatch.status, 404);
});

test("batch deletion removes an unreferenced batch under its deletion claim", async (t) => {
  const api = await startApi(t, { role: "admin" });
  const batchState = mockBatchProtocol(t);
  const response = await request(api, "/batch/delete-batch", {
    method: "POST",
    body: { batchId },
  });
  assert.equal(response.status, 200);
  assert.equal(batchState.exists, false);
  assert.equal(batchState.deleting, false);
  assert.equal(batchState.deletionClaims, 1);
});

test("batch deletion rejects outstanding assignment claims without locking", async (t) => {
  const api = await startApi(t, { role: "admin" });
  const batchState = mockBatchProtocol(t, { pendingAssignments: 1 });
  const response = await request(api, "/batch/delete-batch", {
    method: "POST",
    body: { batchId },
  });
  assert.equal(response.status, 409);
  assert.equal(batchState.deletionClaims, 0);
  assert.equal(batchState.deleting, false);
  assert.equal(batchState.pendingAssignments, 1);
});

test("attempt submission saves correct, incorrect, and unanswered grading", async (t) => {
  const api = await startApi(t, { role: "student", batch: batchId });
  const quiz = {
    _id: quizId,
    batch: { _id: batchId, name: "Test batch" },
    title: "Grading quiz",
    correctMarks: 2,
    incorrectMarks: -0.5,
    questions: [0, 1, 2, 3, 0].map((correctOption) => ({
      correctOption,
      options: ["A", "B", "C", "D"],
    })),
  };
  replaceMethod(t, Quiz, "findById", () => ({
    populate: async () => quiz,
  }));
  replaceMethod(t, QuizAttempt, "findOne", async () => null);
  let createdAttempt;
  replaceMethod(t, QuizAttempt, "create", async (attempt) => {
    createdAttempt = attempt;
    return { ...attempt, _id: attemptId };
  });

  const response = await request(api, "/attempts", {
    method: "POST",
    body: {
      quizId,
      requestId: "request-123456",
      answers: { 0: 0, 1: 1, 2: 2, 3: 0 },
    },
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.obtainedMarks, 5.5);
  assert.equal(response.body.data.percentage, 55);
  assert.equal(response.body.data.unansweredCount, 1);
  assert.deepEqual(createdAttempt.answers, [0, 1, 2, 0, null]);

  replaceMethod(t, Quiz, "findById", () => ({
    populate: async () => ({
      ...quiz,
      incorrectMarks: -Number.MAX_VALUE,
    }),
  }));
  const invalidStoredScheme = await request(api, "/attempts", {
    method: "POST",
    body: {
      quizId,
      requestId: "request-extreme-123",
      answers: { 0: 1 },
    },
  });
  assert.equal(invalidStoredScheme.status, 400);
  assert.equal(createdAttempt.requestId, "request-123456");
});

test("attempt submission rejects another batch without creating an attempt", async (t) => {
  const api = await startApi(t, { role: "student", batch: batchId });
  replaceMethod(t, QuizAttempt, "findOne", async () => null);
  replaceMethod(t, Quiz, "findById", () => ({
    populate: async () => ({
      _id: quizId,
      batch: { _id: otherBatchId, name: "Other batch" },
      questions: [
        { correctOption: 0, options: ["A", "B", "C", "D"] },
      ],
    }),
  }));
  let attemptCreated = false;
  replaceMethod(t, QuizAttempt, "create", async () => {
    attemptCreated = true;
    return {};
  });

  const response = await request(api, "/attempts", {
    method: "POST",
    body: {
      quizId,
      requestId: "cross-batch-request",
      answers: { 0: 0 },
    },
  });
  assert.equal(response.status, 403);
  assert.equal(attemptCreated, false);
});

test("attempt retries are deduplicated and attempt lookup is scoped to its owner", async (t) => {
  const api = await startApi(t, { role: "student", batch: batchId });
  const existingAttempt = { _id: attemptId, student: studentId, quiz: quizId };
  replaceMethod(t, QuizAttempt, "findOne", async (filter) => {
    assert.equal(filter.student, studentId);
    return existingAttempt;
  });

  const duplicate = await request(api, "/attempts", {
    method: "POST",
    body: {
      quizId,
      requestId: "request-123456",
      answers: {},
    },
  });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.message, "Attempt already saved.");

  let ownerFilter;
  replaceMethod(t, QuizAttempt, "findOne", (filter) => {
    ownerFilter = filter;
    return {
      populate: async () =>
        String(filter.student) === studentId ? existingAttempt : null,
    };
  });
  const owned = await request(api, `/attempts/${attemptId}`);
  assert.equal(owned.status, 200);
  assert.equal(owned.body.data._id, attemptId);
  assert.deepEqual(ownerFilter, { _id: attemptId, student: studentId });

  const otherStudentId = "64b000000000000000000011";
  replaceMethod(t, Session, "findOne", async () => ({
    user: otherStudentId,
    sessionVersion: 0,
  }));
  replaceMethod(t, User, "findById", () => ({
    select: async () => ({
      _id: otherStudentId,
      name: "Other student",
      role: "student",
      batch: batchId,
      sessionVersion: 0,
    }),
  }));
  const notOwned = await request(api, `/attempts/${attemptId}`);
  assert.equal(notOwned.status, 404);
  assert.deepEqual(ownerFilter, {
    _id: attemptId,
    student: otherStudentId,
  });
});

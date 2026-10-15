import assert from "node:assert/strict";
import test from "node:test";
import { getInitialAuthState, getRouteAccess } from "./authState.js";

function createStorage(values = {}) {
  const stored = new Map(Object.entries(values));
  return {
    getItem(key) {
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      stored.set(key, value);
    },
    removeItem(key) {
      stored.delete(key);
    },
  };
}

test("unauthenticated access redirects to the existing login route", () => {
  assert.deepEqual(
    getRouteAccess({
      user: null,
      isAuthenticated: false,
      requiredRole: "admin",
    }),
    { allowed: false, redirectTo: "/login" }
  );
});

test("authenticated users can access routes for their role", () => {
  for (const role of ["admin", "student"]) {
    assert.deepEqual(
      getRouteAccess({
        user: { role },
        isAuthenticated: true,
        requiredRole: role,
      }),
      { allowed: true, redirectTo: null }
    );
  }
});

test("wrong-role users redirect to the other role's existing destination", () => {
  const student = { user: { role: "student" }, isAuthenticated: true };
  const admin = { user: { role: "admin" }, isAuthenticated: true };

  const studentOnAdminRoute = getRouteAccess({
    ...student,
    requiredRole: "admin",
  });
  const adminOnStudentRoute = getRouteAccess({
    ...admin,
    requiredRole: "student",
  });
  assert.deepEqual(studentOnAdminRoute, {
    allowed: false,
    redirectTo: "/quizzes",
  });
  assert.deepEqual(adminOnStudentRoute, {
    allowed: false,
    redirectTo: "/admin",
  });
  assert.equal(
    getRouteAccess({ ...student, requiredRole: "student" }).allowed,
    true
  );
  assert.equal(
    getRouteAccess({ ...admin, requiredRole: "admin" }).allowed,
    true
  );
});

test("refresh restores a protected session synchronously from local storage", () => {
  const storage = createStorage({
    authToken: "stored-session-token",
    userData: JSON.stringify({
      name: "Student",
      role: "student",
      password: "legacy-sensitive-value",
    }),
  });

  const state = getInitialAuthState(storage);
  assert.deepEqual(state, {
    user: { name: "Student", role: "student" },
    isAuthenticated: true,
  });
  assert.deepEqual(JSON.parse(storage.getItem("userData")), state.user);
});

test("stored user data without a token does not authenticate after refresh", () => {
  const state = getInitialAuthState(
    createStorage({
      userData: JSON.stringify({ role: "admin" }),
    })
  );
  assert.deepEqual(state, {
    user: { role: "admin" },
    isAuthenticated: false,
  });
});

test("public routes remain accessible without authentication", () => {
  assert.deepEqual(
    getRouteAccess({
      user: null,
      isAuthenticated: false,
      requiredRole: null,
    }),
    { allowed: true, redirectTo: null }
  );
});

test("logout state makes previously protected routes inaccessible", () => {
  assert.deepEqual(
    getRouteAccess({
      user: null,
      isAuthenticated: false,
      requiredRole: "student",
    }),
    { allowed: false, redirectTo: "/login" }
  );
});

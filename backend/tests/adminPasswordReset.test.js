import assert from "node:assert/strict";
import test from "node:test";
import { resetAdminPassword } from "../utils/adminPasswordReset.js";
import { PasswordPolicyError } from "../utils/passwordSecurity.js";

function createUserModel(accounts) {
  const calls = { filter: null, updateFilter: null, update: null };
  return {
    calls,
    find(filter) {
      calls.filter = filter;
      return {
        select(selection) {
          assert.equal(selection, "_id role");
          return {
            lean: async () => accounts,
          };
        },
      };
    },
    async updateOne(filter, update) {
      calls.updateFilter = filter;
      calls.update = update;
      return { matchedCount: 1 };
    },
  };
}

test("admin password reset updates the hash and increments session version", async () => {
  const UserModel = createUserModel([{ _id: "admin-id", role: "admin" }]);
  const result = await resetAdminPassword({
    email: "ADMIN@example.com",
    password: "a secure password 123",
    UserModel,
    hash: async (password) => `argon2-hash:${password}`,
  });

  assert.deepEqual(result, { email: "admin@example.com" });
  assert.deepEqual(UserModel.calls.updateFilter, {
    _id: "admin-id",
    role: "admin",
  });
  assert.deepEqual(UserModel.calls.update, {
    $set: { passwordHash: "argon2-hash:a secure password 123" },
    $unset: { password: 1 },
    $inc: { sessionVersion: 1 },
  });
});

test("admin password reset rejects missing accounts without updating", async () => {
  const UserModel = createUserModel([]);

  await assert.rejects(
    resetAdminPassword({
      email: "missing@example.com",
      password: "a secure password 123",
      UserModel,
      hash: async () => "not-called",
    }),
    /No account was found/
  );
  assert.equal(UserModel.calls.update, null);
});

test("admin password reset rejects student accounts without updating", async () => {
  const UserModel = createUserModel([{ _id: "student-id", role: "student" }]);

  await assert.rejects(
    resetAdminPassword({
      email: "student@example.com",
      password: "a secure password 123",
      UserModel,
      hash: async () => "not-called",
    }),
    /not an administrator/
  );
  assert.equal(UserModel.calls.update, null);
});

test("admin password reset rejects ambiguous email matches", async () => {
  const UserModel = createUserModel([
    { _id: "admin-id", role: "admin" },
    { _id: "other-id", role: "admin" },
  ]);

  await assert.rejects(
    resetAdminPassword({
      email: "admin@example.com",
      password: "a secure password 123",
      UserModel,
      hash: async () => "not-called",
    }),
    /multiple accounts/
  );
  assert.equal(UserModel.calls.update, null);
});

test("admin password reset uses shared password validation before database lookup", async () => {
  const UserModel = createUserModel([{ _id: "admin-id", role: "admin" }]);

  await assert.rejects(
    resetAdminPassword({
      email: "admin@example.com",
      password: "too short",
      UserModel,
      hash: async () => "not-called",
    }),
    PasswordPolicyError
  );
  assert.equal(UserModel.calls.filter, null);
  assert.equal(UserModel.calls.update, null);
});

test("admin password reset detects an account that changed before update", async () => {
  const UserModel = createUserModel([{ _id: "admin-id", role: "admin" }]);
  UserModel.updateOne = async (filter, update) => {
    UserModel.calls.updateFilter = filter;
    UserModel.calls.update = update;
    return { matchedCount: 0 };
  };

  await assert.rejects(
    resetAdminPassword({
      email: "admin@example.com",
      password: "a secure password 123",
      UserModel,
      hash: async () => "argon2-hash",
    }),
    /account changed/
  );
});

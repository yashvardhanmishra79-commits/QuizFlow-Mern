import assert from "node:assert/strict";
import test from "node:test";
import Batch from "../models/Batch.js";
import {
  BATCH_NAME_INDEX_OPTIONS,
  findDuplicateBatchNames,
} from "../utils/batchNameIndex.js";
import { getDatabaseTarget } from "../scripts/manageBatchNameIndex.js";

test("batch name index is unique, case-sensitive, and excludes non-string legacy names", () => {
  const [nameIndex, options] = Batch.schema.indexes()[0];
  assert.deepEqual(nameIndex, { name: 1 });
  assert.deepEqual(BATCH_NAME_INDEX_OPTIONS, {
    name: "name_1_unique",
    unique: true,
    collation: { locale: "simple" },
    partialFilterExpression: { name: { $type: "string" } },
  });
  assert.deepEqual(options, BATCH_NAME_INDEX_OPTIONS);
  assert.equal(Batch.schema.options.autoIndex, false);
});

test("batch duplicate detection uses exact case-sensitive stored names", () => {
  const result = findDuplicateBatchNames([
    { _id: "id-a", name: "Morning cohort" },
    { _id: "id-b", name: "Morning cohort" },
    { _id: "id-c", name: "morning cohort" },
    { _id: "id-d" },
    { _id: "id-e", name: null },
  ]);

  assert.deepEqual(result, {
    duplicates: [{ name: "Morning cohort", ids: ["id-a", "id-b"] }],
    nonCanonicalNames: [],
    unsupportedArrayNames: [],
  });
});

test("legacy whitespace names are reported separately and block clean preflight", () => {
  const result = findDuplicateBatchNames([
    { _id: "canonical", name: "Alpha" },
    { _id: "padded", name: " Alpha " },
  ]);

  assert.deepEqual(result, {
    duplicates: [],
    nonCanonicalNames: [{ id: "padded", name: " Alpha " }],
    unsupportedArrayNames: [],
  });
});

test("partial-filter array participants are reported as unsupported", () => {
  const result = findDuplicateBatchNames([
    { _id: "array", name: ["Alpha", 7] },
    { _id: "array-no-string", name: [7, null] },
    { _id: "missing" },
    { _id: "number", name: 7 },
    { _id: "null", name: null },
  ]);

  assert.deepEqual(result, {
    duplicates: [],
    nonCanonicalNames: [],
    unsupportedArrayNames: [{ id: "array" }],
  });
});

test("MongoDB connection targets support single-host and encoded database URIs", () => {
  assert.deepEqual(
    getDatabaseTarget("mongodb://db.example.test:27017/quiz%20flow?retryWrites=true"),
    {
      label: "mongodb://db.example.test:27017/quiz flow",
      confirmation: "mongodb://db.example.test:27017/quiz flow",
    }
  );
});

test("MongoDB connection targets include every replica-set host", () => {
  assert.deepEqual(
    getDatabaseTarget(
      "mongodb://db-a.example.test:27017,db-b.example.test:27018/quiz?replicaSet=rs0"
    ),
    {
      label:
        "mongodb://db-a.example.test:27017, db-b.example.test:27018/quiz",
      confirmation:
        "mongodb://db-a.example.test:27017, db-b.example.test:27018/quiz",
    }
  );
});

test("MongoDB SRV target displays its configured hostname without resolving DNS", () => {
  assert.deepEqual(
    getDatabaseTarget("mongodb+srv://cluster.example.test/quiz?retryWrites=true"),
    {
      label:
        "mongodb+srv://cluster.example.test (configured SRV hostname; DNS targets not resolved)/quiz",
      confirmation:
        "mongodb+srv://cluster.example.test (configured SRV hostname; DNS targets not resolved)/quiz",
    }
  );
});

test("MongoDB target output omits credentials and query options", () => {
  const target = getDatabaseTarget(
    "mongodb://operator:secret@db.example.test/quiz?authSource=admin&tls=true"
  );
  assert.equal(target.label, "mongodb://db.example.test/quiz");
  assert.equal(target.label.includes("operator"), false);
  assert.equal(target.label.includes("secret"), false);
  assert.equal(target.label.includes("authSource"), false);
  assert.equal(target.label.includes("tls"), false);
});

test("invalid or database-less MongoDB URIs fail safely", () => {
  for (const connectionString of [
    "not-a-mongodb-uri",
    "mongodb://host",
    "mongodb://host/%ZZ",
    "mongodb://host/quiz%2Fother",
  ]) {
    assert.throws(
      () => getDatabaseTarget(connectionString),
      /MONGO_URL must/
    );
  }
});

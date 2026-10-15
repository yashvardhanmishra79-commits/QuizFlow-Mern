import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { ConnectionString } from "mongodb-connection-string-url";
import { getDatabaseTarget } from "../scripts/manageBatchNameIndex.js";
import {
  BATCH_NAME_INDEX_OPTIONS,
  createBatchNameIndexIfClean,
} from "../utils/batchNameIndex.js";

const dedicatedDatabaseName = "quizflow_batch_name_index_test";
const connectionString = process.env.MONGODB_INTEGRATION_URI?.trim();

test(
  "batch-name unique index behavior against an isolated MongoDB database",
  {
    skip:
      !connectionString &&
      "Set MONGODB_INTEGRATION_URI to run MongoDB integration tests.",
  },
  async (t) => {
    const target = getDatabaseTarget(connectionString);
    assert.ok(
      target.label.endsWith(`/${dedicatedDatabaseName}`),
      `Integration URI must target the dedicated ${dedicatedDatabaseName} database.`
    );
    const uri = new ConnectionString(connectionString);
    assert.equal(
      decodeURIComponent(uri.pathname.slice(1)),
      dedicatedDatabaseName,
      `Integration URI must target the dedicated ${dedicatedDatabaseName} database.`
    );
    assert.equal(
      uri.pathname.startsWith("//"),
      false,
      "Integration URI must contain exactly one database path separator."
    );

    await mongoose.connect(connectionString, {
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
    });

    let ownedCollection;
    try {
      const database = mongoose.connection.db;
      assert.ok(database, "MongoDB connection did not select a database.");
      assert.equal(database.databaseName, dedicatedDatabaseName);

      const collectionName = `batch_name_index_it_${randomUUID().replaceAll("-", "")}`;
      const existing = await database
        .listCollections({ name: collectionName }, { nameOnly: true })
        .hasNext();
      assert.equal(existing, false, "Refusing to use a pre-existing test collection.");

      const collection = await database.createCollection(collectionName);
      ownedCollection = collection;

      t.beforeEach(async () => {
        await collection.deleteMany({});
        await collection.dropIndexes();
      });

      await t.test("creates the declared unique index on a clean collection", async () => {
        const result = await createBatchNameIndexIfClean(collection);
        assert.equal(result.indexCreated, true);
        assert.deepEqual(result.duplicates, []);
        const index = (await collection.listIndexes().toArray()).find(
          (candidate) => candidate.name === BATCH_NAME_INDEX_OPTIONS.name
        );
        assert.ok(index, "Expected the named unique index to be installed.");
        assert.deepEqual(index.key, { name: 1 });
        assert.equal(index.unique, true);
        assert.ok(
          !index.collation || index.collation.locale === "simple",
          "Expected explicit simple collation."
        );
        assert.deepEqual(index.partialFilterExpression, {
          name: { $type: "string" },
        });
      });

      await t.test("rejects identical names with MongoDB duplicate-key error", async () => {
        await createBatchNameIndexIfClean(collection);
        await collection.insertOne({ name: "Alpha" });
        await assert.rejects(
          collection.insertOne({ name: "Alpha" }),
          (error) => error.code === 11000
        );
      });

      await t.test("allows case variants under simple collation", async () => {
        await createBatchNameIndexIfClean(collection);
        await collection.insertMany([
          { name: "Alpha" },
          { name: "alpha" },
        ]);
        assert.equal(await collection.countDocuments(), 2);
      });

      await t.test(
        "partial filter excludes missing and scalar non-string names but includes arrays with strings",
        async () => {
          await collection.insertMany([
            {},
            { name: null },
            { name: 7 },
            { name: 7 },
          ]);
          const result = await createBatchNameIndexIfClean(collection);
          assert.equal(result.indexCreated, true);
          await collection.insertOne({ name: ["Array participant"] });
          await assert.rejects(
            collection.insertOne({ name: "Array participant" }),
            (error) => error.code === 11000
          );
        }
      );

      await t.test(
        "preflight blocks index application for whitespace and duplicate names",
        async () => {
          await collection.insertMany([
            { name: "Alpha" },
            { name: " Alpha " },
            { name: "Repeated" },
            { name: "Repeated" },
          ]);

          const result = await createBatchNameIndexIfClean(collection);
          assert.equal(result.indexCreated, false);
          assert.equal(result.duplicates.length, 1);
          assert.equal(result.duplicates[0].name, "Repeated");
          assert.equal(result.duplicates[0].ids.length, 2);
          assert.deepEqual(result.nonCanonicalNames, [
            {
              id: String((await collection.findOne({ name: " Alpha " }))._id),
              name: " Alpha ",
            },
          ]);
          assert.equal(
            (await collection.listIndexes().toArray()).some(
              (index) => index.name === BATCH_NAME_INDEX_OPTIONS.name
            ),
            false
          );
        }
      );

      await t.test(
        "repeating index creation with the same specification is idempotent",
        async () => {
          const first = await createBatchNameIndexIfClean(collection);
          const second = await createBatchNameIndexIfClean(collection);
          assert.equal(first.indexCreated, true);
          assert.equal(second.indexCreated, true);
          assert.equal(
            (await collection.listIndexes().toArray()).filter(
              (index) => index.name === BATCH_NAME_INDEX_OPTIONS.name
            ).length,
            1
          );
        }
      );

      await t.test(
        "failed index build is not reported as installed",
        async () => {
          await collection.insertMany([
            { name: "Duplicate before index" },
            { name: "Duplicate before index" },
          ]);
          await assert.rejects(
            collection.createIndex({ name: 1 }, BATCH_NAME_INDEX_OPTIONS),
            (error) => error.code === 11000
          );
          assert.equal(
            (await collection.listIndexes().toArray()).some(
              (index) => index.name === BATCH_NAME_INDEX_OPTIONS.name
            ),
            false
          );
        }
      );
    } finally {
      try {
        if (ownedCollection) {
          await ownedCollection.drop();
        }
      } finally {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      }
    }
  }
);

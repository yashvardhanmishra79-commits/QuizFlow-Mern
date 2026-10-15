export const BATCH_NAME_INDEX_OPTIONS = {
  name: "name_1_unique",
  unique: true,
  collation: { locale: "simple" },
  partialFilterExpression: { name: { $type: "string" } },
};

export function findDuplicateBatchNames(records) {
  const idsByName = new Map();
  const nonCanonicalNames = [];
  const unsupportedArrayNames = [];

  for (const record of records) {
    if (typeof record.name === "string") {
      if (record.name !== record.name.trim()) {
        nonCanonicalNames.push({
          id: String(record._id),
          name: record.name,
        });
      }

      const ids = idsByName.get(record.name) || [];
      ids.push(String(record._id));
      idsByName.set(record.name, ids);
    } else if (
      Array.isArray(record.name) &&
      record.name.some((value) => typeof value === "string")
    ) {
      unsupportedArrayNames.push({ id: String(record._id) });
    }
  }

  const duplicates = [...idsByName.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([name, ids]) => ({ name, ids }));

  return { duplicates, nonCanonicalNames, unsupportedArrayNames };
}

export async function inspectBatchNamesForIndex(collection) {
  const records = await collection
    .find(
      { name: { $type: "string" } },
      { projection: { name: 1 } }
    )
    .toArray();

  return {
    ...findDuplicateBatchNames(records),
    recordCount: records.length,
  };
}

export async function createBatchNameIndexIfClean(collection) {
  const preflight = await inspectBatchNamesForIndex(collection);
  const hasUnresolvedNames =
    preflight.duplicates.length > 0 ||
    preflight.nonCanonicalNames.length > 0 ||
    preflight.unsupportedArrayNames.length > 0;

  if (hasUnresolvedNames) {
    return { ...preflight, indexCreated: false };
  }

  await collection.createIndex({ name: 1 }, BATCH_NAME_INDEX_OPTIONS);
  return { ...preflight, indexCreated: true };
}

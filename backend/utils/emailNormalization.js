import { validateEmail } from "./validation.js";

export function planEmailNormalization(records) {
  const groups = new Map();
  const invalidIds = [];
  const updates = [];
  const normalizedRecords = [];

  for (const record of records) {
    let normalized;
    try {
      normalized = validateEmail(record.email);
    } catch {
      invalidIds.push(String(record._id));
      continue;
    }

    const ids = groups.get(normalized) || [];
    ids.push(String(record._id));
    groups.set(normalized, ids);
    normalizedRecords.push({ _id: record._id, emailNormalized: normalized });
    if (record.emailNormalized !== normalized) {
      updates.push({ _id: record._id, emailNormalized: normalized });
    }
  }

  const duplicates = [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([email, ids]) => ({ email, ids }));

  return { duplicates, invalidIds, updates, normalizedRecords };
}

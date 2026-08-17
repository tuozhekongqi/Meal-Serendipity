const LEGACY_SENSITIVE_KEYS = Object.freeze(['wt_taboo', 'wt_black']);

export function clearLegacySensitiveStorage(storage) {
  const removed = [];
  try {
    if (typeof storage?.removeItem !== 'function') {
      return { ok: false, removed, reason: 'storage_unavailable' };
    }
    for (const key of LEGACY_SENSITIVE_KEYS) {
      storage.removeItem(key);
      removed.push(key);
    }
    return { ok: true, removed };
  } catch {
    return { ok: false, removed: [], reason: 'storage_unavailable' };
  }
}

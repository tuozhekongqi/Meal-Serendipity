import { STORAGE_CONFIG } from '../config.js';

function normalizedStringList(value, limit = 10) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))].slice(0, limit);
}

function safePreferences(context = {}) {
  const areaLabel = context.location?.areaLabel ? String(context.location.areaLabel).trim() : null;
  return {
    partySize: context.partySize ?? 1,
    totalBudgetCents: context.totalBudgetCents ?? null,
    maxDistanceMeters: context.maxDistanceMeters ?? null,
    maxDeliveryMinutes: context.maxDeliveryMinutes ?? null,
    tastePreferences: normalizedStringList(context.tastePreferences),
    currentPriority: context.currentPriority ?? 'balanced',
    recentHistory: normalizedStringList(context.recentHistory, 20),
    contextTags: normalizedStringList(context.contextTags),
    location: areaLabel ? { areaLabel, source: 'manual' } : null
  };
}

function migrateV0(payload) {
  return safePreferences({
    totalBudgetCents: payload.budgetCents,
    tastePreferences: payload.tastes,
    partySize: payload.partySize,
    currentPriority: payload.currentPriority
  });
}

export function createPreferenceStorage({
  storage = globalThis.localStorage,
  key = STORAGE_CONFIG.key,
  version = STORAGE_CONFIG.version,
  now = () => new Date()
} = {}) {
  return {
    load() {
      try {
        if (typeof storage?.getItem !== 'function') {
          return { ok: false, value: null, reason: 'storage_unavailable' };
        }
        const raw = storage.getItem(key);
        if (raw === null || raw === undefined) return { ok: true, value: null };
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          return { ok: false, value: null, reason: 'corrupt_data' };
        }
        if (payload?.version === 0) {
          return { ok: true, value: migrateV0(payload), migrated: true };
        }
        if (payload?.version !== version || !payload.preferences || typeof payload.preferences !== 'object') {
          return { ok: false, value: null, reason: 'unsupported_version' };
        }
        return { ok: true, value: safePreferences(payload.preferences) };
      } catch {
        return { ok: false, value: null, reason: 'storage_unavailable' };
      }
    },

    save(context) {
      try {
        if (typeof storage?.setItem !== 'function') {
          return { ok: false, reason: 'storage_unavailable' };
        }
        storage.setItem(key, JSON.stringify({
          version,
          savedAt: now().toISOString(),
          preferences: safePreferences(context)
        }));
        return { ok: true };
      } catch {
        return { ok: false, reason: 'storage_unavailable' };
      }
    },

    clear() {
      try {
        if (typeof storage?.removeItem !== 'function') {
          return { ok: false, reason: 'storage_unavailable' };
        }
        storage.removeItem(key);
        return { ok: true };
      } catch {
        return { ok: false, reason: 'storage_unavailable' };
      }
    }
  };
}

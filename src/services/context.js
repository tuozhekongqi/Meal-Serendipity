import { PROVIDER_SCHEMA_VERSION } from '../config.js';
import { CURRENT_PRIORITY } from '../domain/models.js';

const PRIORITIES = new Set(Object.values(CURRENT_PRIORITY));

function finiteInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizedList(value, limit, itemLimit = 40) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => String(item ?? '').trim().slice(0, itemLimit))
    .filter(Boolean))]
    .slice(0, limit);
}

function optionalNumber(value, { min = -Infinity, max = Infinity } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizeLocation(location) {
  if (!location || typeof location !== 'object') return null;
  return {
    latitude: optionalNumber(location.latitude, { min: -90, max: 90 }),
    longitude: optionalNumber(location.longitude, { min: -180, max: 180 }),
    accuracyMeters: optionalNumber(location.accuracyMeters, { min: 0 }),
    areaLabel: location.areaLabel ? String(location.areaLabel).trim().slice(0, 100) : null,
    consentGrantedAt: location.consentGrantedAt ?? null,
    source: location.source ?? null
  };
}

export function createUserContext(input = {}) {
  const priority = PRIORITIES.has(input.currentPriority)
    ? input.currentPriority
    : CURRENT_PRIORITY.BALANCED;
  return {
    locale: typeof input.locale === 'string' ? input.locale : 'zh-CN',
    location: normalizeLocation(input.location),
    partySize: finiteInteger(input.partySize, 1, { min: 1, max: 50 }),
    totalBudgetCents: finiteInteger(input.totalBudgetCents, null),
    maxDistanceMeters: finiteInteger(input.maxDistanceMeters, null, { min: 1 }),
    maxDeliveryMinutes: finiteInteger(input.maxDeliveryMinutes, null, { min: 1 }),
    tastePreferences: normalizedList(input.tastePreferences ?? input.tastes, 10),
    exclusions: normalizedList(input.exclusions, 30),
    currentPriority: priority,
    recentHistory: normalizedList(input.recentHistory, 20, 160),
    contextTags: normalizedList(input.contextTags, 10)
  };
}

export function toProviderRequest(userContext, { requestId, requestedAt }) {
  return {
    schemaVersion: PROVIDER_SCHEMA_VERSION,
    requestId,
    requestedAt,
    locale: userContext.locale ?? 'zh-CN',
    location: userContext.location
      ? {
          latitude: userContext.location.latitude,
          longitude: userContext.location.longitude,
          accuracyMeters: userContext.location.accuracyMeters,
          areaLabel: userContext.location.areaLabel,
          consentGrantedAt: userContext.location.consentGrantedAt
        }
      : null,
    constraints: {
      partySize: userContext.partySize,
      totalBudgetCents: userContext.totalBudgetCents,
      maxDistanceMeters: userContext.maxDistanceMeters,
      maxDeliveryMinutes: userContext.maxDeliveryMinutes,
      exclusions: [...(userContext.exclusions ?? [])]
    },
    preferences: {
      tastes: [...(userContext.tastePreferences ?? [])],
      currentPriority: userContext.currentPriority,
      recentCandidateIds: [...(userContext.recentHistory ?? [])]
    }
  };
}

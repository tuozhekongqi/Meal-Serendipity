import { PROVIDER_CONFIG, PROVIDER_SCHEMA_VERSION } from '../config.js';
import { DISHES } from '../data/dishes.js';
import { SOURCE_MODE } from '../domain/models.js';

function abortError(reason) {
  if (reason instanceof Error) return reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}

function toSafeInspirationCandidate(candidate) {
  return {
    ...candidate,
    sourceMode: SOURCE_MODE.INSPIRATION,
    store: null,
    item: { ...candidate.item, isAvailable: null },
    pricing: null,
    delivery: null,
    availability: null,
    orderUrl: null,
    dataUpdatedAt: null
  };
}

export class InspirationCandidateProvider {
  constructor({ candidates = DISHES, now = () => new Date() } = {}) {
    this.candidates = candidates;
    this.now = now;
  }

  async getCandidates(_userContext, { signal } = {}) {
    if (signal?.aborted) throw abortError(signal.reason);
    const fetchedAt = this.now();
    return {
      schemaVersion: PROVIDER_SCHEMA_VERSION,
      mode: SOURCE_MODE.INSPIRATION,
      candidates: this.candidates.map(toSafeInspirationCandidate),
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: new Date(fetchedAt.getTime() + PROVIDER_CONFIG.liveTtlMs).toISOString(),
      notices: [{
        code: 'INSPIRATION_ONLY',
        message: '当前提供菜品灵感，不含实时商家、价格、距离或配送时间。'
      }]
    };
  }
}

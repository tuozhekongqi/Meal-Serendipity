import assert from 'node:assert/strict';
import test from 'node:test';

import { DISHES } from '../../src/data/dishes.js';
import {
  CandidateProviderError,
  FallbackCandidateProvider,
  PROVIDER_ERROR_CODE
} from '../../src/providers/candidate-provider.js';
import { HttpCandidateProvider } from '../../src/providers/http-provider.js';
import { InspirationCandidateProvider } from '../../src/providers/inspiration-provider.js';

const NOW = new Date('2026-08-17T03:00:00.000Z');

function context(overrides = {}) {
  return {
    locale: 'zh-CN',
    location: {
      latitude: 31.2304,
      longitude: 121.4737,
      accuracyMeters: 120,
      areaLabel: '上海市黄浦区',
      consentGrantedAt: '2026-08-17T02:59:58.000Z'
    },
    partySize: 1,
    totalBudgetCents: 3500,
    maxDistanceMeters: 3000,
    maxDeliveryMinutes: 35,
    exclusions: ['花生'],
    tastePreferences: ['辣'],
    currentPriority: 'fastest',
    recentHistory: [],
    ...overrides
  };
}

function liveCandidate(overrides = {}) {
  return {
    id: 'provider:store-7:item-42',
    sourceMode: 'live',
    store: { id: 'store-7', name: '已授权门店', rating: 4.7, ratingCount: 328, isOpen: true },
    item: {
      id: 'item-42',
      name: '已授权套餐',
      description: '一人份',
      imageUrl: null,
      tasteTags: ['咸鲜'],
      categoryTags: ['米饭'],
      allergenTags: [],
      ingredientTags: ['鸡肉'],
      isAvailable: true
    },
    pricing: { totalCents: 3000, isEstimate: false, unknownFeeLabels: [] },
    delivery: { distanceMeters: 1800, etaMinutes: 28 },
    availability: { isOrderable: true, reason: null },
    orderUrl: 'https://provider.example.test/order/store-7/item-42',
    dataUpdatedAt: '2026-08-17T02:59:59.000Z',
    metadata: {},
    ...overrides
  };
}

function response(overrides = {}) {
  return {
    schemaVersion: '1.0',
    requestId: 'request-1',
    mode: 'live',
    fetchedAt: '2026-08-17T03:00:00.000Z',
    expiresAt: '2026-08-17T03:05:00.000Z',
    candidates: [liveCandidate()],
    notices: [],
    ...overrides
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test('inspiration provider returns all static candidates without invented live fields', async () => {
  const provider = new InspirationCandidateProvider({ now: () => NOW });
  const result = await provider.getCandidates(context());

  assert.equal(result.mode, 'inspiration');
  assert.equal(result.candidates.length, 175);
  assert.deepEqual(result.candidates[0], DISHES[0]);
  for (const candidate of result.candidates) {
    assert.equal(candidate.sourceMode, 'inspiration');
    assert.equal(candidate.store, null);
    assert.equal(candidate.pricing, null);
    assert.equal(candidate.delivery, null);
    assert.equal(candidate.availability, null);
    assert.equal(candidate.orderUrl, null);
    assert.equal(candidate.dataUpdatedAt, null);
  }
  assert.equal(result.notices[0].code, 'INSPIRATION_ONLY');
});

test('inspiration provider strips live-looking fields from injected candidates', async () => {
  const provider = new InspirationCandidateProvider({
    candidates: [liveCandidate()],
    now: () => NOW
  });
  const [candidate] = (await provider.getCandidates(context())).candidates;

  assert.equal(candidate.sourceMode, 'inspiration');
  assert.equal(candidate.store, null);
  assert.equal(candidate.pricing, null);
  assert.equal(candidate.delivery, null);
  assert.equal(candidate.availability, null);
  assert.equal(candidate.orderUrl, null);
  assert.equal(candidate.dataUpdatedAt, null);
  assert.equal(candidate.item.isAvailable, null);
});

test('fallback provider uses inspiration when no live provider is configured', async () => {
  const provider = new FallbackCandidateProvider({
    inspirationProvider: new InspirationCandidateProvider({ now: () => NOW })
  });
  const result = await provider.getCandidates(context());

  assert.equal(result.mode, 'inspiration');
  assert.ok(result.notices.some(({ code }) => code === 'LIVE_PROVIDER_NOT_CONFIGURED'));
});

test('fallback provider contains live failures and exposes a non-sensitive reason', async () => {
  const provider = new FallbackCandidateProvider({
    liveProvider: {
      getCandidates: async () => {
        throw new CandidateProviderError(PROVIDER_ERROR_CODE.TIMEOUT, 'precise data omitted');
      }
    },
    inspirationProvider: new InspirationCandidateProvider({ now: () => NOW })
  });
  const result = await provider.getCandidates(context());

  assert.equal(result.mode, 'inspiration');
  assert.ok(result.notices.some(({ code }) => code === 'LIVE_PROVIDER_TIMEOUT'));
  assert.equal(JSON.stringify(result).includes('precise data omitted'), false);
});

test('fallback provider returns a safe empty inspiration response even if both providers fail', async () => {
  const failing = { getCandidates: async () => { throw new Error('failure'); } };
  const provider = new FallbackCandidateProvider({ liveProvider: failing, inspirationProvider: failing });
  const result = await provider.getCandidates(context());

  assert.equal(result.mode, 'inspiration');
  assert.deepEqual(result.candidates, []);
  assert.ok(result.notices.some(({ code }) => code === 'INSPIRATION_PROVIDER_UNAVAILABLE'));
});

test('HTTP provider sends the unified request and returns a valid live response', async () => {
  let request;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async (url, init) => {
      request = { url, init };
      return jsonResponse(response());
    },
    now: () => NOW,
    requestId: () => 'request-1'
  });
  const result = await provider.getCandidates(context());

  assert.equal(result.mode, 'live');
  assert.equal(result.candidates.length, 1);
  assert.equal(request.url, 'https://provider.example.test/v1/candidates/search');
  assert.equal(request.init.method, 'POST');
  const body = JSON.parse(request.init.body);
  assert.equal(body.location.latitude, 31.2304);
  assert.deepEqual(body.constraints.exclusions, ['花生']);
});

test('HTTP provider rejects stale live responses', async () => {
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => jsonResponse(response({
      fetchedAt: '2026-08-17T02:54:59.000Z',
      expiresAt: '2026-08-17T02:59:59.000Z'
    })),
    now: () => NOW,
    requestId: () => 'request-1'
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.STALE_RESPONSE
  );
});

test('HTTP provider rejects responses whose TTL exceeds five minutes', async () => {
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => jsonResponse(response({ expiresAt: '2026-08-17T03:05:00.001Z' })),
    now: () => NOW,
    requestId: () => 'request-1'
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.INVALID_RESPONSE
  );
});

test('HTTP provider drops candidates missing required live fields without inventing values', async () => {
  const invalid = liveCandidate({ delivery: null });
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => jsonResponse(response({ candidates: [invalid, liveCandidate({ id: 'valid' })] })),
    now: () => NOW,
    requestId: () => 'request-1'
  });
  const result = await provider.getCandidates(context());

  assert.deepEqual(result.candidates.map(({ id }) => id), ['valid']);
  assert.ok(result.notices.some(({ code }) => code === 'INVALID_CANDIDATES_DROPPED'));
});

test('HTTP provider rejects an invalid top-level response', async () => {
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => jsonResponse({ candidates: [] }),
    now: () => NOW
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.INVALID_RESPONSE
  );
});

test('HTTP provider rejects a response for a different request id', async () => {
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => jsonResponse(response({ requestId: 'another-request' })),
    now: () => NOW,
    requestId: () => 'request-1'
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.INVALID_RESPONSE
  );
});

test('HTTP provider retries one retryable status and then succeeds', async () => {
  let calls = 0;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => (++calls === 1 ? jsonResponse({}, 503) : jsonResponse(response())),
    sleep: async () => {},
    random: () => 0,
    now: () => NOW,
    requestId: () => 'request-1'
  });
  const result = await provider.getCandidates(context());

  assert.equal(calls, 2);
  assert.equal(result.mode, 'live');
});

test('HTTP provider does not retry non-retryable HTTP failures', async () => {
  let calls = 0;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => { calls += 1; return jsonResponse({}, 400); },
    now: () => NOW
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.INVALID_CONTEXT
  );
  assert.equal(calls, 1);
});

test('HTTP provider retries a network failure once and returns a typed failure', async () => {
  let calls = 0;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => { calls += 1; throw new TypeError('network down'); },
    sleep: async () => {},
    now: () => NOW
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.UNAVAILABLE
  );
  assert.equal(calls, 2);
});

test('HTTP provider rejects a live request without exact consented location before fetch', async () => {
  let calls = 0;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async () => { calls += 1; return jsonResponse(response()); },
    now: () => NOW
  });

  await assert.rejects(
    () => provider.getCandidates(context({ location: null })),
    ({ code }) => code === PROVIDER_ERROR_CODE.INVALID_CONTEXT
  );
  assert.equal(calls, 0);
});

test('HTTP provider converts request timeout to a typed failure and retries at most once', async () => {
  let calls = 0;
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async (_url, { signal }) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    },
    requestTimeoutMs: 5,
    totalTimeoutMs: 30,
    sleep: async () => {},
    now: () => NOW
  });

  await assert.rejects(
    () => provider.getCandidates(context()),
    ({ code }) => code === PROVIDER_ERROR_CODE.TIMEOUT
  );
  assert.equal(calls, 2);
});

test('HTTP provider respects caller cancellation without retrying', async () => {
  let calls = 0;
  const controller = new AbortController();
  const provider = new HttpCandidateProvider({
    endpoint: 'https://provider.example.test/v1/candidates/search',
    fetch: async (_url, { signal }) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    },
    now: () => NOW
  });
  const pending = provider.getCandidates(context(), { signal: controller.signal });
  controller.abort();

  await assert.rejects(pending, ({ name }) => name === 'AbortError');
  assert.equal(calls, 1);
});

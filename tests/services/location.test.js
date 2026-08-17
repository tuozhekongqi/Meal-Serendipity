import assert from 'node:assert/strict';
import test from 'node:test';

import { createManualLocation, getCurrentLocation } from '../../src/services/location.js';

test('location returns unavailable when geolocation is unsupported', async () => {
  assert.deepEqual(await getCurrentLocation({ geolocation: null }), {
    status: 'unavailable',
    location: null
  });
});

test('location maps user denial without throwing', async () => {
  const geolocation = {
    getCurrentPosition(_success, error) { error({ code: 1 }); }
  };
  assert.deepEqual(await getCurrentLocation({ geolocation }), {
    status: 'denied',
    location: null
  });
});

test('location contains synchronous browser API failures', async () => {
  const geolocation = {
    getCurrentPosition() { throw new Error('browser failure'); }
  };
  assert.deepEqual(await getCurrentLocation({ geolocation }), {
    status: 'unavailable',
    location: null
  });
});

test('location returns an explicit timeout when browser callback never arrives', async () => {
  const geolocation = { getCurrentPosition() {} };
  const result = await getCurrentLocation({ geolocation, timeoutMs: 5 });
  assert.deepEqual(result, { status: 'timeout', location: null });
});

test('location keeps exact coordinates only in the returned in-memory value', async () => {
  const geolocation = {
    getCurrentPosition(success) {
      success({ coords: { latitude: 31.2, longitude: 121.4, accuracy: 25 } });
    }
  };
  const result = await getCurrentLocation({
    geolocation,
    now: () => new Date('2026-08-17T03:00:00.000Z')
  });

  assert.equal(result.status, 'granted');
  assert.deepEqual(result.location, {
    latitude: 31.2,
    longitude: 121.4,
    accuracyMeters: 25,
    areaLabel: null,
    consentGrantedAt: '2026-08-17T03:00:00.000Z',
    source: 'browser'
  });
});

test('manual location is deliberately coarse and contains no coordinates', () => {
  assert.deepEqual(createManualLocation(' 上海市黄浦区 '), {
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    areaLabel: '上海市黄浦区',
    consentGrantedAt: null,
    source: 'manual'
  });
});

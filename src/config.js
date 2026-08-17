export const PROVIDER_SCHEMA_VERSION = '1.0';

export const PROVIDER_CONFIG = Object.freeze({
  endpoint: null,
  requestTimeoutMs: 4_000,
  totalTimeoutMs: 8_000,
  maxRetries: 1,
  retryDelayMinMs: 200,
  retryDelayMaxMs: 400,
  liveTtlMs: 5 * 60 * 1_000
});

export const STORAGE_CONFIG = Object.freeze({
  key: 'meal-serendipity:preferences',
  version: 1
});

import { PROVIDER_CONFIG, PROVIDER_SCHEMA_VERSION } from '../config.js';
import { SOURCE_MODE } from '../domain/models.js';
import { toProviderRequest } from '../services/context.js';
import { CandidateProviderError, PROVIDER_ERROR_CODE } from './candidate-provider.js';

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function defaultRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}`;
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function errorForStatus(status) {
  const code = status === 400 || status === 422
    ? PROVIDER_ERROR_CODE.INVALID_CONTEXT
    : status === 401 || status === 403
      ? PROVIDER_ERROR_CODE.NOT_AUTHORIZED
      : status === 409
        ? PROVIDER_ERROR_CODE.LOCATION_TOO_IMPRECISE
        : status === 429
          ? PROVIDER_ERROR_CODE.RATE_LIMITED
          : status === 504
            ? PROVIDER_ERROR_CODE.TIMEOUT
            : PROVIDER_ERROR_CODE.UNAVAILABLE;
  return new CandidateProviderError(code, 'Candidate provider request failed.', {
    status,
    retryable: RETRYABLE_STATUS.has(status)
  });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function hasExactConsentedLocation(location) {
  return Boolean(
    location
    && Number.isFinite(location.latitude)
    && location.latitude >= -90
    && location.latitude <= 90
    && Number.isFinite(location.longitude)
    && location.longitude >= -180
    && location.longitude <= 180
    && isNonNegativeNumber(location.accuracyMeters)
    && Number.isFinite(Date.parse(location.consentGrantedAt ?? ''))
  );
}

function isValidLiveCandidate(candidate, fetchedAtMs) {
  const updatedAtMs = Date.parse(candidate?.dataUpdatedAt ?? '');
  return Boolean(
    candidate
    && isNonEmptyString(candidate.id)
    && candidate.sourceMode === SOURCE_MODE.LIVE
    && candidate.store
    && isNonEmptyString(candidate.store.id)
    && isNonEmptyString(candidate.store.name)
    && typeof candidate.store.isOpen === 'boolean'
    && candidate.item
    && isNonEmptyString(candidate.item.id)
    && isNonEmptyString(candidate.item.name)
    && Array.isArray(candidate.item.tasteTags)
    && Array.isArray(candidate.item.categoryTags)
    && Array.isArray(candidate.item.allergenTags)
    && Array.isArray(candidate.item.ingredientTags)
    && typeof candidate.item.isAvailable === 'boolean'
    && candidate.pricing
    && isNonNegativeNumber(candidate.pricing.totalCents)
    && candidate.delivery
    && isNonNegativeNumber(candidate.delivery.distanceMeters)
    && isNonNegativeNumber(candidate.delivery.etaMinutes)
    && candidate.availability
    && typeof candidate.availability.isOrderable === 'boolean'
    && Number.isFinite(updatedAtMs)
    && updatedAtMs <= fetchedAtMs
  );
}

function validateResponse(payload, now, maxTtlMs, expectedRequestId) {
  const fetchedAtMs = Date.parse(payload?.fetchedAt ?? '');
  const expiresAtMs = Date.parse(payload?.expiresAt ?? '');
  const nowMs = now.getTime();
  if (
    payload?.schemaVersion !== PROVIDER_SCHEMA_VERSION
    || payload?.requestId !== expectedRequestId
    || payload?.mode !== SOURCE_MODE.LIVE
    || !Array.isArray(payload.candidates)
    || !Array.isArray(payload.notices)
    || !Number.isFinite(fetchedAtMs)
    || !Number.isFinite(expiresAtMs)
    || expiresAtMs < fetchedAtMs
    || expiresAtMs - fetchedAtMs > maxTtlMs
  ) {
    throw new CandidateProviderError(
      PROVIDER_ERROR_CODE.INVALID_RESPONSE,
      'Candidate provider returned an invalid response.'
    );
  }
  if (expiresAtMs < nowMs) {
    throw new CandidateProviderError(
      PROVIDER_ERROR_CODE.STALE_RESPONSE,
      'Candidate provider response has expired.'
    );
  }

  const candidates = payload.candidates.filter((candidate) => isValidLiveCandidate(candidate, fetchedAtMs));
  const dropped = payload.candidates.length - candidates.length;
  return {
    schemaVersion: payload.schemaVersion,
    requestId: payload.requestId ?? null,
    mode: SOURCE_MODE.LIVE,
    fetchedAt: payload.fetchedAt,
    expiresAt: payload.expiresAt,
    candidates,
    notices: dropped > 0
      ? [...payload.notices, {
          code: 'INVALID_CANDIDATES_DROPPED',
          message: `${dropped} 个字段不完整的实时候选已被安全忽略。`
        }]
      : [...payload.notices]
  };
}

function wait(delayMs, signal, sleep) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (sleep) return sleep(delayMs);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(abortError());
    }, { once: true });
  });
}

export class HttpCandidateProvider {
  constructor({
    endpoint,
    fetch: fetchImplementation = globalThis.fetch,
    now = () => new Date(),
    requestId = defaultRequestId,
    random = Math.random,
    sleep = null,
    requestTimeoutMs = PROVIDER_CONFIG.requestTimeoutMs,
    totalTimeoutMs = PROVIDER_CONFIG.totalTimeoutMs,
    maxRetries = PROVIDER_CONFIG.maxRetries,
    maxTtlMs = PROVIDER_CONFIG.liveTtlMs
  } = {}) {
    if (!isNonEmptyString(endpoint) || !endpoint.startsWith('https://')) {
      throw new TypeError('HttpCandidateProvider requires an HTTPS endpoint');
    }
    if (typeof fetchImplementation !== 'function') {
      throw new TypeError('HttpCandidateProvider requires fetch');
    }
    this.endpoint = endpoint;
    this.fetch = fetchImplementation;
    this.now = now;
    this.requestId = requestId;
    this.random = random;
    this.sleep = sleep;
    this.requestTimeoutMs = requestTimeoutMs;
    this.totalTimeoutMs = totalTimeoutMs;
    this.maxRetries = maxRetries;
    this.maxTtlMs = maxTtlMs;
  }

  async getCandidates(userContext, { signal } = {}) {
    if (signal?.aborted) throw abortError();
    if (!hasExactConsentedLocation(userContext?.location)) {
      throw new CandidateProviderError(
        PROVIDER_ERROR_CODE.INVALID_CONTEXT,
        'Live candidate requests require a consented exact location.'
      );
    }
    const requestedAt = this.now();
    const requestId = this.requestId();
    const body = toProviderRequest(userContext, {
      requestId,
      requestedAt: requestedAt.toISOString()
    });
    const totalController = new AbortController();
    const totalTimer = setTimeout(() => {
      totalController.abort(new CandidateProviderError(
        PROVIDER_ERROR_CODE.TIMEOUT,
        'Candidate provider exceeded its total time budget.',
        { retryable: false }
      ));
    }, this.totalTimeoutMs);
    const onCallerAbort = () => totalController.abort(abortError());
    signal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        try {
          const payload = await this.#fetchOnce(body, totalController.signal);
          return validateResponse(payload, this.now(), this.maxTtlMs, requestId);
        } catch (error) {
          if (signal?.aborted) throw abortError();
          if (totalController.signal.aborted) {
            throw totalController.signal.reason instanceof Error
              ? totalController.signal.reason
              : new CandidateProviderError(PROVIDER_ERROR_CODE.TIMEOUT);
          }
          const normalized = error instanceof CandidateProviderError
            ? error
            : new CandidateProviderError(
                PROVIDER_ERROR_CODE.UNAVAILABLE,
                'Candidate provider network request failed.',
                { retryable: true, cause: error }
              );
          if (!normalized.retryable || attempt === this.maxRetries) throw normalized;
          const spread = PROVIDER_CONFIG.retryDelayMaxMs - PROVIDER_CONFIG.retryDelayMinMs;
          const delay = PROVIDER_CONFIG.retryDelayMinMs + Math.round(this.random() * spread);
          await wait(delay, totalController.signal, this.sleep);
        }
      }
      throw new CandidateProviderError(PROVIDER_ERROR_CODE.UNAVAILABLE);
    } finally {
      clearTimeout(totalTimer);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async #fetchOnce(body, totalSignal) {
    const attemptController = new AbortController();
    const onTotalAbort = () => attemptController.abort(totalSignal.reason);
    totalSignal.addEventListener('abort', onTotalAbort, { once: true });
    const timeoutError = new CandidateProviderError(
      PROVIDER_ERROR_CODE.TIMEOUT,
      'Candidate provider request timed out.',
      { retryable: true }
    );
    const timer = setTimeout(() => attemptController.abort(timeoutError), this.requestTimeoutMs);
    try {
      const response = await this.fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Request-Id': body.requestId
        },
        body: JSON.stringify(body),
        signal: attemptController.signal
      });
      if (!response?.ok) throw errorForStatus(response?.status ?? 0);
      try {
        return await response.json();
      } catch (error) {
        throw new CandidateProviderError(
          PROVIDER_ERROR_CODE.INVALID_RESPONSE,
          'Candidate provider returned invalid JSON.',
          { cause: error }
        );
      }
    } catch (error) {
      if (attemptController.signal.aborted) {
        throw attemptController.signal.reason instanceof Error
          ? attemptController.signal.reason
          : timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      totalSignal.removeEventListener('abort', onTotalAbort);
    }
  }
}

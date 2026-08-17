import { PROVIDER_SCHEMA_VERSION } from '../config.js';
import { SOURCE_MODE } from '../domain/models.js';

export const PROVIDER_ERROR_CODE = Object.freeze({
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  NOT_AUTHORIZED: 'PROVIDER_NOT_AUTHORIZED',
  LOCATION_TOO_IMPRECISE: 'LOCATION_TOO_IMPRECISE',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  TIMEOUT: 'PROVIDER_TIMEOUT',
  INVALID_RESPONSE: 'INVALID_PROVIDER_RESPONSE',
  STALE_RESPONSE: 'STALE_PROVIDER_RESPONSE'
});

export class CandidateProviderError extends Error {
  constructor(code, message = 'Candidate provider failed.', options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'CandidateProviderError';
    this.code = code;
    this.retryable = options.retryable === true;
    this.status = options.status ?? null;
  }
}

function noticeForFailure(error) {
  const code = error instanceof CandidateProviderError ? error.code : PROVIDER_ERROR_CODE.UNAVAILABLE;
  const mapping = {
    [PROVIDER_ERROR_CODE.TIMEOUT]: ['LIVE_PROVIDER_TIMEOUT', '实时数据请求超时，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.STALE_RESPONSE]: ['LIVE_PROVIDER_STALE', '实时数据已过期，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.LOCATION_TOO_IMPRECISE]: ['LIVE_LOCATION_IMPRECISE', '定位精度不足，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.INVALID_CONTEXT]: ['LIVE_CONTEXT_INVALID', '当前条件无法用于实时查询，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.NOT_AUTHORIZED]: ['LIVE_PROVIDER_NOT_AUTHORIZED', '实时数据服务未获授权，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.RATE_LIMITED]: ['LIVE_PROVIDER_RATE_LIMITED', '实时数据服务繁忙，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.INVALID_RESPONSE]: ['LIVE_PROVIDER_INVALID_RESPONSE', '实时数据响应无效，已切换为菜品灵感。'],
    [PROVIDER_ERROR_CODE.UNAVAILABLE]: ['LIVE_PROVIDER_UNAVAILABLE', '实时数据暂不可用，已切换为菜品灵感。']
  };
  const [noticeCode, message] = mapping[code] ?? mapping[PROVIDER_ERROR_CODE.UNAVAILABLE];
  return { code: noticeCode, message };
}

function safeEmptyResponse(now, notices) {
  const timestamp = now().toISOString();
  return {
    schemaVersion: PROVIDER_SCHEMA_VERSION,
    mode: SOURCE_MODE.INSPIRATION,
    candidates: [],
    fetchedAt: timestamp,
    expiresAt: timestamp,
    notices
  };
}

/**
 * Tries an optional live provider and always contains provider failures behind
 * the shared response contract. It does not rank or filter candidates.
 */
export class FallbackCandidateProvider {
  constructor({ liveProvider = null, inspirationProvider = null, now = () => new Date() } = {}) {
    this.liveProvider = liveProvider;
    this.inspirationProvider = inspirationProvider;
    this.now = now;
  }

  async getCandidates(userContext, options = {}) {
    let fallbackNotice = {
      code: 'LIVE_PROVIDER_NOT_CONFIGURED',
      message: '当前未配置实时数据服务，提供菜品灵感。'
    };

    if (this.liveProvider) {
      try {
        return await this.liveProvider.getCandidates(userContext, options);
      } catch (error) {
        if (options.signal?.aborted || error?.name === 'AbortError') throw error;
        fallbackNotice = noticeForFailure(error);
      }
    }

    if (this.inspirationProvider) {
      try {
        const response = await this.inspirationProvider.getCandidates(userContext, options);
        return { ...response, notices: [...(response.notices ?? []), fallbackNotice] };
      } catch (error) {
        if (options.signal?.aborted || error?.name === 'AbortError') throw error;
      }
    }

    return safeEmptyResponse(this.now, [
      fallbackNotice,
      { code: 'INSPIRATION_PROVIDER_UNAVAILABLE', message: '菜品灵感暂不可用，请稍后重试。' }
    ]);
  }
}

function result(status, location = null) {
  return { status, location };
}

export function getCurrentLocation({
  geolocation = globalThis.navigator?.geolocation ?? null,
  timeoutMs = 4_000,
  signal,
  now = () => new Date()
} = {}) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.resolve(result('unavailable'));
  }
  if (signal?.aborted) return Promise.resolve(result('aborted'));

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    };
    const onAbort = () => finish(result('aborted'));
    const timer = setTimeout(() => finish(result('timeout')), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      geolocation.getCurrentPosition(
        ({ coords }) => finish(result('granted', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
          areaLabel: null,
          consentGrantedAt: now().toISOString(),
          source: 'browser'
        })),
        ({ code }) => finish(result(code === 1 ? 'denied' : code === 3 ? 'timeout' : 'unavailable')),
        { enableHighAccuracy: false, maximumAge: 0, timeout: timeoutMs }
      );
    } catch {
      finish(result('unavailable'));
    }
  });
}

export function createManualLocation(areaLabel) {
  return {
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    areaLabel: String(areaLabel ?? '').trim() || null,
    consentGrantedAt: null,
    source: 'manual'
  };
}

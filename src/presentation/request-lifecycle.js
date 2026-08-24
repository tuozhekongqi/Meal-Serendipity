export function requestIsCurrent(request, activeRequest) {
  return Boolean(request)
    && request.signal.aborted === false
    && activeRequest === request;
}

export function commitIfCurrentRequest(request, activeRequest, commit) {
  if (!requestIsCurrent(request, activeRequest)) return false;
  commit();
  return true;
}

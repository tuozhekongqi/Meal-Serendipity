import assert from 'node:assert/strict';
import test from 'node:test';

import { commitIfCurrentRequest } from '../../src/presentation/request-lifecycle.js';

test('editing during a request prevents the aborted request from committing a later failure', () => {
  const request = new AbortController();
  let activeRequest = request;
  let visibleStatus = 'loading';

  request.abort();
  activeRequest = null;
  visibleStatus = 'editing-preferences';
  const didCommit = commitIfCurrentRequest(request, activeRequest, () => { visibleStatus = 'error'; });

  assert.equal(didCommit, false);
  assert.equal(visibleStatus, 'editing-preferences');
});

test('an older request cannot commit after a newer request becomes active', () => {
  const olderRequest = new AbortController();
  const activeRequest = new AbortController();
  let visibleStatus = 'loading-new-request';

  const didCommit = commitIfCurrentRequest(olderRequest, activeRequest, () => { visibleStatus = 'error'; });

  assert.equal(olderRequest.signal.aborted, false);
  assert.equal(didCommit, false);
  assert.equal(visibleStatus, 'loading-new-request');
});

test('the current non-aborted request commits exactly once', () => {
  const request = new AbortController();
  const committed = [];

  const didCommit = commitIfCurrentRequest(request, request, () => committed.push('success'));

  assert.equal(didCommit, true);
  assert.deepEqual(committed, ['success']);
});

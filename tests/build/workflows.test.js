import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

async function workflow(name) {
  return parse(await readFile(path.join(projectRoot, '.github', 'workflows', name), 'utf8'));
}

test('CI validates pull requests with syntax, unit, build, artifact, and E2E checks', async () => {
  const ci = await workflow('ci.yml');
  assert.ok(ci.on.pull_request);
  assert.deepEqual(ci.permissions, { contents: 'read' });

  const steps = ci.jobs.validate.steps;
  const commands = steps.map((step) => step.run).filter(Boolean);
  for (const requiredCommand of [
    'npm ci',
    'npm run check:js',
    'npm test',
    'npm run build',
    'npm run check:dist',
    'npx playwright install --with-deps chromium',
    'npm run test:e2e'
  ]) {
    assert.ok(commands.includes(requiredCommand), `CI must run ${requiredCommand}`);
  }
});

test('Pages deploys only dist after a successful validation build', async () => {
  const pages = await workflow('pages.yml');
  assert.ok(pages.on.push.branches.includes('main'));
  assert.ok(pages.on.workflow_dispatch !== undefined);
  assert.equal(pages.permissions.contents, 'read');
  assert.equal(pages.permissions.pages, 'write');
  assert.equal(pages.permissions['id-token'], 'write');
  assert.equal(pages.concurrency['cancel-in-progress'], false);
  assert.equal(pages.jobs.deploy.needs, 'build');

  const upload = pages.jobs.build.steps.find((step) => String(step.uses).startsWith('actions/upload-pages-artifact@'));
  assert.equal(upload.with.path, './dist');
  assert.ok(pages.jobs.deploy.steps.some((step) => String(step.uses).startsWith('actions/deploy-pages@')));
});

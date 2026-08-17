# Phase 6A Governance Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved Phase 6A documentation and governance sync without changing runtime code, dependencies, recommendation behavior, or Provider configuration.

**Architecture:** Keep `docs/phase-6a-metrics-and-privacy.md` as the privacy and measurement authority, preserve the Phase 0 rollback baseline, and add a separate evidence-backed modern UI checklist. Update governance and release documentation only where current GitHub configuration or repository evidence proves the new state.

**Tech Stack:** Markdown, Git, GitHub CLI, Node.js 22, npm, Playwright, GitHub Actions, GitHub Pages

## Global Constraints

- Do not modify runtime source, recommendation logic, UI behavior, dependencies, storage, or Provider configuration.
- Do not add analytics code, analytics SDKs, tracking scripts, databases, or data receivers.
- Do not edit `docs/current-behavior-checklist.md`; it remains the Phase 0 rollback baseline.
- Do not mark Phase 4 complete.
- Mark a checkbox complete only when repository content, a passing automated check, a committed browser verification record, or current GitHub API state supplies evidence.
- Record online smoke-test failures exactly; do not infer public reachability from an Actions deployment alone.
- Keep all work on `codex/phase-6a-metrics-privacy` and do not merge `main`.

---

### Task 1: Final Phase 6A privacy contract audit

**Files:**
- Modify: `docs/phase-6a-metrics-and-privacy.md`

**Interfaces:**
- Consumes: approved Phase 6A event and retention design
- Produces: unambiguous default retention, approval boundary, and a complete seven-event design contract

- [ ] State explicitly that 30 days is the default maximum raw-event retention.
- [ ] State explicitly that retaining de-identified aggregates for up to 90 days is optional and requires separate approval before collection starts.
- [ ] Audit all seven event rows for trigger, required fields, prohibited fields, purpose, and future-pilot necessity.
- [ ] Confirm the document forbids interpreting static inspiration actions as real order conversion.
- [ ] Run a focused text scan for all event names, retention values, prohibited analytics implementation, and conversion-boundary language.

### Task 2: Current deployment and collaboration documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: GitHub Pages API `build_type: workflow`, `.github/workflows/pages.yml`, and successful deployment evidence for `a87db1c`
- Produces: current deployment wording with an explicit branch-deployment rollback path

- [ ] Replace legacy-current wording with GitHub Actions deployment from generated `dist/`.
- [ ] Keep root `index.html` documented as a development source and branch-deployment rollback source, not the current published artifact.
- [ ] Preserve the no-secret, inspiration/live, PR, and rollback rules.
- [ ] Check all changed Markdown links resolve to repository files or approved web URLs.

### Task 3: Modern UI current behavior checklist

**Files:**
- Create: `docs/current-modern-ui-checklist.md`
- Read: `index.html`
- Read: `src/main.js`
- Read: `src/components/*.js`
- Read: `src/config.js`
- Read: `tests/e2e/recommendation-flow.spec.js`

**Interfaces:**
- Consumes: current `main` behavior at `a87db1c`, current tests, and fresh smoke-test results
- Produces: a current operational baseline that does not replace the Phase 0 historical checklist

- [ ] Record the modern UI entry points, three-step precise flow, recommendation states, copy/swap/feedback/reset behavior, storage behavior, and privacy dialog.
- [ ] Record the current inspiration-only boundary, disabled live Provider, simplified party-size behavior, and missing real location/budget/ETA/distance/order capabilities.
- [ ] Separate source/test evidence, GitHub deployment evidence, local built-site evidence, and online reachability evidence.
- [ ] Add a repeatable smoke-test checklist for users testing from mobile data or another network.

### Task 4: Evidence-backed phase status synchronization

**Files:**
- Modify: `docs/implementation-plan.md`

**Interfaces:**
- Consumes: files on `main`, 76 passing Node tests, current E2E coverage, GitHub Actions state, and the approved Phase 6A document
- Produces: checkboxes and status notes that distinguish completed, partial, blocked, and not-started work

- [ ] Add an evidence date and source commit for the status synchronization.
- [ ] Mark only Phase 0/1/2/3/5 actions that have direct evidence; leave missing UI fields, incomplete scenarios, performance budgets, and independent-PR actions unchecked.
- [ ] Keep every Phase 4 action unchecked and state the external Provider gate is unmet.
- [ ] Mark Phase 6A design complete only after the privacy document audit passes; state analytics implementation and telemetry collection remain absent.
- [ ] Avoid rewriting historical plans under `docs/superpowers/plans/` as if their original execution records were current status ledgers.

### Task 5: GitHub and online smoke verification

**Files:**
- Modify: `docs/current-modern-ui-checklist.md` only to record evidence

**Interfaces:**
- Consumes: GitHub CLI/API, the production URL, favicon, assets, custom 404, and browser automation
- Produces: dated verification results and explicit unresolved items

- [ ] Re-fetch `origin/main` and verify it is still `a87db1c38a164793af9793f28db22b1fb7d1d622` before finalizing status claims.
- [ ] Query Pages configuration, latest CI/deployment conclusions, branch protection, repository rulesets, and repository permissions.
- [ ] Attempt HTTP and real Chromium access to the production home page, assets, favicon, and a missing route.
- [ ] If production is reachable, exercise quick recommendation, precise filtering, and a small mobile viewport.
- [ ] If production is unreachable, record the exact error and leave end-user reachability unverified.
- [ ] Document recommended branch protection: require PRs, require the exact CI check discovered from Actions, block direct pushes, and disallow bypass where supported.

### Task 6: Full validation and implementation commit

**Files:**
- Verify all modified Markdown files
- No production file changes expected

**Interfaces:**
- Consumes: completed documentation diff
- Produces: reproducible validation evidence and an isolated governance commit

- [ ] Run `npm run check:js`.
- [ ] Run `npm test`.
- [ ] Run `npm run build` and `npm run check:dist`.
- [ ] Run `npm run test:e2e` with Chromium if the local browser environment permits it.
- [ ] Run Markdown link/structure checks without adding a dependency.
- [ ] Run `git diff --check`, inspect `git diff --stat`, and verify no runtime or dependency files changed.
- [ ] Commit the governance synchronization separately from the approved Phase 6A specification commit.

## Plan Self-review

- Every requested deliverable maps to one task.
- The plan does not authorize analytics, Provider, algorithm, UI, dependency, or external data changes.
- The Phase 0 baseline remains untouched.
- The online and branch-protection outcomes are evidence-based and may remain explicitly incomplete.
- The retention default and extra-approval boundary are resolved without claiming legal compliance.

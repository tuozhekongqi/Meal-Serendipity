import { PROVIDER_CONFIG } from './config.js';
import { FallbackCandidateProvider } from './providers/candidate-provider.js';
import { InspirationCandidateProvider } from './providers/inspiration-provider.js';
import { composeMealPlan } from './recommendation/meal-plan.js';
import { createPreferenceStorage } from './services/storage.js';
import { clearLegacySensitiveStorage } from './services/legacy-storage.js';
import {
  FLOW_STEP,
  createContextInputFromFlow,
  createFlowState,
  getVisibleSteps,
  transitionFlow
} from './presentation/flow-state.js';
import { createMealPlanViewModel } from './presentation/meal-plan-view-model.js';
import { renderInputFlow } from './components/inputs.js';
import { createDialogController } from './components/dialog.js';
import {
  renderEmptyState,
  renderErrorState,
  renderFeedback,
  renderLoadingState,
  renderStatusActions,
  showToast
} from './components/feedback.js';
import { renderModeNotice, renderRecommendation } from './components/recommendation-card.js';

const roots = {
  input: document.querySelector('#input-flow'),
  desktopActions: document.querySelector('#desktop-actions'),
  mobileActions: document.querySelector('#mobile-actions'),
  result: document.querySelector('#result-content'),
  resultPanel: document.querySelector('#result-panel'),
  notice: document.querySelector('#mode-notice'),
  toast: document.querySelector('#toast-region'),
  mode: document.querySelector('#header-mode'),
  reset: document.querySelector('#reset-button'),
  dataInfo: document.querySelector('#data-info-button'),
  dialog: document.querySelector('#dialog-root')
};

try {
  clearLegacySensitiveStorage(globalThis.localStorage);
} catch {
  // Storage access can be blocked before a storage object is returned.
}

const storage = createPreferenceStorage();
const loadedPreferences = storage.load();
const restored = loadedPreferences.ok && loadedPreferences.value
  ? loadedPreferences
  : { ok: true, value: {} };
const dialog = createDialogController(roots.dialog);
const provider = new FallbackCandidateProvider({
  liveProvider: null,
  inspirationProvider: new InspirationCandidateProvider()
});

let state = createFlowState(restored.ok ? restored.value : null);
let providerResponse = null;
let activeRequest = null;
let excludedCandidateIds = [];

const CONDITION_EVENTS = new Set([
  'select_party_size',
  'select_scene',
  'select_dining_mode',
  'set_budget',
  'set_tastes',
  'set_exclusions',
  'update_diner_draft',
  'set_diner_draft'
]);

const STEP_EDIT_LABELS = Object.freeze({
  [FLOW_STEP.PARTY]: '修改人数',
  [FLOW_STEP.SCENE]: '修改场景',
  [FLOW_STEP.DINING]: '修改用餐方式',
  [FLOW_STEP.PREFERENCES]: '修改偏好'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function updateMode(mode) {
  roots.mode.dataset.mode = mode;
  roots.mode.lastChild.textContent = mode === 'live' ? '实时推荐' : '菜品灵感';
}

function resetRecommendationSession() {
  activeRequest?.abort();
  activeRequest = null;
  providerResponse = null;
  excludedCandidateIds = [];
}

function aggregateDinerTastes(dinerDrafts) {
  return [...new Set(dinerDrafts.flatMap(({ tastePreferences }) => tastePreferences))].slice(0, 10);
}

function dispatch(event, { render = true } = {}) {
  state = transitionFlow(state, event);

  if (['update_diner_draft', 'set_diner_draft'].includes(event.type)) {
    state = transitionFlow(state, {
      type: 'set_tastes',
      value: aggregateDinerTastes(state.dinerDrafts)
    });
    if (state.partySize === 1) {
      state = transitionFlow(state, {
        type: 'set_exclusions',
        value: state.dinerDrafts[0]?.exclusions ?? []
      });
    }
  }

  if (CONDITION_EVENTS.has(event.type) || event.type === 'edit_step') {
    resetRecommendationSession();
    roots.reset.hidden = false;
  }

  if (render) renderApplication();
}

function renderInputs() {
  renderInputFlow({
    root: roots.input,
    desktopActions: roots.desktopActions,
    mobileActions: roots.mobileActions,
    state,
    onEvent: dispatch,
    onAction: handleFlowAction
  });
}

function handleFlowAction(action) {
  if (action === 'back' || action === 'next') {
    dispatch({ type: action });
    return;
  }
  if (action === 'recommend') requestRecommendation();
}

function renderEditingState() {
  roots.result.innerHTML = `<div class="state-card" data-state="initial">
    <div class="state-visual initial" aria-hidden="true"><span class="state-symbol">→</span></div>
    <h3>从用餐人数开始</h3><p>完成当前步骤后，这里会给出一个可解释的菜品灵感。</p>
  </div>`;
}

function addEditControls(root) {
  const controls = document.createElement('nav');
  controls.className = 'state-actions result-edit-actions';
  controls.setAttribute('aria-label', '修改推荐条件');
  controls.innerHTML = `<button class="button button-secondary button-small" type="button" data-edit-step="${FLOW_STEP.PREFERENCES}">返回</button>${getVisibleSteps(state).filter((step) => step !== FLOW_STEP.PREFERENCES).map((step) => (
    `<button class="button button-quiet button-small" type="button" data-edit-step="${step}">${STEP_EDIT_LABELS[step]}</button>`
  )).join('')}`;
  controls.querySelectorAll('[data-edit-step]').forEach((button) => {
    button.addEventListener('click', () => editStep(button.dataset.editStep));
  });
  root.append(controls);
}

function mobileResultActions(primary = null) {
  roots.mobileActions.innerHTML = `${primary ? `<button type="button" class="button button-primary" data-mobile-result="primary">${escapeHtml(primary.action.label)}</button>` : ''}<button type="button" class="button button-secondary" data-mobile-result="swap">换一个</button>`;
  roots.mobileActions.querySelector('[data-mobile-result="primary"]')?.addEventListener('click', () => handlePrimaryAction(primary));
  roots.mobileActions.querySelector('[data-mobile-result="swap"]')?.addEventListener('click', swapRecommendation);
}

function resultEntries(viewModel) {
  if (viewModel.assignments.length) {
    return viewModel.assignments.map(({ ownerLabel, card }) => ({ label: ownerLabel, card }));
  }
  if (viewModel.bundleItems.length) {
    return viewModel.bundleItems.map(({ role, card }, index) => ({
      label: role || `第 ${index + 1} 道`,
      card
    }));
  }
  return viewModel.primary ? [{ label: viewModel.partyLabel, card: viewModel.primary }] : [];
}

function renderSetPlan(viewModel) {
  const entries = resultEntries(viewModel);
  roots.result.innerHTML = `<article class="result-wrap" data-state="success">
    <div class="result-header"><p class="result-overline">已组合这一餐。</p><span class="source-badge">${escapeHtml(viewModel.mode.label)}</span></div>
    <h3 tabindex="-1" id="recommendation-title">${escapeHtml(viewModel.partyLabel ?? '多人用餐')}</h3>
    ${viewModel.sceneLabel ? `<p class="dish-description">${escapeHtml(viewModel.sceneLabel)}</p>` : ''}
    <ul class="reason-list">${entries.map(({ label, card }) => `<li><strong>${escapeHtml(label ?? '餐品')}</strong><span>${card ? escapeHtml(card.name) : '暂无安全候选'}</span>${card?.reasons?.[0]?.message ? `<small>${escapeHtml(card.reasons[0].message)}</small>` : ''}</li>`).join('')}</ul>
    <div class="result-actions"><button class="button button-secondary" type="button" data-result-action="swap">换一个</button></div>
  </article>`;
  const card = roots.result.querySelector('.result-wrap');
  card.querySelector('[data-result-action="swap"]')?.addEventListener('click', swapRecommendation);
  addEditControls(card);
  renderFeedback(card, handleFeedback);
  mobileResultActions();
}

function renderMealPlan(viewModel, { focus = true } = {}) {
  updateMode(viewModel.mode.value);
  renderModeNotice(roots.notice, viewModel.mode);

  if (viewModel.primary) {
    const card = renderRecommendation(roots.result, {
      mode: viewModel.mode,
      primary: viewModel.primary,
      alternatives: viewModel.alternatives.map((alternative) => ({
        ...alternative,
        differenceLabel: alternative.differenceLabel ?? '另一个合适选择'
      }))
    }, {
      onSwap: swapRecommendation,
      onAlternative: () => showToast(roots.toast, '可用“换一个”重新组合整个用餐方案'),
      onPrimaryAction: handlePrimaryAction
    });
    addEditControls(card);
    renderFeedback(card, handleFeedback);
    mobileResultActions(viewModel.primary);
  } else {
    renderSetPlan(viewModel);
  }

  if (focus) {
    roots.result.querySelector('#recommendation-title')?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 47.99rem)').matches) {
      roots.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function renderResult() {
  if (state.step !== FLOW_STEP.RESULT) {
    renderEditingState();
    return;
  }
  if (state.status === 'loading') {
    renderLoadingState(roots.result);
    renderStatusActions(roots.mobileActions, 'loading');
    return;
  }
  if (state.status === 'empty') {
    renderStatusActions(roots.mobileActions, 'empty');
    renderEmptyState(roots.result, () => editStep(FLOW_STEP.PREFERENCES));
    return;
  }
  if (state.status === 'error') {
    renderStatusActions(roots.mobileActions, 'error');
    renderErrorState(roots.result, { onRetry: requestRecommendation, onReset: resetApplication });
    return;
  }
  if (state.status === 'success' && state.result?.viewModel) {
    renderMealPlan(state.result.viewModel);
    return;
  }
  renderEditingState();
}

function renderApplication() {
  renderInputs();
  renderResult();
}

function visibleCandidateIds(viewModel) {
  return [...new Set([
    viewModel.primary?.id,
    ...viewModel.alternatives.map(({ id }) => id),
    ...viewModel.bundleItems.map(({ card }) => card?.id),
    ...viewModel.assignments.map(({ card }) => card?.id)
  ].filter(Boolean))];
}

function addExcludedCandidates(ids) {
  excludedCandidateIds = [...new Set([...excludedCandidateIds, ...ids])];
}

function storageInput(context, recentHistory) {
  return {
    partySize: context.partySize,
    totalBudgetCents: context.totalBudgetCents,
    maxDistanceMeters: context.maxDistanceMeters,
    maxDeliveryMinutes: context.maxDeliveryMinutes,
    tastePreferences: context.tastePreferences,
    currentPriority: context.currentPriority,
    recentHistory,
    contextTags: context.contextTags,
    location: context.location
  };
}

function persistSafePreferences(context, ids) {
  const recentHistory = [...new Set([...ids, ...context.recentHistory])].slice(0, 20);
  storage.save(storageInput(context, recentHistory));
}

function planFromCandidates(context, response) {
  const plan = composeMealPlan(context, response.candidates, {
    now: new Date(),
    excludedCandidateIds
  });
  const viewModel = createMealPlanViewModel({
    plan,
    mode: response.mode,
    notices: response.notices
  });
  return { plan, viewModel, ids: visibleCandidateIds(viewModel) };
}

async function requestRecommendation() {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  dispatch({ type: 'request_started' });
  roots.reset.hidden = false;
  const slowMessage = globalThis.setTimeout(() => {
    const copy = roots.result.querySelector('[data-state="loading"] p');
    if (copy) copy.textContent = '候选较多，仍在检查安全条件和推荐理由。';
  }, 800);

  try {
    const context = createContextInputFromFlow(state);
    const response = await provider.getCandidates(context, { signal: request.signal });
    if (request.signal.aborted) return;
    providerResponse = response;
    updateMode(response.mode);
    renderModeNotice(roots.notice, { value: response.mode, notices: response.notices });

    const emptyProvider = response.candidates.length === 0
      && response.notices?.some(({ code }) => code === 'INSPIRATION_PROVIDER_UNAVAILABLE');
    if (emptyProvider) {
      dispatch({ type: 'request_failed' });
      return;
    }

    const composed = planFromCandidates(context, response);
    if (composed.ids.length === 0) {
      dispatch({ type: 'request_empty' });
      return;
    }

    addExcludedCandidates(composed.ids);
    persistSafePreferences(context, composed.ids);
    dispatch({
      type: 'request_succeeded',
      result: { plan: composed.plan, viewModel: composed.viewModel }
    });
  } catch (error) {
    if (error?.name === 'AbortError') return;
    dispatch({ type: 'request_failed' });
  } finally {
    if (activeRequest === request) activeRequest = null;
    globalThis.clearTimeout(slowMessage);
  }
}

function swapRecommendation() {
  if (!providerResponse) {
    showToast(roots.toast, '暂时没有更多安全候选');
    return;
  }

  try {
    const context = createContextInputFromFlow(state);
    const composed = planFromCandidates(context, providerResponse);
    if (composed.ids.length === 0) {
      showToast(roots.toast, '暂时没有更多安全候选');
      return;
    }
    addExcludedCandidates(composed.ids);
    persistSafePreferences(context, composed.ids);
    dispatch({
      type: 'request_succeeded',
      result: { plan: composed.plan, viewModel: composed.viewModel }
    });
  } catch {
    showToast(roots.toast, '暂时没有更多安全候选');
  }
}

async function copyDishName(name) {
  try {
    await navigator.clipboard.writeText(name);
    showToast(roots.toast, `已复制“${name}”`);
  } catch {
    dialog.open({
      title: '复制菜名',
      bodyHtml: `<p>浏览器没有允许自动复制。请手动复制：<strong>${escapeHtml(name)}</strong></p>`
    });
  }
}

function handlePrimaryAction(primary) {
  if (primary.action.kind === 'order' && primary.action.url) {
    window.open(primary.action.url, '_blank', 'noopener,noreferrer');
    return;
  }
  copyDishName(primary.name);
}

function handleFeedback(value, box) {
  if (value === 'yes') {
    box.innerHTML = '<p role="status">已记下：这个方向合适。本次反馈不会上传。</p>';
    return;
  }
  swapRecommendation();
  showToast(roots.toast, '已换一个方向，本次反馈不会上传');
}

function editStep(step) {
  dispatch({ type: 'edit_step', step });
  document.querySelector('.decision-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetApplication() {
  resetRecommendationSession();
  storage.clear();
  state = createFlowState();
  roots.reset.hidden = true;
  roots.notice.className = 'mode-notice';
  roots.notice.innerHTML = '<span class="notice-icon" aria-hidden="true">i</span><p><strong>当前是菜品灵感</strong><span>不含实时商家、价格、距离或配送时间。</span></p>';
  updateMode('inspiration');
  renderApplication();
  showToast(roots.toast, '已重置本次选择');
}

roots.reset.addEventListener('click', resetApplication);
roots.dataInfo.addEventListener('click', () => dialog.open({
  title: '数据与隐私说明',
  trigger: roots.dataInfo,
  bodyHtml: `<p>当前版本只使用仓库内的 175 条静态菜品作为灵感，不代表附近真实可下单的商家。</p>
    <ul><li>不展示实时价格、距离、ETA、营业或库存。</li><li>现在会先确认人数和场景，不会由“马上推荐”跳过多人安全条件。</li><li>不请求或保存精确位置。</li><li>忌口原文只在本次页面中使用，刷新后不会恢复。</li><li>非敏感口味、人数和近期选择可保存在浏览器本地。</li></ul>
    <p>接入经确认的实时 Provider 后，界面才会展示由数据源实际提供的字段。</p>`
}));

if (PROVIDER_CONFIG.endpoint) {
  console.info('Live provider endpoint is configured but remains gated until the live UI obtains explicit location consent.');
}

renderApplication();
if (loadedPreferences.ok && loadedPreferences.value) {
  globalThis.setTimeout(() => showToast(roots.toast, '已恢复上次保存的非敏感偏好'), 0);
}

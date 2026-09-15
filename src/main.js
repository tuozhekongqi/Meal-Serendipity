import { PROVIDER_CONFIG } from './config.js';
import { MEAL_SCENE } from './domain/scenarios.js';
import { FallbackCandidateProvider } from './providers/candidate-provider.js';
import { InspirationCandidateProvider } from './providers/inspiration-provider.js';
import {
  composeMealPlan,
  mealPlanCandidateIds,
  promoteMealPlanAlternative
} from './recommendation/meal-plan.js';
import { createPreferenceStorage } from './services/storage.js';
import { clearLegacySensitiveStorage } from './services/legacy-storage.js';
import {
  FLOW_STEP,
  createContextInputFromFlow,
  createFlowState,
  transitionFlow
} from './presentation/flow-state.js';
import { createMealPlanViewModel } from './presentation/meal-plan-view-model.js';
import {
  commitIfCurrentRequest,
  requestIsCurrent
} from './presentation/request-lifecycle.js';
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

const SCENE_THEME = Object.freeze({
  [MEAL_SCENE.SOLO_QUICK]: 'quick',
  [MEAL_SCENE.SOLO_SAVE]: 'quick',
  [MEAL_SCENE.SOLO_FOCUS]: 'focus',
  [MEAL_SCENE.SOLO_LIGHTER]: 'lighter',
  [MEAL_SCENE.SOLO_TREAT]: 'celebration',
  [MEAL_SCENE.SOLO_LATE_NIGHT]: 'late-night',
  [MEAL_SCENE.GROUP_GATHERING]: 'gathering',
  [MEAL_SCENE.GROUP_INDIVIDUAL]: 'gathering',
  [MEAL_SCENE.GROUP_MIXED_TASTE]: 'gathering',
  [MEAL_SCENE.GROUP_FAMILY]: 'gathering',
  [MEAL_SCENE.GROUP_CELEBRATION]: 'celebration'
});

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
const FOCUS_STEP_EVENTS = new Set(['back', 'next', 'edit_step']);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function updateMode(mode) {
  roots.mode.dataset.mode = mode;
  roots.mode.lastChild.textContent = mode === 'live' ? '实时推荐' : '菜品参考';
}

function resetRecommendationSession() {
  activeRequest?.abort();
  activeRequest = null;
  providerResponse = null;
  excludedCandidateIds = [];
}

function activeInputControlId() {
  const active = document.activeElement;
  return active instanceof HTMLElement && roots.input.contains(active) && active.id
    ? active.id
    : null;
}

function restoreInputControlFocus(controlId) {
  if (!controlId) return;
  document.getElementById(controlId)?.focus({ preventScroll: true });
}

function dispatch(event, { render = true } = {}) {
  const controlId = render && CONDITION_EVENTS.has(event.type)
    ? activeInputControlId()
    : null;
  state = transitionFlow(state, event);

  if (CONDITION_EVENTS.has(event.type) || event.type === 'edit_step') {
    resetRecommendationSession();
    roots.reset.hidden = false;
  }

  if (render) {
    renderApplication();
    if (FOCUS_STEP_EVENTS.has(event.type)) {
      focusCurrentStep();
    } else {
      restoreInputControlFocus(controlId);
    }
  }
}

function focusCurrentStep() {
  roots.input.querySelector('[data-step-heading]')?.focus({ preventScroll: true });
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
    <h3>完成选择后查看推荐</h3><p>推荐结果将在这里显示。</p>
  </div>`;
}

function mobileResultActions(viewModel) {
  const primaryAction = viewModel.primary?.action?.label
    ? `<button type="button" class="button button-primary" data-mobile-result="primary">${escapeHtml(viewModel.primary.action.label)}</button>`
    : '';
  roots.mobileActions.innerHTML = `${primaryAction}<button type="button" class="button button-secondary" data-mobile-result="swap">换一个</button><button type="button" class="button button-secondary" data-mobile-result="back">修改条件</button>`;
  roots.mobileActions.querySelector('[data-mobile-result="primary"]')?.addEventListener('click', () => handlePrimaryAction(viewModel.primary));
  roots.mobileActions.querySelector('[data-mobile-result="swap"]')?.addEventListener('click', swapRecommendation);
  roots.mobileActions.querySelector('[data-mobile-result="back"]')?.addEventListener('click', () => editStep(FLOW_STEP.PREFERENCES));
}

function renderMealPlan(viewModel, { focus = true } = {}) {
  updateMode(viewModel.mode.value);
  renderModeNotice(roots.notice, viewModel.mode);

  const card = renderRecommendation(roots.result, viewModel, {
    onSwap: swapRecommendation,
    onBack: () => editStep(FLOW_STEP.PREFERENCES),
    onAlternative: selectAlternative,
    onPrimaryAction: handlePrimaryAction
  });
  renderFeedback(card, handleFeedback);
  mobileResultActions(viewModel);

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
    renderLoadingState(roots.result, () => editStep(FLOW_STEP.PREFERENCES));
    renderStatusActions(roots.mobileActions, 'loading');
    return;
  }
  if (state.status === 'empty') {
    renderStatusActions(roots.mobileActions, 'empty');
    renderEmptyState(roots.result, {
      onEdit: () => editStep(FLOW_STEP.PREFERENCES),
      onBack: () => dispatch({ type: 'back' })
    });
    return;
  }
  if (state.status === 'error') {
    renderStatusActions(roots.mobileActions, 'error');
    renderErrorState(roots.result, {
      onRetry: requestRecommendation,
      onBack: () => editStep(FLOW_STEP.PREFERENCES)
    });
    return;
  }
  if (state.status === 'success' && state.result?.viewModel) {
    renderMealPlan(state.result.viewModel);
    return;
  }
  renderEditingState();
}

function renderApplication() {
  document.documentElement.dataset.theme = SCENE_THEME[state.mealScene] ?? 'quick';
  renderInputs();
  renderResult();
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
    tastePreferences: context.partySize === 1 ? context.tastePreferences : [],
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
  return { plan, viewModel, ids: mealPlanCandidateIds(plan) };
}

function selectAlternative(planId) {
  const currentPlan = state.result?.plan;
  const currentViewModel = state.result?.viewModel;
  if (!currentPlan || !currentViewModel) return;

  const plan = promoteMealPlanAlternative(currentPlan, planId);
  if (plan === currentPlan) {
    showToast(roots.toast, '这个备选方案已不可用');
    return;
  }

  const viewModel = createMealPlanViewModel({
    plan,
    mode: currentViewModel.mode.value,
    notices: currentViewModel.mode.notices
  });
  dispatch({
    type: 'request_succeeded',
    result: { plan, viewModel }
  });
}

async function requestRecommendation() {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  dispatch({ type: 'request_started' });
  roots.reset.hidden = false;
  const slowMessage = globalThis.setTimeout(() => {
    const copy = roots.result.querySelector('[data-state="loading"] p');
    if (copy) copy.textContent = '菜品较多，仍在核对忌口条件和推荐依据。';
  }, 800);

  try {
    const context = createContextInputFromFlow(state);
    const response = await provider.getCandidates(context, { signal: request.signal });
    if (!requestIsCurrent(request, activeRequest)) return;
    providerResponse = response;
    updateMode(response.mode);
    renderModeNotice(roots.notice, { value: response.mode, notices: response.notices });

    const emptyProvider = response.candidates.length === 0
      && response.notices?.some(({ code }) => code === 'INSPIRATION_PROVIDER_UNAVAILABLE');
    if (emptyProvider) {
      commitIfCurrentRequest(request, activeRequest, () => dispatch({ type: 'request_failed' }));
      return;
    }

    const composed = planFromCandidates(context, response);
    if (composed.ids.length === 0) {
      commitIfCurrentRequest(request, activeRequest, () => dispatch({ type: 'request_empty' }));
      return;
    }

    commitIfCurrentRequest(request, activeRequest, () => {
      addExcludedCandidates(composed.ids);
      persistSafePreferences(context, composed.ids);
      dispatch({
        type: 'request_succeeded',
        result: { plan: composed.plan, viewModel: composed.viewModel }
      });
    });
  } catch (error) {
    commitIfCurrentRequest(request, activeRequest, () => dispatch({ type: 'request_failed' }));
  } finally {
    if (activeRequest === request) activeRequest = null;
    globalThis.clearTimeout(slowMessage);
  }
}

function swapRecommendation() {
  if (!providerResponse) {
    showToast(roots.toast, '暂时没有更多符合条件的菜品');
    return;
  }

  try {
    const context = createContextInputFromFlow(state);
    const composed = planFromCandidates(context, providerResponse);
    if (composed.ids.length === 0) {
      showToast(roots.toast, '暂时没有更多符合条件的菜品');
      return;
    }
    addExcludedCandidates(composed.ids);
    persistSafePreferences(context, composed.ids);
    dispatch({
      type: 'request_succeeded',
      result: { plan: composed.plan, viewModel: composed.viewModel }
    });
  } catch {
    showToast(roots.toast, '暂时没有更多符合条件的菜品');
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
  if (!primary?.action) return;
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
  showToast(roots.toast, '已更换推荐，本次反馈不会上传');
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
  roots.notice.innerHTML = '<span class="notice-icon" aria-hidden="true">i</span><p><strong>菜品参考</strong><span>来自项目内置清单，实际配料请在用餐前确认。</span></p>';
  updateMode('inspiration');
  renderApplication();
  showToast(roots.toast, '已重新开始选择');
}

roots.reset.addEventListener('click', resetApplication);
roots.dataInfo.addEventListener('click', () => dialog.open({
  title: '数据与隐私',
  trigger: roots.dataInfo,
  bodyHtml: `<p>当前推荐依据项目内置菜品清单，不读取附近商家或实时订单信息。</p>
    <ul><li>不展示实时价格、距离、配送时间、营业或库存。</li><li>不请求或保存精确位置。</li><li>本次忌口在页面刷新后清除。</li><li>多人偏好只用于本次推荐，不会保存或上传。</li><li>单人口味、人数和近期选择可以保存在本机浏览器中，便于下次继续。</li></ul>`
}));

if (PROVIDER_CONFIG.endpoint) {
  console.info('Live provider endpoint is configured but remains gated until the live UI obtains explicit location consent.');
}

renderApplication();
if (loadedPreferences.ok && loadedPreferences.value) {
  globalThis.setTimeout(() => showToast(roots.toast, '已恢复上次保存的用餐偏好'), 0);
}

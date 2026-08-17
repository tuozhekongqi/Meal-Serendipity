import { PROVIDER_CONFIG } from './config.js';
import { FallbackCandidateProvider } from './providers/candidate-provider.js';
import { InspirationCandidateProvider } from './providers/inspiration-provider.js';
import { recommend } from './recommendation/recommend.js';
import { createUserContext } from './services/context.js';
import { createPreferenceStorage } from './services/storage.js';
import { clearLegacySensitiveStorage } from './services/legacy-storage.js';
import { createRecommendationViewModel } from './presentation/recommendation-view-model.js';
import { renderInputFlow, SCENES } from './components/inputs.js';
import { createDialogController } from './components/dialog.js';
import {
  renderEmptyState,
  renderErrorState,
  renderFeedback,
  renderInitialState,
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
const restored = storage.load();
const dialog = createDialogController(roots.dialog);
const provider = new FallbackCandidateProvider({
  liveProvider: null,
  inspirationProvider: new InspirationCandidateProvider()
});

const SCENE_DEFAULT_TASTES = Object.freeze({
  balanced: [],
  comfort: ['浓郁', '咸鲜'],
  lighter: ['清淡'],
  novelty: []
});

const validScenes = new Set(SCENES.map(({ value }) => value));
const restoredPreferences = restored.ok ? restored.value : null;
let state = {
  step: 1,
  scene: validScenes.has(restoredPreferences?.currentPriority) ? restoredPreferences.currentPriority : 'balanced',
  tastes: restoredPreferences?.tastePreferences ?? [],
  exclusions: '',
  partySize: restoredPreferences?.partySize ?? 1,
  recentHistory: restoredPreferences?.recentHistory ?? [],
  status: 'initial',
  providerResponse: null,
  recommendations: [],
  currentIndex: 0,
  abortController: null
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function parseExclusions(value) {
  return [...new Set(String(value ?? '').split(/[，,、;；\s]+/).map((part) => part.trim()).filter(Boolean))].slice(0, 30);
}

function contextForState() {
  const inferredTastes = state.tastes.length ? state.tastes : SCENE_DEFAULT_TASTES[state.scene];
  return createUserContext({
    locale: 'zh-CN',
    partySize: state.partySize,
    tastePreferences: inferredTastes,
    exclusions: parseExclusions(state.exclusions),
    currentPriority: state.scene,
    recentHistory: state.recentHistory,
    contextTags: []
  });
}

function renderInputs() {
  renderInputFlow({
    root: roots.input,
    desktopActions: roots.desktopActions,
    mobileActions: roots.mobileActions,
    state,
    onChange(patch, options = {}) {
      state = { ...state, ...patch };
      if (options.render !== false) renderInputs();
    },
    onAction: handleFlowAction
  });
}

function handleFlowAction(action) {
  if (action === 'precise') {
    state = { ...state, step: 2 };
    renderInputs();
    roots.input.querySelector('legend')?.focus?.();
    return;
  }
  if (action === 'back') {
    state = { ...state, step: Math.max(1, state.step - 1) };
    renderInputs();
    return;
  }
  if (action === 'next' || action === 'skip') {
    state = { ...state, step: 3 };
    renderInputs();
    return;
  }
  if (action === 'recommend') requestRecommendation();
}

function recommendationSetFor(index) {
  const primary = state.recommendations[index];
  const alternatives = state.recommendations.filter((_, candidateIndex) => candidateIndex !== index).slice(0, 2);
  return { primary, alternatives };
}

function updateMode(mode) {
  roots.mode.dataset.mode = mode;
  roots.mode.lastChild.textContent = mode === 'live' ? '实时推荐' : '菜品灵感';
}

function renderCurrentRecommendation({ focus = true } = {}) {
  const current = recommendationSetFor(state.currentIndex);
  if (!current.primary) {
    renderStatusActions(roots.mobileActions, 'empty');
    renderEmptyState(roots.result, editConditions);
    return;
  }
  const viewModel = createRecommendationViewModel({
    recommendation: current.primary,
    alternatives: current.alternatives,
    mode: state.providerResponse.mode,
    notices: state.providerResponse.notices
  });
  updateMode(viewModel.mode.value);
  renderModeNotice(roots.notice, viewModel.mode);
  const card = renderRecommendation(roots.result, viewModel, {
    onSwap: swapRecommendation,
    onAlternative: selectAlternative,
    onPrimaryAction: handlePrimaryAction
  });
  roots.mobileActions.innerHTML = `<button type="button" class="button button-primary" data-mobile-result="primary">${viewModel.primary.action.label}</button><button type="button" class="button button-secondary" data-mobile-result="swap">换一个</button>`;
  roots.mobileActions.querySelector('[data-mobile-result="primary"]').addEventListener('click', () => handlePrimaryAction(viewModel.primary));
  roots.mobileActions.querySelector('[data-mobile-result="swap"]').addEventListener('click', swapRecommendation);
  renderFeedback(card, handleFeedback);
  if (focus) {
    roots.result.querySelector('#recommendation-title')?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 47.99rem)').matches) roots.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function requestRecommendation() {
  state.abortController?.abort();
  const abortController = new AbortController();
  state = { ...state, status: 'loading', abortController };
  roots.reset.hidden = false;
  renderLoadingState(roots.result);
  renderStatusActions(roots.mobileActions, 'loading');
  const slowMessage = globalThis.setTimeout(() => {
    const copy = roots.result.querySelector('[data-state="loading"] p');
    if (copy) copy.textContent = '候选较多，仍在检查安全条件和推荐理由。';
  }, 800);

  try {
    const context = contextForState();
    const response = await provider.getCandidates(context, { signal: abortController.signal });
    if (abortController.signal.aborted) return;
    const result = recommend(context, response.candidates, { now: new Date(), alternativeLimit: 12 });
    state = {
      ...state,
      status: result.primary ? 'success' : 'empty',
      providerResponse: response,
      recommendations: result.primary ? [result.primary, ...result.alternatives] : [],
      currentIndex: 0,
      abortController: null
    };
    updateMode(response.mode);
    const emptyProvider = response.candidates.length === 0 && response.notices?.some(({ code }) => code === 'INSPIRATION_PROVIDER_UNAVAILABLE');
    if (emptyProvider) {
      renderStatusActions(roots.mobileActions, 'error');
      renderModeNotice(roots.notice, { value: response.mode, notices: response.notices });
      renderErrorState(roots.result, { onRetry: requestRecommendation, onReset: resetApplication });
      return;
    }
    if (!result.primary) {
      renderStatusActions(roots.mobileActions, 'empty');
      renderModeNotice(roots.notice, { value: response.mode, notices: response.notices });
      renderEmptyState(roots.result, editConditions);
      return;
    }
    const currentId = result.primary.candidate.id;
    const recentHistory = [currentId, ...state.recentHistory.filter((id) => id !== currentId)].slice(0, 20);
    state = { ...state, recentHistory };
    storage.save({
      ...context,
      exclusions: [],
      tastePreferences: state.tastes,
      recentHistory
    });
    renderCurrentRecommendation();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    state = { ...state, status: 'error', abortController: null };
    renderStatusActions(roots.mobileActions, 'error');
    renderErrorState(roots.result, { onRetry: requestRecommendation, onReset: resetApplication });
  } finally {
    globalThis.clearTimeout(slowMessage);
  }
}

function swapRecommendation() {
  if (state.recommendations.length < 2) {
    showToast(roots.toast, '暂时没有更多安全候选');
    return;
  }
  state = { ...state, currentIndex: (state.currentIndex + 1) % state.recommendations.length };
  renderCurrentRecommendation();
}

function selectAlternative(id) {
  const index = state.recommendations.findIndex(({ candidate }) => candidate.id === id);
  if (index < 0) return;
  state = { ...state, currentIndex: index };
  renderCurrentRecommendation();
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

function editConditions() {
  state = { ...state, step: 2, status: 'initial' };
  renderInputs();
  document.querySelector('.decision-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetApplication() {
  state.abortController?.abort();
  storage.clear();
  state = {
    step: 1, scene: 'balanced', tastes: [], exclusions: '', partySize: 1, recentHistory: [],
    status: 'initial', providerResponse: null, recommendations: [], currentIndex: 0, abortController: null
  };
  roots.reset.hidden = true;
  roots.notice.className = 'mode-notice';
  roots.notice.innerHTML = '<span class="notice-icon" aria-hidden="true">i</span><p><strong>当前是菜品灵感</strong><span>不含实时商家、价格、距离或配送时间。</span></p>';
  updateMode('inspiration');
  renderInputs();
  renderInitialState(roots.result);
  showToast(roots.toast, '已重置本次选择');
}

roots.reset.addEventListener('click', resetApplication);
roots.dataInfo.addEventListener('click', () => dialog.open({
  title: '数据与隐私说明',
  trigger: roots.dataInfo,
  bodyHtml: `<p>当前版本只使用仓库内的 175 条静态菜品作为灵感，不代表附近真实可下单的商家。</p>
    <ul><li>不展示实时价格、距离、ETA、营业或库存。</li><li>不请求或保存精确位置。</li><li>忌口原文只在本次页面中使用，刷新后不会恢复。</li><li>非敏感口味、人数和近期选择可保存在浏览器本地。</li></ul>
    <p>接入经确认的实时 Provider 后，界面才会展示由数据源实际提供的字段。</p>`
}));

if (PROVIDER_CONFIG.endpoint) {
  console.info('Live provider endpoint is configured but remains gated until the live UI obtains explicit location consent.');
}

renderInputs();
renderInitialState(roots.result);
if (restoredPreferences) globalThis.setTimeout(() => showToast(roots.toast, '已恢复上次保存的非敏感偏好'), 0);

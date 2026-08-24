import {
  INSPIRATION_BUDGET_TIER,
  PARTY_SIZE_BUCKET,
  getDiningModesForScene,
  getScenesForPartySize
} from '../domain/scenarios.js';
import { FLOW_STEP, getVisibleSteps } from '../presentation/flow-state.js';

export const TASTES = Object.freeze(['辣', '咸鲜', '清淡', '酸', '甜', '浓郁']);

const PARTY_OPTIONS = Object.freeze([
  { value: 1, bucket: PARTY_SIZE_BUCKET.ONE, label: '1 人' },
  { value: 2, bucket: PARTY_SIZE_BUCKET.TWO, label: '2 人' },
  { value: 3, bucket: PARTY_SIZE_BUCKET.THREE, label: '3 人' },
  { value: 4, bucket: PARTY_SIZE_BUCKET.FOUR_PLUS, label: '4 人以上' }
]);

const BUDGET_OPTIONS = Object.freeze([
  { value: INSPIRATION_BUDGET_TIER.ECONOMY, label: '尽量省一些' },
  { value: INSPIRATION_BUDGET_TIER.EVERYDAY, label: '日常预算' },
  { value: INSPIRATION_BUDGET_TIER.GENEROUS, label: '吃得丰盛' },
  { value: INSPIRATION_BUDGET_TIER.OPEN, label: '预算灵活' }
]);

const STEP_LABELS = Object.freeze({
  [FLOW_STEP.PARTY]: '人数',
  [FLOW_STEP.SCENE]: '场景',
  [FLOW_STEP.DINING]: '方式',
  [FLOW_STEP.PREFERENCES]: '偏好'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function parseList(value) {
  return [...new Set(String(value ?? '')
    .split(/[，,、;；\s]+/)
    .map((part) => part.trim())
    .filter(Boolean))]
    .slice(0, 30);
}

function progress(state) {
  const steps = getVisibleSteps(state);
  const currentIndex = state.step === FLOW_STEP.RESULT ? steps.length : steps.indexOf(state.step);
  return `<div class="progress-block">
    <div class="progress-copy"><span>当前进度</span><span>${Math.min(currentIndex + 1, steps.length)} / ${steps.length}</span></div>
    <ol class="progress-list" aria-label="推荐流程进度">
      ${steps.map((step, index) => `<li${step === state.step ? ' aria-current="step"' : ''} data-progress-state="${index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'}">${STEP_LABELS[step]}</li>`).join('')}
    </ol>
  </div>`;
}

function requiredLabel() {
  return '<span class="required-label">必填</span>';
}

function partyStep(state) {
  return `${progress(state)}<fieldset class="field-group">
    <legend data-step-heading tabindex="-1">用餐人数 ${requiredLabel()}</legend>
    <p class="field-help">先确定几个人，后面只会展示兼容的场景。</p>
    <div class="chip-list">
      ${PARTY_OPTIONS.map(({ value, bucket, label }) => `<label class="choice-option" for="party-${bucket}">
        <input id="party-${bucket}" name="partySize" type="radio" value="${value}" data-party-bucket="${bucket}" ${state.partySizeBucket === bucket ? 'checked' : ''}>
        <span>${label}</span>
      </label>`).join('')}
    </div>
    ${state.partySizeBucket === PARTY_SIZE_BUCKET.FOUR_PLUS ? `<div class="field">
      <label for="exact-party-size">准确用餐人数</label>
      <input id="exact-party-size" name="exactPartySize" type="number" min="4" max="50" step="1" required value="${state.partySize}" aria-describedby="exact-party-size-help">
      <small id="exact-party-size-help">请输入 4 至 50 人的准确人数。</small>
    </div>` : ''}
  </fieldset>`;
}

function sceneStep(state) {
  const scenes = getScenesForPartySize(state.partySize);
  return `${progress(state)}<fieldset class="field-group">
    <legend data-step-heading tabindex="-1">选择用餐场景 ${requiredLabel()}</legend>
    <p class="field-help">场景选项会根据用餐人数调整。</p>
    <div class="scene-grid">
      ${scenes.map((scene, index) => `<label class="scene-card" for="scene-${scene.value}">
        <input id="scene-${scene.value}" name="mealScene" type="radio" value="${scene.value}" aria-label="${escapeHtml(scene.label)}" ${state.mealScene === scene.value ? 'checked' : ''}>
        <span class="scene-icon" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(scene.label)}</strong>
      </label>`).join('')}
    </div>
  </fieldset>`;
}

function diningStep(state) {
  const modes = getDiningModesForScene(state.mealScene);
  return `${progress(state)}<fieldset class="field-group">
    <legend data-step-heading tabindex="-1">选择用餐方式 ${requiredLabel()}</legend>
    <p class="field-help">多人用餐需要先选一种组合方式，安全避忌不会因此放宽。</p>
    <div class="scene-grid">
      ${modes.map((mode) => `<label class="scene-card" for="dining-${mode.value}">
        <input id="dining-${mode.value}" name="diningMode" type="radio" value="${mode.value}" aria-label="${escapeHtml(mode.label)}" ${state.diningMode === mode.value ? 'checked' : ''}>
        <strong>${escapeHtml(mode.label)}</strong>
      </label>`).join('')}
    </div>
  </fieldset>`;
}

function tastesFor(state, draft) {
  return state.partySize === 1 ? state.tastePreferences : draft.tastePreferences;
}

function exclusionsFor(state, draft) {
  return state.partySize === 1 ? state.exclusions : draft.exclusions;
}

function dinerRegion(state, draft, index) {
  const tastes = tastesFor(state, draft);
  const exclusions = exclusionsFor(state, draft);
  return `<fieldset class="field-group diner-preferences" data-diner-region data-diner-id="${draft.id}">
    <legend>第 ${index + 1} 位食客偏好</legend>
    <p class="field-help">匿名记录；口味最多选 3 个，避忌只用于本次推荐。</p>
    <div class="chip-list" aria-label="第 ${index + 1} 位食客口味">
      ${TASTES.map((taste) => `<button class="choice-chip" type="button" data-diner-taste="${escapeHtml(taste)}" data-diner-id="${draft.id}" aria-pressed="${tastes.includes(taste)}">${escapeHtml(taste)}</button>`).join('')}
    </div>
    <div class="field">
      <label for="${draft.id}-exclusions">需要避开的食材 <span class="optional-label">选填</span></label>
      <input id="${draft.id}-exclusions" name="${draft.id}-exclusions" type="text" value="${escapeHtml(exclusions.join('、'))}" placeholder="例如：花生、香菜" autocomplete="off" maxlength="240" data-diner-exclusions="${draft.id}">
    </div>
  </fieldset>`;
}

function preferencesStep(state) {
  return `${progress(state)}
    <fieldset class="field-group">
      <legend data-step-heading tabindex="-1">选择预算档位 ${requiredLabel()}</legend>
      <p class="field-help">灵感模式仅用相对预算档排序，不代表实时价格。</p>
      <div class="chip-list">
        ${BUDGET_OPTIONS.map(({ value, label }) => `<label class="choice-option" for="budget-${value}">
          <input id="budget-${value}" name="inspirationBudgetTier" type="radio" value="${value}" ${state.inspirationBudgetTier === value ? 'checked' : ''}>
          <span>${label}</span>
        </label>`).join('')}
      </div>
    </fieldset>
    ${state.dinerDrafts.map((draft, index) => dinerRegion(state, draft, index)).join('')}
    <p class="privacy-note"><span>不会保存食客称呼或忌口原文；严重过敏请同时向商家确认。</span></p>`;
}

function resultStep(state) {
  return `${progress(state)}<div class="field-group"><h3 data-step-heading tabindex="-1">条件已确认</h3><p class="field-help">可以在结果中换一个，或返回修改任一步。</p></div>`;
}

function stepMarkup(state) {
  if (state.step === FLOW_STEP.PARTY) return partyStep(state);
  if (state.step === FLOW_STEP.SCENE) return sceneStep(state);
  if (state.step === FLOW_STEP.DINING) return diningStep(state);
  if (state.step === FLOW_STEP.PREFERENCES) return preferencesStep(state);
  return resultStep(state);
}

function stepIsValid(state) {
  if (state.step === FLOW_STEP.PARTY) {
    return Number.isInteger(state.partySize) && state.partySize >= 1 && state.partySize <= 50;
  }
  if (state.step === FLOW_STEP.SCENE) {
    return getScenesForPartySize(state.partySize).some(({ value }) => value === state.mealScene);
  }
  if (state.step === FLOW_STEP.DINING) {
    return getDiningModesForScene(state.mealScene).some(({ value }) => value === state.diningMode);
  }
  if (state.step === FLOW_STEP.PREFERENCES) return Boolean(state.inspirationBudgetTier);
  return false;
}

function actionsFor(state) {
  if (state.step === FLOW_STEP.PARTY) {
    return [{ action: 'next', label: '下一步', className: 'button-primary', disabled: !stepIsValid(state) }];
  }
  if ([FLOW_STEP.SCENE, FLOW_STEP.DINING].includes(state.step)) {
    return [
      { action: 'back', label: '返回', className: 'button-secondary' },
      { action: 'next', label: '下一步', className: 'button-primary', disabled: !stepIsValid(state) }
    ];
  }
  if (state.step === FLOW_STEP.PREFERENCES) {
    return [
      { action: 'back', label: '返回', className: 'button-secondary' },
      { action: 'recommend', label: '生成推荐', className: 'button-primary', disabled: !stepIsValid(state) }
    ];
  }
  return [];
}

function renderActions(root, state) {
  root.innerHTML = actionsFor(state).map(({ action, label, className, disabled }) => (
    `<button type="button" class="button ${className}" data-flow-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`
  )).join('');
}

export function renderInputFlow({ root, desktopActions, mobileActions, state, onEvent, onAction }) {
  root.innerHTML = stepMarkup(state);
  renderActions(desktopActions, state);
  renderActions(mobileActions, state);

  root.querySelectorAll('[data-party-bucket]').forEach((input) => input.addEventListener('change', () => {
    const partySize = input.dataset.partyBucket === PARTY_SIZE_BUCKET.FOUR_PLUS
      ? Math.max(4, state.partySize)
      : Number(input.value);
    onEvent({ type: 'select_party_size', partySize });
  }));
  root.querySelector('#exact-party-size')?.addEventListener('input', (event) => {
    const partySize = Number(event.target.value);
    const valid = Number.isInteger(partySize) && partySize >= 4 && partySize <= 50;
    onEvent({ type: 'select_party_size', partySize }, { render: false });
    [desktopActions, mobileActions].forEach((container) => {
      const next = container.querySelector('[data-flow-action="next"]');
      if (next) next.disabled = !valid;
    });
  });
  root.querySelectorAll('[name="mealScene"]').forEach((input) => input.addEventListener('change', () => {
    onEvent({ type: 'select_scene', mealScene: input.value });
  }));
  root.querySelectorAll('[name="diningMode"]').forEach((input) => input.addEventListener('change', () => {
    onEvent({ type: 'select_dining_mode', diningMode: input.value });
  }));
  root.querySelectorAll('[name="inspirationBudgetTier"]').forEach((input) => input.addEventListener('change', () => {
    onEvent({ type: 'set_budget', value: input.value });
  }));
  root.querySelectorAll('[data-diner-taste]').forEach((button) => button.addEventListener('click', () => {
    const draft = state.dinerDrafts.find(({ id }) => id === button.dataset.dinerId);
    if (!draft) return;
    const current = tastesFor(state, draft);
    const taste = button.dataset.dinerTaste;
    const tastePreferences = current.includes(taste)
      ? current.filter((value) => value !== taste)
      : [...current, taste].slice(0, 3);
    onEvent({ type: 'update_diner_draft', dinerId: draft.id, tastePreferences });
  }));
  root.querySelectorAll('[data-diner-exclusions]').forEach((input) => input.addEventListener('input', () => {
    onEvent({
      type: 'update_diner_draft',
      dinerId: input.dataset.dinerExclusions,
      exclusions: parseList(input.value)
    }, { render: false });
  }));
  [desktopActions, mobileActions].forEach((container) => {
    container.querySelectorAll('[data-flow-action]').forEach((button) => {
      button.addEventListener('click', () => onAction(button.dataset.flowAction));
    });
  });
}

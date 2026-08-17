export const SCENES = Object.freeze([
  { value: 'balanced', icon: '01', label: '省心稳妥', help: '熟悉、均衡，不想踩雷' },
  { value: 'comfort', icon: '02', label: '吃得满足', help: '浓郁、扎实，犒劳一下' },
  { value: 'lighter', icon: '03', label: '清淡舒服', help: '轻盈、温和，少点负担' },
  { value: 'novelty', icon: '04', label: '换点新鲜', help: '跳出最近常吃的方向' }
]);

export const TASTES = Object.freeze(['辣', '咸鲜', '清淡', '酸', '甜', '浓郁']);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function progress(step) {
  return `<div class="progress-block" aria-label="精准筛选进度">
    <div class="progress-copy"><span>精准筛选</span><span>第 ${step} 步，共 3 步</span></div>
    <div class="progress-track" aria-hidden="true"><span style="width:${step / 3 * 100}%"></span></div>
  </div>`;
}

function sceneStep(state) {
  return `<fieldset class="field-group">
    <legend>选一个当前状态 <span class="required-label">必填</span></legend>
    <p class="field-help">已为你预选“省心稳妥”，可以直接开始。</p>
    <div class="scene-grid">
      ${SCENES.map((scene) => `<button class="scene-card" type="button" data-scene="${scene.value}" aria-pressed="${state.scene === scene.value}">
        <span class="scene-icon" aria-hidden="true">${scene.icon}</span><strong>${scene.label}</strong><span>${scene.help}</span>
      </button>`).join('')}
    </div>
  </fieldset>`;
}

function preferencesStep(state) {
  return `${progress(2)}
    <fieldset class="field-group">
      <legend>偏好的口味 <span class="optional-label">选填</span></legend>
      <p class="field-help">最多选 3 个，越靠前越重要。</p>
      <div class="chip-list">
        ${TASTES.map((taste) => `<button class="choice-chip" type="button" data-taste="${taste}" aria-pressed="${state.tastes.includes(taste)}">${taste}</button>`).join('')}
      </div>
      <div class="field">
        <label for="exclusions">不吃或需要避开的食材 <span class="optional-label">选填</span></label>
        <input id="exclusions" name="exclusions" type="text" value="${escapeHtml(state.exclusions)}" placeholder="例如：花生、香菜、海鲜" autocomplete="off" maxlength="240" aria-describedby="exclusions-help">
        <small id="exclusions-help">仅用于这次推荐，不会保存原文。严重过敏请同时向商家确认。</small>
      </div>
      <div class="field">
        <label for="party-size">用餐人数 <span class="optional-label">选填</span></label>
        <select id="party-size" name="partySize">
          ${[1,2,3,4].map((size) => `<option value="${size}" ${state.partySize === size ? 'selected' : ''}>${size === 4 ? '4 人或更多' : `${size} 人`}</option>`).join('')}
        </select>
      </div>
    </fieldset>`;
}

function confirmationStep(state) {
  const scene = SCENES.find(({ value }) => value === state.scene)?.label ?? '省心稳妥';
  const tastes = state.tastes.length ? state.tastes.join('、') : '不限定';
  return `${progress(3)}
    <div class="field-group">
      <h3>确认这次的方向</h3>
      <p class="field-help">推荐会严格避开你填写的忌口，其余条件用于排序。</p>
      <div class="confirmation">
        <div class="summary-line"><span>当前状态</span><strong>${scene}</strong></div>
        <div class="summary-line"><span>口味</span><strong>${escapeHtml(tastes)}</strong></div>
        <div class="summary-line"><span>忌口</span><strong>${state.exclusions.trim() ? '已填写，仅本次使用' : '未填写'}</strong></div>
        <div class="summary-line"><span>人数</span><strong>${state.partySize === 4 ? '4 人或更多' : `${state.partySize} 人`}</strong></div>
      </div>
      <p class="privacy-note"><span>当前没有实时外卖数据，因此不会请求精确位置，也不会展示价格、距离或 ETA。</span></p>
    </div>`;
}

function actionsFor(state) {
  if (state.step === 1) return [
    { action: 'recommend', label: '马上推荐', className: 'button-primary' },
    { action: 'precise', label: '精准筛选', className: 'button-secondary' }
  ];
  if (state.step === 2) return [
    { action: 'back', label: '返回', className: 'button-secondary' },
    { action: 'next', label: '下一步', className: 'button-primary' },
    { action: 'skip', label: '跳过选填', className: 'inline-link' }
  ];
  return [
    { action: 'back', label: '返回', className: 'button-secondary' },
    { action: 'recommend', label: '生成推荐', className: 'button-primary' }
  ];
}

function renderActions(root, state) {
  root.innerHTML = actionsFor(state).map(({ action, label, className }) => (
    `<button type="button" class="${className === 'inline-link' ? className : `button ${className}`}" data-flow-action="${action}">${label}</button>`
  )).join('');
}

export function renderInputFlow({ root, desktopActions, mobileActions, state, onChange, onAction }) {
  root.innerHTML = state.step === 1 ? sceneStep(state) : state.step === 2 ? preferencesStep(state) : confirmationStep(state);
  renderActions(desktopActions, state);
  renderActions(mobileActions, state);

  root.querySelectorAll('[data-scene]').forEach((button) => button.addEventListener('click', () => {
    onChange({ scene: button.dataset.scene });
  }));
  root.querySelectorAll('[data-taste]').forEach((button) => button.addEventListener('click', () => {
    const taste = button.dataset.taste;
    const next = state.tastes.includes(taste)
      ? state.tastes.filter((value) => value !== taste)
      : [...state.tastes, taste].slice(0, 3);
    onChange({ tastes: next });
  }));
  root.querySelector('#exclusions')?.addEventListener('input', (event) => onChange({ exclusions: event.target.value }, { render: false }));
  root.querySelector('#party-size')?.addEventListener('change', (event) => onChange({ partySize: Number(event.target.value) }));
  [desktopActions, mobileActions].forEach((container) => container.querySelectorAll('[data-flow-action]').forEach((button) => {
    button.addEventListener('click', () => onAction(button.dataset.flowAction));
  }));
}

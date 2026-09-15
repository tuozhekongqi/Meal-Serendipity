function stateMarkup({ kind, title, body, actions = '' }) {
  const visual = {
    initial: { className: 'initial', symbol: '→' },
    empty: { className: 'neutral', symbol: '−' },
    error: { className: 'error', symbol: '!' }
  }[kind] ?? { className: 'neutral', symbol: '·' };
  return `<div class="state-card" data-state="${kind}">
    <div class="state-visual ${visual.className}" aria-hidden="true"><span class="state-symbol">${visual.symbol}</span></div>
    <h3>${title}</h3><p>${body}</p>${actions ? `<div class="state-actions">${actions}</div>` : ''}
  </div>`;
}

export function renderInitialState(root) {
  root.innerHTML = stateMarkup({ kind: 'initial', title: '完成选择后查看推荐', body: '推荐结果将在这里显示。' });
}

export function renderLoadingState(root, onBack) {
  root.innerHTML = `<div class="state-card" data-state="loading" role="status" aria-busy="true">
    <div class="loading-bars" aria-hidden="true"><span></span><span></span><span></span></div>
    <h3>正在整理推荐</h3><p>正在核对忌口、口味和近期选择。</p>
    <div class="state-actions"><button class="button button-secondary" type="button" data-state-action="back">返回</button></div>
  </div>`;
  root.querySelector('[data-state-action="back"]')?.addEventListener('click', onBack);
}

export function renderStatusActions(root, kind) {
  root.innerHTML = kind === 'loading'
    ? '<button class="button button-primary" type="button" disabled aria-busy="true">正在推荐…</button>'
    : '';
}

export function renderEmptyState(root, { onEdit, onBack }) {
  root.innerHTML = stateMarkup({ kind: 'empty', title: '暂时没有符合全部条件的菜品', body: '已保留所有忌口条件。可以调整预算或口味后再试。', actions: '<button class="button button-primary" type="button" data-state-action="edit">修改条件</button><button class="button button-secondary" type="button" data-state-action="back">返回上一步</button>' });
  root.querySelector('[data-state-action="edit"]')?.addEventListener('click', onEdit);
  root.querySelector('[data-state-action="back"]')?.addEventListener('click', onBack);
}

export function renderErrorState(root, { onRetry, onBack }) {
  root.innerHTML = stateMarkup({ kind: 'error', title: '推荐暂时无法生成', body: '本次选择已经保留，可以重试或返回修改条件。', actions: '<button class="button button-primary" type="button" data-state-action="retry">重试</button><button class="button button-secondary" type="button" data-state-action="back">修改条件</button>' });
  root.querySelector('[data-state-action="retry"]')?.addEventListener('click', onRetry);
  root.querySelector('[data-state-action="back"]')?.addEventListener('click', onBack);
}

export function renderFeedback(root, onFeedback) {
  const box = document.createElement('div');
  box.className = 'feedback-box';
  box.innerHTML = '<p>本次推荐反馈</p><button class="button button-secondary button-small" type="button" data-feedback="yes">合适</button><button class="button button-secondary button-small" type="button" data-feedback="no">不太合适</button>';
  box.querySelectorAll('[data-feedback]').forEach((button) => button.addEventListener('click', () => onFeedback(button.dataset.feedback, box)));
  root.append(box);
}

export function showToast(root, message, duration = 2400) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  root.replaceChildren(toast);
  globalThis.setTimeout(() => { root.innerHTML = ''; }, duration);
}

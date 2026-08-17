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
  root.innerHTML = stateMarkup({ kind: 'initial', title: '先选一个状态', body: '不想细选，可以直接点“马上推荐”。' });
}

export function renderLoadingState(root) {
  root.innerHTML = `<div class="state-card" data-state="loading" role="status">
    <div class="loading-bars" aria-hidden="true"><span></span><span></span><span></span></div>
    <h3>正在筛选</h3><p>检查忌口、口味和近期选择。</p>
  </div>`;
}

export function renderStatusActions(root, kind) {
  root.innerHTML = kind === 'loading'
    ? '<button class="button button-primary" type="button" disabled aria-busy="true">正在推荐…</button>'
    : '';
}

export function renderEmptyState(root, onEdit) {
  root.innerHTML = stateMarkup({ kind: 'empty', title: '这些条件没有合适结果', body: '忌口不会被自动放宽。修改一个条件再试。', actions: '<button class="button button-primary" type="button" data-state-action="edit">修改条件</button>' });
  root.querySelector('[data-state-action="edit"]')?.addEventListener('click', onEdit);
}

export function renderErrorState(root, { onRetry, onReset }) {
  root.innerHTML = stateMarkup({ kind: 'error', title: '暂时无法读取推荐数据', body: '数据读取或页面处理遇到问题。可以重试；若仍失败，再重置本次条件。', actions: '<button class="button button-primary" type="button" data-state-action="retry">重试</button><button class="button button-secondary" type="button" data-state-action="reset">重置</button>' });
  root.querySelector('[data-state-action="retry"]')?.addEventListener('click', onRetry);
  root.querySelector('[data-state-action="reset"]')?.addEventListener('click', onReset);
}

export function renderFeedback(root, onFeedback) {
  const box = document.createElement('div');
  box.className = 'feedback-box';
  box.innerHTML = '<p>这个答案合适吗？</p><button class="button button-secondary button-small" type="button" data-feedback="yes">合适</button><button class="button button-secondary button-small" type="button" data-feedback="no">不太合适</button>';
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

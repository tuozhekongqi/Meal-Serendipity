function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function runway(items) {
  if (!items.length) return '';
  return `<div class="decision-runway" aria-label="已通过的条件">${items.map((item) => (
    `<div class="runway-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`
  )).join('')}</div>`;
}

function metrics(items) {
  if (!items.length) return '';
  return `<div class="metric-grid">${items.map((item) => (
    `<div class="metric ${item.status === 'tradeoff' ? 'tradeoff' : ''}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`
  )).join('')}</div>`;
}

function reasonBlock(title, items, className = '') {
  if (!items.length) return '';
  return `<section class="reason-block"><h4>${title}</h4><ul class="reason-list ${className}">${items.map(({ message }) => `<li>${escapeHtml(message)}</li>`).join('')}</ul></section>`;
}

function alternatives(items) {
  if (!items.length) return '';
  return `<section class="alternatives-section" aria-labelledby="alternatives-title">
    <div class="alternatives-heading"><h3 id="alternatives-title">如果想换</h3></div>
    <div class="alternatives-list">${items.map((item) => `<button class="alternative-card" type="button" data-alternative-id="${escapeHtml(item.id)}">
      <span><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.tags.slice(0, 2).join(' · '))}</span></span><span class="alternative-label">${escapeHtml(item.differenceLabel)}</span>
    </button>`).join('')}</div>
  </section>`;
}

export function renderRecommendation(root, viewModel, { onSwap, onAlternative, onPrimaryAction }) {
  const { mode, primary } = viewModel;
  root.innerHTML = `<article class="result-wrap" data-state="success">
    <div class="result-header"><p class="result-overline">今天吃这个。</p><span class="source-badge ${mode.value === 'live' ? 'live' : ''}">${escapeHtml(mode.label)}</span></div>
    ${runway(primary.runway)}
    <div class="recommendation-title-row"><div><h3 id="recommendation-title" tabindex="-1">${escapeHtml(primary.name)}</h3>${primary.storeName ? `<p class="store-name">${escapeHtml(primary.storeName)}</p>` : ''}</div></div>
    <p class="dish-description">${escapeHtml(primary.description)}</p>
    <div class="tag-list" aria-label="菜品标签">${primary.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    ${metrics(primary.metrics)}
    <div class="reason-grid">${reasonBlock('为什么是它', primary.reasons)}${reasonBlock('需要知道的取舍', primary.tradeoffs, 'tradeoff')}</div>
    <div class="result-actions">
      <button class="button button-primary" type="button" data-result-action="primary">${escapeHtml(primary.action.label)}</button>
      <button class="button button-secondary" type="button" data-result-action="swap">换一个</button>
    </div>
    ${alternatives(viewModel.alternatives)}
  </article>`;
  root.querySelector('[data-result-action="primary"]')?.addEventListener('click', () => onPrimaryAction(primary));
  root.querySelector('[data-result-action="swap"]')?.addEventListener('click', onSwap);
  root.querySelectorAll('[data-alternative-id]').forEach((button) => button.addEventListener('click', () => onAlternative(button.dataset.alternativeId)));
  return root.querySelector('.result-wrap');
}

export function renderModeNotice(root, mode) {
  const isLive = mode.value === 'live';
  const fallback = mode.notices.find(({ code }) => !['INSPIRATION_ONLY', 'LIVE_PROVIDER_NOT_CONFIGURED'].includes(code));
  const defaultNotice = mode.notices.find(({ code }) => code === 'INSPIRATION_ONLY');
  root.className = `mode-notice${fallback ? ' degraded' : ''}${isLive ? ' live' : ''}`;
  root.innerHTML = `<span class="notice-icon" aria-hidden="true">${fallback ? '!' : isLive ? '✓' : 'i'}</span><p><strong>${isLive ? '实时候选已连接' : fallback ? '当前为静态灵感' : '当前是菜品灵感'}</strong><span>${escapeHtml(fallback?.message ?? defaultNotice?.message ?? (isLive ? '仅展示数据源实际提供的信息。' : '不含实时商家、价格、距离或配送时间。'))}</span></p>`;
}

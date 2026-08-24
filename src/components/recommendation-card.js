const PLACEHOLDER_IMAGE_SRC = './assets/dishes/placeholder.svg';

const CONSTRAINT_LABELS = Object.freeze({
  exclusion: '忌口与过敏原已避开',
  open: '商家营业状态已确认',
  available: '菜品可售状态已确认',
  orderable: '下单状态已确认',
  within_budget: '在预算范围内',
  within_eta: '在配送时间范围内',
  within_distance: '在距离范围内',
  fresh: '数据仍在有效期内'
});

const SERVING_ROLE_LABELS = Object.freeze({
  'shared-main': '共享主菜',
  'individual-main': '个人主食',
  side: '配菜',
  staple: '主食',
  snack: '小吃',
  dessert: '甜品',
  'shared-item': '共享菜品'
});

const PLAN_LABELS = Object.freeze({
  shared_bundle: '共享菜组合',
  individual_set: '分人安排',
  same_cuisine_set: '同菜系不同菜',
  compromise: '这次需要折中'
});

const DEGRADED_FROM_LABELS = Object.freeze({
  shared_bundle: '未能完成“共享菜组合”的互补搭配承诺。',
  individual_set: '未能为每一位食客完成独立菜品分配。',
  same_cuisine_set: '未能完成“同菜系不同菜”的安排。'
});

const DIAGNOSTIC_LABELS = Object.freeze({
  insufficient_complementary_roles: '安全候选的搭配角色不够互补。',
  insufficient_shared_candidates: '可共享的安全候选不足。',
  insufficient_unique_candidates: '不同食客可用的独立安全候选不足。',
  missing_cuisine_tag: '现有安全候选缺少可核实的菜系信息。',
  insufficient_same_cuisine_candidates: '同菜系的安全候选不足。',
  dining_mode_undecided: '尚未指定多人用餐方式，因此先给出一个诚实的折中方向。'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function imageMarkup(image, kind) {
  if (!image?.src || !image?.alt || !image?.kind) return '';
  const primary = kind === 'primary';
  const alternative = kind === 'alternative';
  const className = primary
    ? 'dish-image primary-dish-image'
    : alternative ? 'dish-image alternative-dish-image' : 'dish-image supporting-dish-image';
  const width = primary ? 960 : alternative ? 360 : 480;
  const height = primary ? 640 : alternative ? 240 : 320;
  const semanticHook = primary
    ? ' data-primary-dish-image'
    : alternative ? ' data-alternative-dish-image' : ' data-supporting-dish-image';
  return `<img class="${className}" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" width="${width}" height="${height}" loading="${primary ? 'eager' : 'lazy'}" decoding="async" data-image-kind="${escapeHtml(image.kind)}" data-dish-image${semanticHook}>`;
}

function textList(items, className = '') {
  return `<ul class="reason-list${className ? ` ${className}` : ''}">${items.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>`;
}

function evidenceBlock(title, messages, { className = '', emptyMessage } = {}) {
  const content = messages.length
    ? textList(messages, className)
    : `<p class="reason-empty">${escapeHtml(emptyMessage)}</p>`;
  return `<section class="reason-block${className ? ` ${className}` : ''}"><h4>${title}</h4>${content}</section>`;
}

function reasonMessages(card) {
  return (card?.reasons ?? []).map(({ message }) => message).filter(Boolean);
}

function tradeoffMessages(card) {
  return (card?.tradeoffs ?? []).map(({ message }) => message).filter(Boolean);
}

function constraintMessages(card) {
  return (card?.passedConstraints ?? []).map((constraint) => (
    CONSTRAINT_LABELS[constraint] ?? constraint
  )).filter(Boolean);
}

function metrics(items = []) {
  if (!items.length) return '';
  return `<div class="metric-grid">${items.map((item) => (
    `<div class="metric ${item.status === 'tradeoff' ? 'tradeoff' : ''}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`
  )).join('')}</div>`;
}

function contextSummary(viewModel, card) {
  const labels = [
    viewModel.partyLabel ?? card?.partyLabel,
    viewModel.sceneLabel ?? card?.sceneLabel
  ].filter(Boolean);
  return labels.length ? `<p class="result-context-summary">${labels.map(escapeHtml).join(' · ')}</p>` : '';
}

function primaryCard(card) {
  if (!card) return '';
  return `${imageMarkup(card.image, 'primary')}
    <div class="recommendation-title-row"><div><h3 id="recommendation-title" tabindex="-1">${escapeHtml(card.name)}</h3>${card.storeName ? `<p class="store-name">${escapeHtml(card.storeName)}</p>` : ''}</div></div>
    <div class="primary-card-labels">${card.partyLabel ? `<span>${escapeHtml(card.partyLabel)}</span>` : ''}${card.sceneLabel ? `<span>${escapeHtml(card.sceneLabel)}</span>` : ''}</div>
    <div class="tag-list" aria-label="菜品标签">${(card.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <p class="dish-description">${escapeHtml(card.description)}</p>
    ${metrics(card.metrics)}
    <div class="reason-grid">
      ${evidenceBlock('为什么推荐', reasonMessages(card), { emptyMessage: '暂无额外推荐理由。' })}
      ${evidenceBlock('已通过的约束', constraintMessages(card), { className: 'passed', emptyMessage: '暂无额外约束说明。' })}
      ${evidenceBlock('需要知道的取舍', tradeoffMessages(card), { className: 'tradeoff', emptyMessage: '没有额外取舍。' })}
    </div>`;
}

function supportingCard(card, heading) {
  if (!card) return `<article class="supporting-meal-card" data-assignment-missing>
    ${heading ? `<h5>${escapeHtml(heading)}</h5>` : ''}
    <p>暂时没有符合全部条件的菜品。</p>
  </article>`;
  const reasons = reasonMessages(card);
  return `<article class="supporting-meal-card">
    ${heading ? `<h5>${escapeHtml(heading)}</h5>` : ''}
    ${imageMarkup(card.image, 'supporting')}
    ${heading ? `<h6>${escapeHtml(card.name)}</h6>` : `<h5>${escapeHtml(card.name)}</h5>`}
    <p>${escapeHtml(card.description)}</p>
    <section class="supporting-reasons"><strong>为什么推荐</strong>${reasons.length ? textList(reasons) : '<p>暂无额外推荐理由。</p>'}</section>
  </article>`;
}

function bundleMarkup(items) {
  if (!items.length) return '';
  return `<section class="meal-plan-structure" data-plan-kind="shared_bundle" aria-labelledby="shared-bundle-title">
    <h4 id="shared-bundle-title">共享菜组合</h4>
    <ul class="meal-plan-list">${items.map(({ role, card }) => `<li data-serving-role="${escapeHtml(role)}">
      <p class="serving-role">${escapeHtml(SERVING_ROLE_LABELS[role] ?? role)}</p>
      ${supportingCard(card, '')}
    </li>`).join('')}</ul>
  </section>`;
}

function assignmentsMarkup(kind, assignments) {
  if (!assignments.length) return '';
  const title = kind === 'same_cuisine_set' ? '同菜系不同菜' : '分人安排';
  return `<section class="meal-plan-structure" data-plan-kind="${escapeHtml(kind)}" aria-labelledby="assignments-title">
    <h4 id="assignments-title">${title}</h4>
    <ol class="meal-plan-list">${assignments.map(({ dinerId, ownerLabel, card }) => `<li data-diner-assignment="${escapeHtml(dinerId)}">
      ${supportingCard(card, ownerLabel)}
    </li>`).join('')}</ol>
  </section>`;
}

function diagnosticMarkup(viewModel) {
  if (viewModel.kind !== 'compromise') return '';
  const diagnostics = viewModel.diagnostics ?? {};
  const missingLabels = (viewModel.assignments ?? [])
    .filter(({ dinerId }) => diagnostics.missingDinerIds?.includes(dinerId))
    .map(({ ownerLabel }) => `${ownerLabel}暂时没有符合全部条件的菜品。`);
  const messages = [
    DEGRADED_FROM_LABELS[diagnostics.degradedFrom],
    ...missingLabels,
    DIAGNOSTIC_LABELS[diagnostics.reason]
  ].filter(Boolean);
  return `<section class="degraded-plan" aria-labelledby="compromise-title">
    <h4 id="compromise-title">这次需要折中</h4>
    ${messages.length ? textList(messages, 'diagnostic-list') : '<p>当前条件下先提供一个可继续调整的方向。</p>'}
  </section>`;
}

function multiPersonMarkup(viewModel) {
  if (viewModel.kind === 'shared_bundle') return bundleMarkup(viewModel.bundleItems ?? []);
  if (viewModel.kind === 'individual_set' || viewModel.kind === 'same_cuisine_set') {
    return assignmentsMarkup(viewModel.kind, viewModel.assignments ?? []);
  }
  if (viewModel.kind === 'compromise') {
    const assignments = viewModel.assignments ?? [];
    return `${diagnosticMarkup(viewModel)}${assignments.length ? assignmentsMarkup('individual_set', assignments) : ''}${bundleMarkup(viewModel.bundleItems ?? [])}`;
  }
  return '';
}

function alternatives(items = []) {
  const visible = items.slice(0, 2);
  if (!visible.length) return '';
  return `<section class="alternatives-section" aria-labelledby="alternatives-title">
    <div class="alternatives-heading"><h3 id="alternatives-title">如果想换</h3></div>
    <div class="alternatives-list">${visible.map((item) => `<button class="alternative-card" type="button" data-alternative-id="${escapeHtml(item.id)}">
      ${imageMarkup(item.image, 'alternative')}
      <span><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml((item.tags ?? []).slice(0, 2).join(' · '))}</span></span>
      <span class="alternative-label">${escapeHtml(item.differenceLabel ?? '另一个合适选择')}</span>
      ${reasonMessages(item).length ? `<span class="alternative-reasons">${reasonMessages(item).map(escapeHtml).join('；')}</span>` : ''}
    </button>`).join('')}</div>
  </section>`;
}

function firstAvailableCard(viewModel) {
  return viewModel.primary
    ?? viewModel.bundleItems?.find(({ card }) => card)?.card
    ?? viewModel.assignments?.find(({ card }) => card)?.card
    ?? null;
}

function attachSafeImageFallback(root) {
  root.querySelectorAll('[data-dish-image]').forEach((image) => {
    if (image.dataset.imageKind === 'placeholder') return;
    let recovered = false;
    const recover = () => {
      if (recovered) return;
      recovered = true;
      image.removeEventListener('error', recover);
      image.dataset.imageKind = 'placeholder';
      image.src = PLACEHOLDER_IMAGE_SRC;
    };
    image.addEventListener('error', recover);
  });
}

export function renderRecommendation(root, viewModel, {
  onSwap = () => {},
  onBack = () => {},
  onAlternative = () => {}
} = {}) {
  const leadCard = firstAvailableCard(viewModel);
  const mode = viewModel.mode ?? { value: 'inspiration', label: '菜品灵感' };
  const planTitle = PLAN_LABELS[viewModel.kind] ?? '本次用餐安排';
  const identity = leadCard?.identity?.label ?? mode.label;
  root.innerHTML = `<article class="result-wrap" data-state="success" data-plan-kind="${escapeHtml(viewModel.kind ?? 'single')}">
    <div class="result-header">
      <p class="result-identity">${escapeHtml(identity)}</p>
      <span class="source-badge ${mode.value === 'live' ? 'live' : ''}">${escapeHtml(mode.label)}</span>
    </div>
    ${contextSummary(viewModel, leadCard)}
    ${viewModel.primary ? primaryCard(viewModel.primary) : `<h3 id="recommendation-title" tabindex="-1">${escapeHtml(planTitle)}</h3>`}
    ${multiPersonMarkup(viewModel)}
    <div class="result-actions">
      <button class="button button-primary" type="button" data-result-action="swap">换一个</button>
      <button class="button button-secondary" type="button" data-result-action="back">返回修改条件</button>
    </div>
    ${alternatives(viewModel.alternatives)}
  </article>`;
  root.querySelector('[data-result-action="swap"]')?.addEventListener('click', onSwap);
  root.querySelector('[data-result-action="back"]')?.addEventListener('click', onBack);
  root.querySelectorAll('[data-alternative-id]').forEach((button) => button.addEventListener('click', () => onAlternative(button.dataset.alternativeId)));
  attachSafeImageFallback(root);
  return root.querySelector('.result-wrap');
}

export function renderModeNotice(root, mode) {
  const isLive = mode.value === 'live';
  const fallback = mode.notices.find(({ code }) => !['INSPIRATION_ONLY', 'LIVE_PROVIDER_NOT_CONFIGURED'].includes(code));
  const defaultNotice = mode.notices.find(({ code }) => code === 'INSPIRATION_ONLY');
  root.className = `mode-notice${fallback ? ' degraded' : ''}${isLive ? ' live' : ''}`;
  root.innerHTML = `<span class="notice-icon" aria-hidden="true">${fallback ? '!' : isLive ? '✓' : 'i'}</span><p><strong>${isLive ? '实时候选已连接' : fallback ? '当前为静态灵感' : '当前是菜品灵感'}</strong><span>${escapeHtml(fallback?.message ?? defaultNotice?.message ?? (isLive ? '仅展示数据源实际提供的信息。' : '不含实时商家、价格、距离或配送时间。'))}</span></p>`;
}

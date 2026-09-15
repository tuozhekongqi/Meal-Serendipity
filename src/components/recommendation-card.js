const PLACEHOLDER_IMAGE_SRC = './assets/dishes/placeholder.svg';
const PLACEHOLDER_IMAGE_ALT = '暂无对应菜品图片';

const CONSTRAINT_LABELS = Object.freeze({
  exclusion: '已按你填写的忌口信息筛选。不同做法的配料可能不同，用餐前请再次确认。',
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
  individual_set: '每人一份',
  same_cuisine_set: '同菜系不同菜',
  compromise: '折中方案'
});

const DEGRADED_FROM_LABELS = Object.freeze({
  shared_bundle: '现有菜品不足以组成完整的共享搭配。',
  individual_set: '暂时无法为每位用餐者分别安排菜品。',
  same_cuisine_set: '暂时无法完成同菜系不同菜的安排。'
});

const DIAGNOSTIC_LABELS = Object.freeze({
  insufficient_complementary_roles: '现有菜品不足以组成完整的共享搭配。',
  insufficient_shared_candidates: '符合条件的共享菜品不足。',
  insufficient_unique_candidates: '暂时无法为每位用餐者分别安排菜品。',
  missing_cuisine_tag: '现有菜品缺少明确的菜系信息。',
  insufficient_same_cuisine_candidates: '符合条件的同菜系菜品不足。',
  dining_mode_undecided: '尚未选择多人用餐方式，先提供一个可调整的折中方案。'
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
  const height = primary ? 720 : alternative ? 270 : 360;
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

function evidenceGrid(card, className = '') {
  const live = (card?.metrics ?? []).length > 0;
  const guidance = constraintMessages(card);
  return `<div class="reason-grid${className ? ` ${className}` : ''}">
    ${evidenceBlock('推荐依据', reasonMessages(card), { emptyMessage: '暂无额外推荐依据。' })}
    ${evidenceBlock(live ? '已确认信息' : '食用提示', guidance, { className: 'passed', emptyMessage: live ? '暂无额外确认信息。' : '不同做法的配料可能不同，用餐前请再次确认。' })}
    ${live ? evidenceBlock('注意事项', tradeoffMessages(card), { className: 'tradeoff', emptyMessage: '暂无额外注意事项。' }) : ''}
  </div>`;
}

function primaryCard(card, {
  headingTag = 'h3',
  headingId = 'recommendation-title',
  includeEvidence = true
} = {}) {
  if (!card) return '';
  const headingAttributes = headingId ? ` id="${headingId}" tabindex="-1"` : '';
  return `${imageMarkup(card.image, 'primary')}
    <div class="recommendation-title-row"><div><${headingTag}${headingAttributes}>${escapeHtml(card.name)}</${headingTag}>${card.storeName ? `<p class="store-name">${escapeHtml(card.storeName)}</p>` : ''}</div></div>
    <div class="primary-card-labels">${card.partyLabel ? `<span>${escapeHtml(card.partyLabel)}</span>` : ''}${card.sceneLabel ? `<span>${escapeHtml(card.sceneLabel)}</span>` : ''}</div>
    <div class="tag-list" aria-label="菜品标签">${(card.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <section class="dish-introduction"><h4>菜品介绍</h4><p class="dish-description">${escapeHtml(card.description)}</p></section>
    ${metrics(card.metrics)}
    ${includeEvidence ? evidenceGrid(card) : ''}`;
}

function planPrimaryCard(card, planSummary) {
  if (!card || !planSummary) return '';
  return `<section class="plan-primary" aria-labelledby="recommendation-title">
    <h3 id="recommendation-title" tabindex="-1">${escapeHtml(planSummary.title)}</h3>
    <p class="plan-summary-copy">${escapeHtml(planSummary.summary)}</p>
    ${primaryCard(card, { headingTag: 'h4', headingId: null, includeEvidence: false })}
    ${evidenceGrid(planSummary, 'plan-evidence')}
  </section>`;
}

function supportingCard(card, heading) {
  if (!card) return `<article class="supporting-meal-card" data-assignment-missing>
    ${heading ? `<h5>${escapeHtml(heading)}</h5>` : ''}
    <p>暂时没有符合全部条件的菜品。</p>
  </article>`;
  const reasons = reasonMessages(card);
  const constraints = constraintMessages(card);
  const tradeoffs = (card?.metrics ?? []).length ? tradeoffMessages(card) : [];
  return `<article class="supporting-meal-card">
    ${heading ? `<h5>${escapeHtml(heading)}</h5>` : ''}
    ${imageMarkup(card.image, 'supporting')}
    ${heading ? `<h6>${escapeHtml(card.name)}</h6>` : `<h5>${escapeHtml(card.name)}</h5>`}
    <section class="supporting-introduction"><strong>菜品介绍</strong><p>${escapeHtml(card.description)}</p></section>
    <section class="supporting-reasons"><strong>推荐依据</strong>${reasons.length ? textList(reasons) : '<p>暂无额外推荐依据。</p>'}</section>
    <section class="supporting-constraints"><strong>食用提示</strong>${constraints.length ? textList(constraints, 'passed') : '<p>不同做法的配料可能不同，用餐前请再次确认。</p>'}</section>
    ${tradeoffs.length ? `<section class="supporting-tradeoffs"><strong>注意事项</strong>${textList(tradeoffs, 'tradeoff')}</section>` : ''}
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
  const title = kind === 'same_cuisine_set' ? '同菜系不同菜' : '每人一份';
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
    <h4 id="compromise-title">折中方案</h4>
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
    <div class="alternatives-heading"><h3 id="alternatives-title">备选菜品</h3></div>
    <div class="alternatives-list">${visible.map((item) => {
      const hero = item.hero ?? item;
      const alternativeId = item.planId ?? item.id;
      const isPlan = Boolean(item.planId && item.kind !== 'single');
      const title = isPlan ? item.title ?? hero.name : hero.name;
      const detail = isPlan
        ? [hero.name, item.summary].filter(Boolean).join(' · ')
        : hero.description;
      const reasons = reasonMessages(hero);
      return `<button class="alternative-card" type="button" data-alternative-id="${escapeHtml(alternativeId)}">
        ${imageMarkup(hero.image, 'alternative')}
        <span><strong>${escapeHtml(title)}</strong>${isPlan ? `<span data-alternative-hero-name="${escapeHtml(hero.name)}">${escapeHtml(detail)}</span>` : ''}</span>
        <span class="alternative-description">${escapeHtml(hero.description)}</span>
        ${reasons.length ? `<span class="alternative-reasons"><b>推荐依据</b>${reasons.map(escapeHtml).join('；')}</span>` : ''}
        <span class="alternative-action">${isPlan ? '选择这个方案' : '选择这道菜'}</span>
      </button>`;
    }).join('')}</div>
  </section>`;
}

function alternativeShortageMarkup(diagnostics = {}) {
  const missing = diagnostics.alternativeShortageCount ?? 0;
  if (missing <= 0) return '';
  const available = 2 - missing;
  return `<p class="alternative-shortage" role="note">目前只有 ${available} 个符合全部条件的备选，未使用重复菜品补足。</p>`;
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
      image.alt = PLACEHOLDER_IMAGE_ALT;
    };
    image.addEventListener('error', recover);
  });
}

export function renderRecommendation(root, viewModel, {
  onSwap = () => {},
  onBack = () => {},
  onAlternative = () => {},
  onPrimaryAction = () => {}
} = {}) {
  const leadCard = firstAvailableCard(viewModel);
  const mode = viewModel.mode ?? { value: 'inspiration', label: '菜品参考' };
  const planTitle = PLAN_LABELS[viewModel.kind] ?? '本次用餐安排';
  const identity = leadCard?.identity?.label ?? mode.label;
  root.innerHTML = `<article class="result-wrap" data-state="success" data-plan-kind="${escapeHtml(viewModel.kind ?? 'single')}">
    <div class="result-header"><p class="result-identity">${escapeHtml(identity)}</p></div>
    ${contextSummary(viewModel, leadCard)}
    ${viewModel.planSummary
      ? planPrimaryCard(viewModel.primary, viewModel.planSummary)
      : viewModel.primary ? primaryCard(viewModel.primary) : `<h3 id="recommendation-title" tabindex="-1">${escapeHtml(planTitle)}</h3>`}
    ${multiPersonMarkup(viewModel)}
    <div class="result-actions">
      ${leadCard?.action?.label ? `<button class="button button-primary" type="button" data-result-action="primary">${escapeHtml(leadCard.action.label)}</button>` : ''}
      <button class="button button-secondary" type="button" data-result-action="swap">换一个</button>
      <button class="button button-secondary" type="button" data-result-action="back">修改条件</button>
    </div>
    ${alternativeShortageMarkup(viewModel.diagnostics)}
    ${alternatives(viewModel.alternatives)}
  </article>`;
  root.querySelector('[data-result-action="primary"]')?.addEventListener('click', () => onPrimaryAction(leadCard));
  root.querySelector('[data-result-action="swap"]')?.addEventListener('click', onSwap);
  root.querySelector('[data-result-action="back"]')?.addEventListener('click', onBack);
  root.querySelectorAll('[data-alternative-id]').forEach((button) => button.addEventListener('click', () => onAlternative(button.dataset.alternativeId)));
  attachSafeImageFallback(root);
  return root.querySelector('.result-wrap');
}

export function renderModeNotice(root, mode) {
  const isLive = mode.value === 'live';
  const fallback = mode.notices.find(({ code }) => !['INSPIRATION_ONLY', 'LIVE_PROVIDER_NOT_CONFIGURED'].includes(code));
  root.className = `mode-notice${fallback ? ' degraded' : ''}${isLive ? ' live' : ''}`;
  root.innerHTML = `<span class="notice-icon" aria-hidden="true">${fallback ? '!' : isLive ? '✓' : 'i'}</span><p><strong>${isLive ? '实时推荐' : fallback ? '菜品参考暂时降级' : '菜品参考'}</strong><span>${escapeHtml(fallback?.message ?? (isLive ? '仅展示数据源实际提供的信息。' : '来自项目内置清单，实际配料请在用餐前确认。'))}</span></p>`;
}

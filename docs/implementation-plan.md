# Meal-Serendipity Modern Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前菜品摇签单页分阶段升级为可在约 30 秒内给出预算、口味、距离、配送时间和当前状态均可解释的外卖推荐助手。

**Architecture:** 保持前端为静态 GitHub Pages 应用，使用原生 ES Modules 将领域模型、过滤、评分、解释、provider、存储和 UI 分离。真实外卖候选由仓库外的合法数据服务提供；无服务时使用明确标注的菜品灵感 provider，不伪造距离或 ETA。

**Tech Stack:** HTML5、CSS3、原生 JavaScript ES Modules、Node.js 内置测试运行器、Playwright 浏览器检查、GitHub Actions、GitHub Pages。

## 状态同步说明

状态核验日期：2026-08-17。代码基线：`main` 提交 `a87db1c38a164793af9793f28db22b1fb7d1d622`。

本文件的 checkbox 只在当前仓库、提交历史、自动化测试、已提交的浏览器验证记录或 GitHub API 状态提供直接证据时勾选。历史上“先写失败测试”、独立 PR、未保存的人工步骤和范围大于现有证据的组合项保持未勾选，即使其部分产物已经存在。当前状态摘要：阶段 0、1、2、3 和 5 已有实质交付但仍存在未完成项；阶段 4 未开始生产接入；阶段 6A 仅完成指标与隐私设计，没有 analytics 代码或遥测数据。

| 阶段 | 状态 | 当前证据与缺口 |
| --- | --- | --- |
| 0 | 已交付 | 治理、历史行为基线和数据契约存在；阶段 0 历史清单保持不变 |
| 1 | 已交付 | 领域模块和确定性测试存在，当前 Node 测试通过 |
| 2 | 已交付接口，生产 live 未启用 | Provider、位置、存储和降级模块有测试；生产 endpoint 为空 |
| 3（含 3.5/3.6） | 部分达到目标 | 现代 UI、灵感推荐和响应式已交付；位置、预算、ETA、距离及逐人多人流程尚未进入当前 UI |
| 4 | 未完成 | 合法实时数据服务、公开 endpoint 和生产集成均不存在 |
| 5 | 部分达到目标 | CI、构建、E2E、Pages workflow 和 `main` 保护已存在；手动运行 `32035363958` 重新部署后，线上内容已核验符合 `dist/` 边界，真实移动网络 smoke test 仍待完成 |
| 6A | 设计完成 | 指标、隐私和离线评估已定义；未实现 analytics，未收集数据 |
| 6B | 未开始 | 需先通过阶段 6A 的后续决策门和额外批准 |

## Global Constraints

- 不直接修改或提交到 `main`；每阶段使用独立 `codex/` 分支和 Pull Request。
- 忌口与过敏原是不可放宽的硬约束，实时和随机/灵感路径必须共用安全过滤。
- 推荐逻辑不得依赖 DOM、`window`、`localStorage` 或平台跳转。
- 不伪造商家、距离、ETA、价格、营业或库存数据。
- 首个 UI 版本采用 `docs/design-system.md` 的极简智能型，不延续古风视觉。
- 移动端优先，验收视口为 320px、390px、768px 和 1440px。
- 主要触控目标至少 44×44px；可访问性以 WCAG 2.2 AA 为基线。
- 每阶段都必须有可独立运行的检查、审查点和回滚边界。
- 未获单独批准前不引入 React、Vue、账号体系、遥测或私密第三方凭证。

---

## 计划编写时的历史基线

以下条目记录实施计划最初编写时的起点，不代表 2026-08-17 的当前状态；当前状态以上方“状态同步说明”为准。

- 根目录 `index.html` 为 2,410 行单文件应用，内联 CSS、SVG、175 条菜品和全部 JavaScript。
- 无 `package.json`、模块、自动化测试或 GitHub Actions。
- GitHub Pages 当时从 `main` 根目录以 legacy branch deployment 发布；当前已改为 `.github/workflows/pages.yml` 构建并发布 `dist/`，且运行 `32035363958` 的线上核验已确认 artifact 边界正确。
- `一餐之缘_分享版/index.html` 是未定义同步规则的独立副本。
- 现有 `AGENTS.md` 的古风视觉与离线优先规则和已确认方案冲突；阶段 0 必须先修正治理文档。

## 目标文件结构

```text
Meal-Serendipity/
├── index.html
├── package.json
├── favicon.svg
├── 404.html
├── src/
│   ├── main.js
│   ├── config.js
│   ├── domain/
│   │   └── models.js
│   ├── data/
│   │   └── dishes.js
│   ├── recommendation/
│   │   ├── filter.js
│   │   ├── score.js
│   │   ├── explain.js
│   │   └── recommend.js
│   ├── providers/
│   │   ├── candidate-provider.js
│   │   ├── inspiration-provider.js
│   │   └── http-provider.js
│   ├── services/
│   │   ├── context.js
│   │   ├── location.js
│   │   └── storage.js
│   ├── components/
│   │   ├── inputs.js
│   │   ├── recommendation-card.js
│   │   ├── feedback.js
│   │   └── dialog.js
│   └── styles/
│       ├── tokens.css
│       ├── base.css
│       ├── components.css
│       └── responsive.css
├── tests/
│   ├── recommendation/
│   │   ├── filter.test.js
│   │   ├── score.test.js
│   │   ├── explain.test.js
│   │   └── recommend.test.js
│   ├── providers/
│   │   └── providers.test.js
│   └── e2e/
│       └── recommendation-flow.spec.js
├── scripts/
│   └── build-pages.mjs
└── .github/workflows/
    ├── ci.yml
    └── pages.yml
```

## 核心接口

`src/domain/models.js` 使用 JSDoc 定义并导出：

- `UserContext`：`location`、`totalBudget`、`maxDeliveryMinutes`、`maxDistanceKm`、`partySize`、`tastePreferences`、`exclusions`、`currentPriority`、`recentHistory`。
- `Candidate`：`store`、`item`、`pricing`、`delivery`、`availability`、`dataUpdatedAt`、`sourceMode`。
- `Recommendation`：`candidate`、`matchLevel`、`reasonCodes`、`tradeoffs`、`passedConstraints`、`score`。

`src/providers/candidate-provider.js` 约定：

```js
async function getCandidates(userContext, { signal }) {
  return { mode: 'live' | 'inspiration', candidates: [], fetchedAt: '' };
}
```

`src/recommendation/recommend.js` 约定：

```js
function recommend(userContext, candidates, options = {}) {
  return { primary: null, alternatives: [], rejected: [], diagnostics: {} };
}
```

## 阶段 0：治理与基线对齐

**目标：** 在改业务代码前消除规则冲突，固定现有行为和回滚基线。

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`
- Create: `docs/current-behavior-checklist.md`
- Create: `docs/data-source-contract.md`
- No change: `index.html`

**Actions:**

- [x] 将 `AGENTS.md` 的古风保留要求改为引用 `docs/design-system.md`，并明确实时/灵感模式边界。
- [x] 更新 README 的产品定位、当前线上地址、开发/验证说明和 GitHub Pages 状态。
- [x] 记录当前快速摇签、完整表单、多人、忌口、三案、恢复和下单跳转的基线行为。
- [x] 固定 provider 请求、响应、超时、5 分钟 TTL、错误和隐私边界。
- [x] 在 320px、390px、768px、1440px 保存基线截图；记录当前 favicon 404 和控制台状态。
- [x] 运行 `git diff --check`，确认无业务文件变化。

**Exit gate:** 规则不再互相冲突，真实数据契约可独立交给服务端实现，当前业务行为有可重复基线。

## 阶段 1：推荐领域模型与确定性测试

**目标：** 先建立不依赖 UI 的可信推荐内核，不改变现有页面视觉。

**Files:**

- Create: `package.json`
- Create: `src/domain/models.js`
- Create: `src/data/dishes.js`
- Create: `src/recommendation/filter.js`
- Create: `src/recommendation/score.js`
- Create: `src/recommendation/explain.js`
- Create: `src/recommendation/recommend.js`
- Create: `tests/recommendation/filter.test.js`
- Create: `tests/recommendation/score.test.js`
- Create: `tests/recommendation/explain.test.js`
- Create: `tests/recommendation/recommend.test.js`
- Modify: `index.html` only to consume the new engine after tests pass; do not alter layout or copy.

**Actions:**

- [x] 在 `package.json` 增加 `test` 和 `test:recommendation`，使用 Node.js 内置 `node --test`，不引入运行时框架。
- [ ] 先写失败测试：过敏原、预算、ETA、距离、营业/可售、数据 TTL 必须硬过滤。
- [ ] 运行 `npm test`，确认测试因模块尚未实现而失败。
- [x] 实现 `filterCandidates(context, candidates, now)` 并让硬过滤测试通过。
- [ ] 先写失败测试：默认权重、优先目标调权、同分稳定排序和注入随机源。
- [x] 实现 `scoreCandidate` 与 `rankCandidates`，禁止直接读取全局状态。
- [ ] 先写失败测试：推荐理由必须对应真实 reason code，取舍不能伪装为满足。
- [x] 实现 `explainRecommendation` 与 `recommend`。
- [x] 将现有 175 条菜品迁移到 `src/data/dishes.js`，校验唯一名称、价格范围、类型、口味和过敏原字段。
- [x] 用适配层让当前页面调用新引擎，比较迁移前后的固定样例。
- [ ] 运行 `npm test`、静态服务器和现有手动流程；提交独立 PR。

**Exit gate:** 固定输入得到可重复结果；硬约束违规测试为零；现有页面仍可使用且视觉未重做。

## 阶段 2：上下文、Provider 与降级模式

**目标：** 建立位置、偏好、实时数据和灵感数据的边界，使 UI 不关心候选来源。

**Files:**

- Create: `src/config.js`
- Create: `src/providers/candidate-provider.js`
- Create: `src/providers/inspiration-provider.js`
- Create: `src/providers/http-provider.js`
- Create: `src/services/context.js`
- Create: `src/services/location.js`
- Create: `src/services/storage.js`
- Create: `tests/providers/providers.test.js`
- Add tests: `tests/recommendation/recommend.test.js`

**Actions:**

- [x] 测试 `InspirationCandidateProvider` 永不返回伪造距离、ETA、商家或实时总价。
- [x] 实现灵感 provider，把静态菜品映射为 `sourceMode: 'inspiration'` 候选。
- [x] 测试 `HttpCandidateProvider` 的成功、超时、Abort、非 2xx、无效数据和过期数据。
- [x] 实现 HTTP provider；端点仅从公开运行时配置读取，仓库不得保存私密 key。
- [x] 测试定位授权、拒绝、不支持和手动区域四条路径。
- [x] 实现位置服务，只保存用户主动选择的粗粒度区域，不长期保存精确坐标。
- [x] 实现偏好存储的版本号、迁移、损坏数据回退和清除方法。
- [x] 实现 live → inspiration 降级，并返回用户可见的 `ModeNotice` 原因。
- [ ] 运行 `npm test`，人工断网验证降级，提交独立 PR。

**Exit gate:** provider 可替换；实时异常不会阻断产品；灵感模式不会冒充真实外卖推荐。

## 阶段 3：极简智能型 UI 与主流程

**目标：** 用确认的页面结构替换古风长流程，完成 30 秒决策体验。

**Files:**

- Modify: `index.html`
- Create: `src/main.js`
- Create: `src/components/inputs.js`
- Create: `src/components/recommendation-card.js`
- Create: `src/components/feedback.js`
- Create: `src/components/dialog.js`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/components.css`
- Create: `src/styles/responsive.css`
- Modify: `src/services/context.js`
- Modify: `src/services/storage.js`

**Actions:**

- [x] 将 `index.html` 收敛为语义化 app shell：`header`、`main`、唯一 `h1`、真实 `form` 和结果区域。
- [ ] 实现位置、总预算、最大 ETA、最大距离和当前优先目标；口味、忌口、人数放入“更多偏好”。
- [x] 删除主流程中的独立封面、精择/摇签模式页和三案选择页。
- [ ] 实现一个主推荐、决策跑道、结构化理由、取舍、“换一个”和“去下单”。
- [ ] 实现更快、更便宜、更新鲜替代卡，但不让它们与主推荐争夺首屏主 CTA。
- [ ] 实现定位拒绝、加载、无候选、实时失败、灵感模式和平台跳转失败状态。
- [x] 按 `tokens.css` 落实颜色、排版、间距、圆角和焦点；不保留古风 token。
- [x] 实现 320/390 单栏、768 过渡布局和 1024+ 双栏布局。
- [ ] 完成 `aria-pressed`、对话框焦点管理、`aria-live`、错误关联和减少动效。
- [ ] 在四个验收视口截图并走通新用户、回访用户、无候选和灵感模式。
- [ ] 运行 `npm test`，检查控制台和性能预算，提交独立 PR。

**Exit gate:** 回访用户一键推荐；新用户核心输入可在约 30 秒内完成；首屏结果可理解并可下单。

## 阶段 4：真实候选数据接入

**目标：** 在已获得合法服务端地址和数据授权后启用实时外卖模式。

**Files:**

- Modify: `src/config.js`
- Modify: `src/providers/http-provider.js`
- Modify: `src/components/recommendation-card.js`
- Modify: `src/components/feedback.js`
- Add tests: `tests/providers/providers.test.js`
- Add tests: `tests/recommendation/filter.test.js`

**Actions:**

- [ ] 用契约测试验证真实响应能够无损映射为 `Candidate`。
- [ ] 验证总价包含菜品、配送费和明确可知的必要费用；未知费用必须显示为取舍。
- [ ] 验证营业、库存、ETA、距离、5 分钟 TTL 和供应方错误路径。
- [ ] 在结果卡显示来源更新时间，过期时自动降级或要求刷新。
- [ ] 验证平台链接不会把私密位置参数写入仓库或不必要地写入 URL。
- [ ] 进行供应方沙箱/测试环境检查，再逐步启用 production endpoint。
- [ ] 运行全部单元测试与手动真实候选流程，提交独立 PR。

**External gate:** 未提供合法数据服务和公开前端 endpoint 时，本阶段不启用；阶段 0–3 仍可完整交付灵感模式，界面不得展示伪造实时字段。

**当前状态：未完成。** `PROVIDER_CONFIG.endpoint` 和应用使用的 `liveProvider` 均为 `null`；没有合法生产数据服务、公开 endpoint 或真实候选集成证据。

## 阶段 5：端到端测试、性能与 GitHub Pages

**目标：** 建立可重复质量门和只发布网站产物的自动部署。

**Files:**

- Create: `tests/e2e/recommendation-flow.spec.js`
- Create: `scripts/build-pages.mjs`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml`
- Create: `favicon.svg`
- Create: `404.html`
- Modify: `package.json`
- Modify: `README.md`

**Actions:**

- [ ] 增加 `build`、`test:e2e` 和 `check` 脚本；`build-pages.mjs` 只复制 `index.html`、`src/`、必要 assets、favicon 和 404 到 `dist/`。
- [x] 将 Playwright 作为仅用于开发和 CI 的 dev dependency 安装，不引入浏览器端运行时依赖。
- [ ] 编写端到端测试：新用户、回访、定位拒绝、无候选、灵感降级、换一个和平台跳转后备。
- [ ] 在 320px 和 1440px 运行核心 E2E；验证键盘、焦点、无横向滚动和减少动效。
- [ ] CI 在 Pull Request 运行 `npm run check`，失败时不得进入部署。
- [x] Pages workflow 仅在 `main` 合并后上传 `dist/`，使用 `github-pages` environment，不从 `/docs` 发布。
- [x] 验证项目子路径 `/Meal-Serendipity/` 下的相对资源、刷新和 404 行为。
- [ ] 验证 LCP、CLS、INP 和资源预算；修复 favicon 404。
- [ ] 更新 README 的开发、测试、构建、部署和回滚说明，提交独立 PR。

**Exit gate:** PR 有自动质量门；main 只通过 workflow 部署选定产物；线上页面具备可验证回滚点。

## 阶段 6：数据驱动迭代

**目标：** 在不默认引入跟踪的前提下，用明确批准的指标验证推荐质量。

**Files:**

- Modify only after privacy approval: `src/config.js`
- Create only after privacy approval: `src/services/analytics.js`
- Modify: `docs/product-brief.md` when指标目标或产品边界发生变化。
- Modify: `docs/design-system.md` only when token、组件或交互规则被批准改变。

**Actions:**

- [x] 先确定是否需要遥测、事件最小集合、保留周期、匿名化和退出机制。
- [x] 未获批准时只进行本地、人工和测试数据评估，不创建 analytics 文件。
- [ ] 获批后只记录完成时间、推荐接受、换一个、无候选和平台跳转等必要事件，不记录精确位置和忌口原文。
- [ ] 用数据评估权重，不直接在线自学习；每次权重调整走测试和 Pull Request。

**阶段 6A 当前状态：设计完成。** 权威文档为 `docs/phase-6a-metrics-and-privacy.md`。30 天原始事件保留只是未来获批试点的默认上限，90 天去标识聚合保留需要额外批准；当前没有 analytics 文件、SDK、数据接收端、行为上传或遥测数据。阶段 6B 不得在后续决策门满足前开始。

**Exit gate:** 产品指标可解释，隐私边界被记录，算法变化可复现和回滚。

## 每阶段验证门槛

- `git diff --check` 无错误，diff 只包含本阶段文件。
- `npm test` 全部通过；存在 UI 变更时补充浏览器检查。
- 控制台无新增错误或警告。
- 320px、390px、768px、1440px 无横向溢出。
- 键盘主流程、焦点、错误反馈、减少动效和 200% 缩放可用。
- 实时/灵感模式标识正确，硬约束不得被降级绕过。
- 提交到非 `main` 分支，通过 Pull Request 审查，不自动合并。

## 回滚策略

- 每阶段独立分支和 PR；不把引擎、UI、真实数据和部署塞入同一变更。
- 阶段 1–2 通过适配层保留旧 UI，直到阶段 3 验收。
- 阶段 3 发布前保留上一版 Pages artifact 或提交 SHA，可立即回滚。
- 实时 provider 可通过公开配置关闭并退回灵感模式；该开关不得影响忌口硬过滤。

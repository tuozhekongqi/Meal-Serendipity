# Phase 3 Minimal Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用移动端优先的极简智能型界面替换古风页面，并在不伪造实时数据的前提下，让用户快速获得一个可解释的菜品灵感和两个次级替代项。

**Architecture:** 根页面只保留语义化 app shell；`src/main.js` 负责 UI 状态与既有 provider/推荐核心编排，组件模块只负责输入、结果、反馈和对话框渲染。新增纯展示模型将领域结果转为界面数据，并在单元测试中固定 live 与 inspiration 的字段边界。

**Tech Stack:** HTML5、CSS3、原生 JavaScript ES Modules、Node.js 内置测试运行器、Playwright CLI。

## Global Constraints

- 继续使用当前功能分支，不修改或合并 `main`。
- 保留阶段 1 推荐核心和阶段 2 Provider、上下文、定位、存储与降级接口。
- 当前未配置实时 Provider，不请求精确位置，不展示或伪造商家、价格、距离、ETA、营业或可下单状态。
- 不删除现有测试，不引入运行时依赖，不进入阶段 4。
- 移动端从 320px 开始；键盘、焦点、减少动效和触控目标遵循 WCAG 2.2 AA 基线。

---

### Task 1: Recommendation presentation contract

**Files:**
- Create: `tests/presentation/recommendation-view-model.test.js`
- Create: `src/presentation/recommendation-view-model.js`

**Interfaces:**
- Consumes: `Recommendation`、provider response mode/notices、`UserContext`
- Produces: `createRecommendationViewModel({ recommendation, alternatives, mode, notices, context })`

- [ ] 写失败测试：灵感模式不得暴露实时指标、商家或下单动作。
- [ ] 写失败测试：live 模式只展示实际存在的数据，并正确标记接近上限的取舍。
- [ ] 写失败测试：替代候选标签由可验证差异生成，灵感模式只使用“换个口味/方向”。
- [ ] 实现最小展示模型并运行 `node --test tests/presentation/recommendation-view-model.test.js`。

### Task 2: Semantic shell and design system

**Files:**
- Modify: `index.html`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/components.css`
- Create: `src/styles/responsive.css`

**Interfaces:**
- Consumes: approved tokens and app states
- Produces: stable DOM mount points for `src/main.js`

- [ ] 将根页面替换为带唯一 `h1`、真实 `form`、结果区、`aria-live` 和跳转链接的语义化外壳。
- [ ] 实现 token、基础排版、按钮/卡片/表单/状态、移动底栏和桌面双栏。
- [ ] 保持全部资源为相对路径，避免外部字体和图片请求。

### Task 3: Input, result, feedback and dialog components

**Files:**
- Create: `src/components/inputs.js`
- Create: `src/components/recommendation-card.js`
- Create: `src/components/feedback.js`
- Create: `src/components/dialog.js`

**Interfaces:**
- Consumes: plain UI state and callbacks
- Produces: `renderInputFlow`、`renderRecommendation`、state renderers、`createDialogController`

- [ ] 实现场景选择、精准筛选三步、真实进度、返回/跳过和可访问选中状态。
- [ ] 实现一个首选、决策跑道、理由、取舍、两个低权重替代项、换一个和反馈。
- [ ] 实现初始、加载、无候选、provider 降级、错误与重置状态。
- [ ] 实现 Escape、焦点锁定和关闭后焦点恢复的对话框。

### Task 4: Application orchestration

**Files:**
- Create: `src/main.js`

**Interfaces:**
- Consumes: `FallbackCandidateProvider`、`InspirationCandidateProvider`、`createUserContext`、`createPreferenceStorage`、`recommend` and UI components
- Produces: complete browser flow without changing domain/provider modules

- [ ] 加载安全偏好并恢复非敏感筛选；忌口仅保存在当前内存。
- [ ] 实现快速推荐、精准筛选、候选切换、反馈、复制菜名与重置。
- [ ] Provider 失败时显示可见降级原因；两级 provider 均失败时显示可恢复错误/空状态。
- [ ] 推荐后更新安全历史并将焦点移至结果标题。

### Task 5: Verification

**Files:**
- No production changes unless a failing check is first reproduced

- [ ] 运行 `npm test` 和 `git diff --check`。
- [ ] 启动静态服务器，使用 Playwright 检查 320、390、768、1440。
- [ ] 走通快速推荐、精准筛选、单一首选 + 两个替代、换一个、反馈、刷新恢复和重置。
- [ ] 检查键盘焦点、对话框、横向溢出、控制台错误/警告和资源失败。
- [ ] 检查首屏资源数量、JS/CSS 体积和页面性能，不修改部署配置。

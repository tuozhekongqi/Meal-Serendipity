# Phase 3.5 Visual and Responsive Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将阶段 3 的蓝色视觉系统迁移为暖白、石墨和珊瑚橙，并修正 320–1024px 的响应式密度、状态辨识和替代标签真实性。

**Architecture:** 保留现有 HTML 结构、推荐核心、Provider 和上下文接口；展示模型继续负责可验证标签，组件只负责语义状态标记，CSS token 和断点统一控制视觉。自动化测试固定展示标签与状态契约，真实浏览器负责六档视口和交互验收。

**Tech Stack:** HTML5、CSS3、原生 JavaScript ES Modules、Node.js 内置测试运行器、Playwright CLI。

## Global Constraints

- 继续使用当前功能分支，不修改或合并 `main`。
- 不进入阶段 4，不接入真实外卖平台，不改变阶段 1/2 的领域与 Provider 接口。
- 灵感模式不得展示或暗示商家、价格、距离、ETA、营业或可下单状态。
- 主色为 `#E76545`，不保留蓝色主操作、蓝色渐变或额外高饱和强调色。
- 移动端只保留底部结果操作；双栏从 1024px 开始，900px 保持单栏。

---

### Task 1: Verifiable presentation labels and state semantics

**Files:**
- Modify: `tests/presentation/recommendation-view-model.test.js`
- Create: `tests/presentation/feedback-state.test.js`
- Modify: `src/presentation/recommendation-view-model.js`
- Modify: `src/components/feedback.js`
- Modify: `src/components/recommendation-card.js`

**Interfaces:**
- Consumes: candidate taste/category tags and verified live price/ETA fields
- Produces: truthful `differenceLabel` values and distinct `data-state`/notice classes

- [ ] Write tests proving overlapping inspiration tastes do not claim “换个口味”.
- [ ] Write tests proving “更快送达” and “更便宜” require comparable live fields.
- [ ] Write tests proving empty, error, loading and degraded states expose distinct semantic markers.
- [ ] Run the focused tests and confirm they fail for the missing behavior.
- [ ] Implement the minimum presentation changes and rerun the focused tests.

### Task 2: Warm color system and responsive behavior

**Files:**
- Modify: `index.html`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/responsive.css`
- Modify: `docs/design-system.md`

**Interfaces:**
- Consumes: approved semantic color tokens and existing component classes
- Produces: consistent warm palette, 1024px desktop split, compact mobile runway and one mobile action set

- [ ] Replace color tokens, theme color, favicon and all blue-derived fills/focus states.
- [ ] Give empty/error/degraded/loading/success states distinct neutral, red, amber, warm and green semantics.
- [ ] Keep 320px scenes in a compact two-column layout and compress the decision runway.
- [ ] Hide in-card result actions below 900px while retaining the fixed bottom bar.
- [ ] Delay the two-column layout to 1024px and keep reasons single-column until 1200px.
- [ ] Update the authoritative design-system tokens and breakpoint table.

### Task 3: Verification

**Files:**
- No production changes unless a failing check is first reproduced

**Interfaces:**
- Consumes: completed Phase 3.5 implementation
- Produces: automated and browser evidence for handoff

- [ ] Run `npm test` and `git diff --check`.
- [ ] Check 320px, 390px, 768px, 900px, 1024px and 1440px with a real browser.
- [ ] Exercise quick recommendation, precise three-step filtering, three candidates, swap, empty/error states and the dialog.
- [ ] Verify keyboard focus, console errors/warnings, horizontal overflow and local resource loading.
- [ ] Remove browser artifacts, inspect the final diff and stop before Phase 4.

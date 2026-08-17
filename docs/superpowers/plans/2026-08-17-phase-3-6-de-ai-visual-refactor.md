# Phase 3.6 De-AI Visual Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将阶段 3.5 的暖色卡片模板重构为白底、细线、编辑型排版的独立产品视觉，同时保持全部推荐和 Provider 边界不变。

**Architecture:** HTML 和组件状态机保持原有边界；展示组件只调整文案与装饰性标记，CSS 通过三角色字体、语义中性色和开放式分区重建层级。展示契约测试固定直接文案和状态语义，Playwright 验证六档响应式、字体回退和完整流程。

**Tech Stack:** HTML5、CSS3、原生 JavaScript ES Modules、Node.js 内置测试运行器、Playwright CLI。

## Global Constraints

- 不修改或合并 `main`，不进入阶段 4。
- 不修改推荐领域逻辑、Provider 合同、定位、存储或隐私规则。
- 不接入真实外卖数据，不伪造价格、距离、ETA、营业或商家信息。
- 不加载远程字体、图片或大型依赖。
- 主操作使用白底、深石墨边框和文字；不使用黑色、蓝色、珊瑚橙、红色实心主按钮或大面积渐变。

---

### Task 1: Direct copy and presentation contract

**Files:**
- Modify: `tests/presentation/feedback-state.test.js`
- Modify: `src/components/feedback.js`
- Modify: `src/components/recommendation-card.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing presentation view model and callbacks
- Produces: unchanged component behavior with direct, non-generic copy

- [x] Add failing tests for initial, loading, empty and success copy.
- [x] Remove decorative result glyphs and generic recommendation phrasing.
- [x] Keep state semantics, callbacks and truthful labels unchanged.

### Task 2: Neutral editorial visual system

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/responsive.css`
- Modify: `docs/design-system.md`

**Interfaces:**
- Consumes: existing semantic HTML and approved Phase 3.6 tokens
- Produces: Display/Body/Mono typography, white surfaces, restrained controls and editorial result layout

- [x] Replace warm palette and gradient with the approved neutral tokens.
- [x] Replace the decorative brand mark with a monochrome CSS line mark.
- [x] Reduce radii, shadows, pills, tinted cards and ornamental motion.
- [x] Convert the decision runway, tags, alternatives and feedback into line-based information regions.
- [x] Preserve the Phase 3.5 breakpoints and mobile action behavior.

### Task 3: Verification

**Files:**
- No production changes unless a failing check is first reproduced

**Interfaces:**
- Consumes: completed Phase 3.6 UI
- Produces: automated and browser evidence

- [x] Run `npm test` and `git diff --check`.
- [x] Check 320px, 390px, 768px, 900px, 1024px and 1440px.
- [x] Exercise quick recommendation, precise filtering, three candidates, swap and all states.
- [x] Verify fonts, focus, console, overflow, resource loading and fallback behavior.
- [x] Remove artifacts and stop before Phase 4.

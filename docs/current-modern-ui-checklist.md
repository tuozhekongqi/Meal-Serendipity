# 现代 UI 当前行为与验收清单

本文记录阶段 3–5 后现代 UI 的当前实现和可重复验收项。它不替代 `current-behavior-checklist.md`；后者永久保留阶段 0 古风单文件版本的历史行为与回滚基线。

## 基线标识

| 项目 | 当前值 |
| --- | --- |
| 核验日期 | 2026-08-17（Asia/Shanghai） |
| 基线分支 | `main` |
| 基线提交 | `a87db1c38a164793af9793f28db22b1fb7d1d622` |
| 页面标题 | `Meal-Serendipity · 今天吃什么` |
| 开发入口 | 根目录 `index.html` |
| 预期生产产物 | Actions 构建的 `dist/` |
| 线上地址 | <https://tuozhekongqi.github.io/Meal-Serendipity/> |
| 数据模式 | `inspiration`，静态菜品灵感 |
| 实时 Provider | 未启用；`PROVIDER_CONFIG.endpoint === null` 且 `liveProvider === null` |

## 当前页面与输入

- 页面使用 Mint 主题、唯一 `h1`“今天吃什么？”、语义化主区域和推荐结果 `aria-live` 区域。
- 首屏提供“马上推荐”和“精准筛选”。“马上推荐”使用当前预选的“省心稳妥”直接请求静态灵感。
- 精准筛选是三步概念流程：第 1 步为当前状态，第 2 步选择最多 3 个口味、填写本次忌口并选择人数，第 3 步确认摘要。
- 当前状态选项为省心稳妥、吃得满足、清淡舒服、换点新鲜。
- 人数选项为 1、2、3、4 人或更多；`4 人或更多` 当前统一保存为 `partySize: 4`。
- 当前 UI 没有位置、总预算、最大距离或最大 ETA 输入，因为没有实时 Provider。不能把这些产品目标描述为当前能力。
- 当前多人输入只是简化人数条件，没有逐人偏好、逐人结果归属或共同确认流程。

## 推荐、反馈与恢复

- 成功状态显示一个主推荐、可验证理由、必要取舍和最多两个替代候选。
- 灵感模式不显示商家、实时价格、距离、ETA、营业、库存或真实下单状态。
- “换一个”和替代候选会在当前安全候选集合中切换；忌口不会在空结果路径中被自动放宽。
- 当前主操作是复制菜名。复制失败时打开可访问对话框供手动复制；它不是外卖平台订单深链。
- “合适”反馈只更新当前页面文案；“不太合适”会换一个。界面明确说明本次反馈不会上传。
- 重置会清除本应用的偏好存储并恢复初始状态。
- 刷新只恢复非敏感口味、人数、当前状态和近期候选历史；忌口原文不写入本地存储。
- 数据说明对话框解释静态灵感、位置、忌口和本地存储边界，并支持 Escape、焦点锁定和关闭后焦点恢复。

## 状态与恢复路径

| 状态 | 当前行为 |
| --- | --- |
| 初始 | 提示先选状态，也可直接马上推荐 |
| 加载 | 禁用当前操作并显示筛选提示；超过 800ms 更新等待文案 |
| 成功 | 显示主推荐、理由、取舍、替代、复制、换一个和本地反馈 |
| 空结果 | 说明条件无合适结果，强调不放宽忌口，并提供修改条件 |
| Provider 降级 | 显示静态灵感及可理解的降级原因 |
| 错误 | 提供重试和重置，不展示原始异常 |

## 自动化证据

基线提交上的 Node 测试共 76 项，覆盖构建和工作流契约、展示真实性、Provider 失败与校验、推荐过滤与稳定性、位置服务、隐私清理和安全存储。

当前 Chromium E2E 共 4 个场景：

1. 快速推荐、静态灵感真实性、换一个和本地反馈；
2. 精准三步流程、忌口仅本次使用和非敏感偏好恢复；
3. 数据说明对话框焦点管理；
4. favicon 与自定义 404。

这些测试运行在本地生成的 `dist/` 和 `/Meal-Serendipity/` 子路径上，不等于线上 CDN smoke test。当前 E2E 尚未覆盖真实 Provider、真实位置授权、真实下单、多人逐人偏好、全部状态注入或跨浏览器矩阵。

### 2026-08-17 阶段 6A 新鲜验证

| 命令 | 结果 |
| --- | --- |
| `npm run check:js` | 通过，检查 44 个 JavaScript/MJS 文件 |
| `npm test` | 通过，76/76 |
| `npm run build` | 通过，生成 `dist/` |
| `npm run check:dist` | 通过，产物白名单符合契约 |
| `npm run test:e2e` | 通过，Chromium 4/4 |
| Markdown 本地链接与结构检查 | 通过，检查本阶段涉及的 6 份 Markdown 文档 |

本地 `dist/index.html` 引用 `./assets/app.css` 和 `./assets/app.js`，为判断线上 artifact 是否一致提供了直接对照。

## GitHub Pages 与线上 smoke test

### GitHub 平台证据

- Pages API 报告 `build_type: workflow`、`status: built`、HTTPS 强制开启且识别自定义 404。
- `Deploy GitHub Pages` 和 `CI` 在提交 `a87db1c` 上均报告成功。
- Pages workflow 的构建步骤声明只上传 `./dist`。
- 2026-08-17 手动运行 `Deploy GitHub Pages` workflow：`32035363958`，目标 `main` 提交为 `a87db1c38a164793af9793f28db22b1fb7d1d622`。
- 该运行生成 Pages artifact `9290461158`，最终成功 deployment 为 `5945925813`；deployment 状态的 `log_url` 指向同一运行的 deploy job。

### 2026-08-17 HTTP 实测

| 检查 | 结果 |
| --- | --- |
| 首页 | HTTP 200，标题为 `Meal-Serendipity · 今天吃什么` |
| 首页主要文案 | HTML 包含“30 秒做决定”“今天吃什么？”和菜品灵感提示 |
| 自定义 404 | 不存在路径返回 HTTP 404，页面标题和“返回首页”链接正确 |
| 首页实际引用 | `/assets/app.css` 和 `/assets/app.js` |
| 构建资源 | `/assets/app.css` 与 `/assets/app.js` 均返回 HTTP 200 |
| favicon | `/favicon.svg` 与 `/favicon.ico` 均返回 HTTP 200 |
| 非生产目录 | `/src/`、`/docs/`、`/tests/` 及抽查文件均返回 HTTP 404 |
| 随机不存在路径 | 返回 HTTP 404，并显示自定义 404 页面 |

早期 smoke test 曾发现线上首页引用 `src/...` 且 `/assets/app.css`、`/assets/app.js` 返回 404。通过手动 `workflow_dispatch` 重新运行 GitHub Actions 部署后，已使用唯一查询参数和 `Cache-Control: no-cache, no-store` 重新核验：**当前线上内容符合 `dist/` artifact 边界。** 本次恢复不修改构建代码或 Pages workflow；后续每次部署仍应重复资源边界检查。

### 真实 Chromium 结果

当前执行环境中的 Chromium 访问线上地址失败：

```text
net::ERR_CONNECTION_CLOSED at https://tuozhekongqi.github.io/Meal-Serendipity/
```

命令行 HTTP 请求可以访问站点，因此该错误不能证明站点对所有用户不可用；但快速推荐、精准筛选和移动布局均未能在**线上地址**通过当前 Chromium 实测。它们只能由本地 `dist/` E2E 提供证据，线上端到端可用性仍待另一网络确认。

### 用户侧复测清单

请使用手机流量或另一条可访问 GitHub Pages 的网络检查：

- [ ] 首页返回并显示标题“今天吃什么？”，没有空白页。
- [ ] 浏览器开发者工具中首页 HTML 引用 `/assets/app.css` 和 `/assets/app.js`，不再引用 `/src/`。
- [ ] 所有 CSS、JavaScript、`favicon.svg` 和 `favicon.ico` 返回 200。
- [ ] 任意不存在路径显示自定义 404，并可返回首页。
- [ ] “马上推荐”能显示一个菜品灵感、理由、替代项和复制操作。
- [ ] 精准筛选可完成口味、忌口、人数和确认步骤；刷新后忌口原文为空。
- [ ] 在约 320px 和 390px 宽度下无页面级横向滚动，底部操作可见且不遮挡内容。
- [ ] 数据说明对话框可以关闭，键盘焦点返回触发按钮。
- [ ] 控制台没有新增错误或警告，网络面板没有失败的运行时资源。

## 分支保护与发布治理

2026-08-17 初次查询时，`main` 返回 `Branch not protected` 且仓库 ruleset 列表为空。阶段 6A 使用仓库管理员权限配置了 branch protection，并在写入后重新读取确认：

1. 所有变更必须通过 Pull Request；
2. 必需状态检查为 `validate`（工作流名 `CI`）；
3. `strict: true`，合并前分支必须包含最新目标分支状态；
4. `enforce_admins: true`，管理员也不能绕过保护；
5. 禁止 force push 和删除 `main`；
6. 当前批准 review 数量为 0，适配单维护者仓库；有稳定审查者后建议改为至少 1 个批准。

仓库仍没有 ruleset；当前保护由经典 branch protection 提供。需要通过本阶段的实际 Pull Request 再验证界面上的合并门槛和 `validate` 必需检查是否按预期生效。

## 已知限制

- 阶段 4 尚未完成；没有合法实时数据服务和公开 endpoint。
- 阶段 6A 只完成指标、隐私与离线评估设计；没有 analytics 代码，也没有遥测数据。
- 静态灵感的复制、换一个或反馈不能解释为真实订单接受或转化。
- 当前多人能力没有逐人偏好和结果归属，不能据此证明多人决策效果。
- artifact 不一致问题已通过手动 GitHub Actions 部署重新发布并完成线上核验，当前线上内容符合 `dist/` artifact 边界。
- 当前环境无法用 Chromium 完成线上交互与移动端 smoke test。
- `main` 已配置 PR 和 `validate` 必需检查，但当前不要求批准 review；PR #2 已证明 `validate` 会运行并通过，真实移动网络 smoke test 仍未完成。

## 重复验收清单

- [ ] `origin/main` SHA、Pages deployment SHA 与文档基线一致。
- [ ] `npm run check:js`、`npm test`、`npm run build` 和 `npm run check:dist` 通过。
- [ ] `npm run test:e2e` 在 Chromium 通过。
- [ ] 本地 `dist/` 只包含产物白名单文件。
- [ ] 线上首页引用构建后的 `assets/`，不暴露 `src/`、`tests/` 或 `docs/`。
- [ ] 线上首页、favicon、404、快速推荐、精准筛选和移动布局通过。
- [ ] 灵感模式不出现实时商家、价格、距离、ETA、营业、库存或下单声明。
- [ ] 忌口原文不进入本地存储、URL、日志或未来事件设计。
- [ ] 分支保护和必需检查状态与本清单一致。

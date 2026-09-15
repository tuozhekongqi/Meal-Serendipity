# 现代 UI 当前行为与验收清单

本文记录阶段 3–5 及阶段 3.7 场景发现流程的当前实现和可重复验收项。它不替代 `current-behavior-checklist.md`；后者永久保留阶段 0 古风单文件版本的历史行为与回滚基线。

## 基线标识

| 项目 | 当前值 |
| --- | --- |
| 核验日期 | 2026-09-15（Asia/Shanghai） |
| 当前功能分支 | `codex/phase-3-7-scenario-discovery` |
| Task 12 验收起点 | `eb3534466cae598ebc69273bd0b4fe8b28e46855` |
| 最终审查修复起点 | `3e00524a893828` |
| 页面标题 | `Meal-Serendipity · 人间有味是清欢` |
| 开发入口 | 根目录 `index.html` |
| 预期生产产物 | Actions 构建的 `dist/` |
| 线上地址 | <https://tuozhekongqi.github.io/Meal-Serendipity/> |
| 数据模式 | `inspiration`，静态菜品灵感 |
| 实时 Provider | 未启用；`PROVIDER_CONFIG.endpoint === null` 且 `liveProvider === null` |

当前功能分支的本地通过不等于线上地址已包含阶段 3.7；线上仍以实际部署的 `main` artifact 为准。

## 当前页面与输入

- 页面有唯一 `h1`“人间有味是清欢”和流程标题“循味而选”，同时用说明文案解释任务；页面包含语义化主区域、真实表单、推荐结果 `aria-live` 区域和可访问进度列表。
- 已验证流程为“用餐人数 → 用餐场景 → 用餐方式（仅多人）→ 偏好 → 结果”。新流程不预选人数，显式选择前下一步禁用；单人不会出现用餐方式步骤。
- 人数选项为 1、2、3、4 人以上；4 人以上必须继续输入 4–50 的实际人数，并生成稳定的匿名用餐者槽位。
- 单人提供快速用餐、学习或工作、犒赏自己、深夜加餐、偏好清淡、节省预算场景；多人提供多人聚餐、分别点餐、口味各异、家庭用餐、约会或庆祝场景。
- 多人必须显式选择共享菜品、每人单独选择、同一菜系分别选菜或“暂未决定”，不会根据场景静默决定。
- 偏好使用静态预算倾向、口味和本次忌口；多人按匿名用餐者分别填写，不收集姓名。
- 单选框和口味筹码更新后按稳定控件 ID 恢复焦点；3 人流程和多次逐人口味选择均不会把焦点丢到 `body`。前进、返回和结果切换仍聚焦新步骤或结果标题。
- 当前 UI 没有位置、实时总预算、最大距离或最大 ETA 输入，因为没有实时 Provider。不能把这些产品目标描述为当前能力。
- 根节点只使用一个 `data-theme`；六个主题是 `quick`、`focus`、`lighter`、`gathering`、`celebration` 和 `late-night`，没有公开主题切换器或主题持久化。

## 推荐、反馈与恢复

- 成功状态显示一个带主图的首选结果，并按“菜品介绍、推荐依据、食用提示”组织信息；最多显示两个完整替代方向。
- 单人结果为 `single`；多人结果按真实结构显示 `shared_bundle`、`individual_set`、`same_cuisine_set`，候选不足或方式未定时显示带诊断和归属缺口的 `compromise`。
- 共享组合保留菜品角色；单点和同菜系结果保留每位匿名用餐者的归属。同菜系模式使用相同主菜系的不同候选，不会重复菜品补齐。多人首选还有独立方案摘要和方案证据；符合条件的供给足够时，替代也是完整且互不重复的方案，供给不足会显示缺口。
- “暂未决定”的首选明确为折中方向，两个替代分别是真实共享方案和逐人方案，不再把普通菜品伪装成多人方向。
- 场景评分包含场景、真实口味命中、灵感预算档和多人结构分量。逐人口味理由只由该用餐者的实际匹配产生；共享方案的口味覆盖按所有已选菜品和已填写用餐者计算。
- 灵感模式不显示商家、实时价格、距离、ETA、营业、库存或真实下单状态。
- “换一个”会进入下一批符合条件的候选；“选择这个方案”在本地整体提升现有方案并把旧首选放回替代列表，不重新请求 Provider。忌口不会在空结果路径中被自动放宽。
- 当前主操作是已接线的复制菜名。复制失败时打开可访问对话框供手动复制；它不是外卖平台订单深链。
- “合适”反馈只更新当前页面文案；“不太合适”会换一个。界面明确说明本次反馈不会上传。
- 重置会清除本应用的偏好存储并恢复初始状态。
- 本地存储包是 `version`、`savedAt` 和 `preferences`；`preferences` 精确只有 `partySize`、`totalBudgetCents`、`maxDistanceMeters`、`maxDeliveryMinutes`、`tastePreferences`、`currentPriority`、`recentHistory`、`contextTags` 和 `location`。`location` 只保留手动区域名与 `source: "manual"`，没有区域名时为 `null`；精确坐标与忌口原文不写入。
- 刷新后流程回到人数步，可恢复上述安全字段中的显式人数、合法单人口味和近期候选历史等值。多人逐人口味只存在于本次 `dinerProfiles`，顶层 `tastePreferences`、本地存储和 Provider 投影都保持为空。`mealScene`、`diningMode`、`inspirationBudgetTier`、`dinerDrafts`、逐人口味/偏好与 `exclusions` **都不会在刷新后恢复**；多人需重新填写每位食客。`currentPriority` 是旧排序上下文字段（当前静态 UI 中为默认 `balanced`），不是当前用餐场景，不得代替 `mealScene` 表述场景恢复。
- “数据与隐私”对话框解释本地清单、位置、忌口和本地存储边界，并支持 Escape、焦点锁定和关闭后焦点恢复。

### 图片真实性

- `assets/dishes/` 有 12 个为本项目生成并人工检查的 1200×900 WebP，以及一个中性 `placeholder.svg`；全部为本地资源，不代表商家或可下单商品。
- 只有 9 个菜名有具体图片映射：照烧鸡腿饭、烧烤烤串、卤味拼盘、卤香干、低脂轻食沙拉、牛油果鸡胸碗、蛋白能量碗、广式云吞汤、红酒烩牛肉。
- 其余 166/175 道菜使用中性占位图。缺失图片、远程 URL、无效路径、无效 `kind` 和浏览器加载错误均回退到同一占位图。
- `dist/assets/dishes/` 的允许集合精确为上述 12 个 WebP 加 `placeholder.svg`；运行时 manifest 不能扩大该集合。

## 状态与恢复路径

| 状态 | 当前行为 |
| --- | --- |
| 初始 | 要求先选择用餐人数；单人继续选场景，多人还需选择用餐方式 |
| 加载 | 禁用当前操作并显示筛选提示；超过 800ms 更新等待文案 |
| 成功 | 显示菜品介绍、推荐依据、食用提示、具名替代、复制、换一个和本地反馈 |
| 空结果 | 说明条件无合适结果，强调不放宽忌口，并提供修改条件 |
| Provider 降级 | 显示菜品参考及可理解的降级原因 |
| 错误 | 保留条件并提供重试和返回，不展示原始异常 |

## 自动化证据

隔离的 `origin/main` 基线是 76 项 Node 测试，不是 90 项。单独且未合入的 `codex/phase-6a-metrics-privacy` 分支拥有自己的 90-test/28-sample 证据；该证据不计入本功能分支基线，也未被 cherry-pick。

阶段 3.7 Task 12 当前分支的新鲜本地结果：

| 命令 | 结果 |
| --- | --- |
| `npm run check:js` | 通过，59 个 JavaScript/MJS 文件 |
| `npm test` | 通过，175/175 |
| `npm run build` | 通过，生成 `dist/` |
| `npm run check:dist` | 通过，精确产物白名单符合契约 |
| `npm run test:e2e` | 通过，Chromium 25/25 |

25 个 Chromium 场景覆盖获批文案、绿色完成进度、人数必选与非默认人数、全部多人用餐方式的完整首选/两项替代结构、逐人口味和约束证据、方案替代整体提升、复制菜名、键盘多选与重绘焦点保留、focus/lighter 固定条件的不同结果、返回保留、严格空结果、换一个累计排除与耗尽、非敏感恢复、对话框 Tab 环绕/Escape/焦点返回、320/390/768/1024/1440、六主题、减少动效、200% 缩放等效布局、favicon 和 404。错误重试/返回使用真实反馈组件与请求生命周期测试，因为静态 Provider 没有自然错误入口且禁止生产测试 hook。

这些测试运行在本地生成的 `dist/` 和 `/Meal-Serendipity/` 子路径上，不等于线上 CDN 或真实移动网络 smoke test。它们不覆盖真实 Provider、真实位置授权、真实下单或跨浏览器矩阵。

### 2026-08-17 `origin/main` 历史验证

| 命令 | 结果 |
| --- | --- |
| `npm run check:js` | 通过，检查 44 个 JavaScript/MJS 文件 |
| `npm test` | 通过，76/76 |
| `npm run build` | 通过，生成 `dist/` |
| `npm run check:dist` | 通过，产物白名单符合契约 |
| `npm run test:e2e` | 通过，Chromium 4/4 |
| Markdown 本地链接与结构检查 | 通过，检查本阶段涉及的 6 份 Markdown 文档 |

这份 76/76、4/4 记录是隔离 `origin/main` 的历史基线，不是 90 项测试，也不是上面的阶段 3.7 当前分支结果。本地 `dist/index.html` 引用 `./assets/app.css` 和 `./assets/app.js`，为判断线上 artifact 是否一致提供了直接对照。

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

命令行 HTTP 请求可以访问站点，因此该错误不能证明站点对所有用户不可用；但主推荐流程和移动布局均未能在**线上地址**通过当前 Chromium 实测。阶段 3.7 只能由本地 `dist/` E2E 提供证据，线上端到端可用性仍待另一网络确认。

### 用户侧复测清单

请使用手机流量或另一条可访问 GitHub Pages 的网络检查：

- [ ] 首页返回并显示标题“今天吃什么？”，没有空白页。
- [ ] 浏览器开发者工具中首页 HTML 引用 `/assets/app.css` 和 `/assets/app.js`，不再引用 `/src/`。
- [ ] 所有 CSS、JavaScript、`favicon.svg` 和 `favicon.ico` 返回 200。
- [ ] 任意不存在路径显示自定义 404，并可返回首页。
- [ ] 人数 → 场景 → 用餐方式（仅多人）→ 偏好可到达真实灵感结果。
- [ ] 单人、共享菜、每人单点、同菜系不同菜和“还没想好”分别显示与其结构一致的结果；刷新后忌口原文为空。
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
- 当前分支没有后端、analytics 代码、分析 SDK、遥测 endpoint、上传或遥测数据。
- 阶段 6B 未开始，暂不开始 6B。
- 静态灵感的复制、换一个或反馈不能解释为真实订单接受或转化。
- 当前多人能力保留匿名逐人偏好与结果归属，但没有真实订单、共同确认或线上效果数据，不能据此证明多人决策效果。
- artifact 不一致问题已通过手动 GitHub Actions 部署重新发布并完成线上核验，当前线上内容符合 `dist/` artifact 边界。
- 当前环境无法用 Chromium 完成线上交互与移动端 smoke test。
- `main` 已配置 PR 和 `validate` 必需检查，但当前不要求批准 review；PR #2 已证明 `validate` 会运行并通过，真实移动网络 smoke test 仍未完成。

## 重复验收清单

- [ ] `origin/main` SHA、Pages deployment SHA 与文档基线一致。
- [ ] `npm run check:js`、`npm test`、`npm run build` 和 `npm run check:dist` 通过。
- [ ] `npm run test:e2e` 在 Chromium 通过。
- [ ] 本地 `dist/` 只包含产物白名单文件。
- [ ] 线上首页引用构建后的 `assets/`，不暴露 `src/`、`tests/` 或 `docs/`。
- [ ] 线上首页、favicon、404、阶段 3.7 主流程和移动布局通过。
- [ ] 灵感模式不出现实时商家、价格、距离、ETA、营业、库存或下单声明。
- [ ] 忌口原文不进入本地存储、URL、日志或未来事件设计。
- [ ] 分支保护和必需检查状态与本清单一致。

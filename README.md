# Meal-Serendipity

Meal-Serendipity 是一个帮助用户快速决定“今天吃什么”的中文外卖推荐项目。目标是在约 30 秒内，根据预算、口味、距离、配送时间和当前状态给出一个首选，并具体说明推荐理由与取舍。

当前没有获批的实时外卖 Provider，页面使用仓库内 175 条静态菜品作为灵感。静态灵感不会展示或暗示真实商家、实时价格、距离、ETA、营业、库存或可下单状态。

阶段 3.7 的当前功能分支已经实现并通过本地验收：用户按“用餐人数 → 用餐场景 → 用餐方式（仅多人）→ 偏好 → 结果”完成决策。它仍是纯前端灵感体验，不代表这些变更已经部署到线上 `main`。

## 在线访问与发布现状

- 线上地址：<https://tuozhekongqi.github.io/Meal-Serendipity/>
- GitHub Pages API 当前报告 Source 为 `GitHub Actions`
- `main` 更新后，`.github/workflows/pages.yml` 会运行语法、单元/契约、构建、产物和 Chromium E2E 检查；全部成功后声明只上传生成的 `dist/`
- 最近一次配置核验见 [现代 UI 当前行为清单](docs/current-modern-ui-checklist.md)

根目录 `index.html` 仍是开发源入口和 branch deployment 回滚来源。2026-08-17 通过 [手动 GitHub Actions 部署](https://github.com/tuozhekongqi/Meal-Serendipity/actions/runs/32035363958) 重新发布 `main` 提交 `a87db1c38a164793af9793f28db22b1fb7d1d622` 后，线上首页已引用 `assets/app.css` 和 `assets/app.js`，源码目录返回 404。当前线上内容符合 `dist/` artifact 边界；真实移动网络 smoke test 仍未完成。

## 当前体验

- 第一步必须选择人数；`4 人以上` 会继续要求输入 4–50 的准确人数。
- 单人选择场景后直接进入偏好；多人还必须在“共享菜、每人单点、同菜系不同菜、还没想好”四种用餐方式中显式选择。
- 偏好按匿名食客保留口味与本次忌口，结果按 `single`、`shared_bundle`、`individual_set`、`same_cuisine_set` 或诚实降级的 `compromise` 表达归属。
- 结果突出一个主决定、结构化理由、已通过约束、必要取舍和最多两个替代候选；支持换一个、反馈、返回修改条件、重置和数据说明对话框。
- 换一个会累计排除本次已经展示的候选；候选耗尽时不会放宽忌口或过敏原。
- 刷新只恢复允许的非敏感偏好；忌口原文不会进入本地存储。

页面使用 `quick`、`focus`、`lighter`、`gathering`、`celebration` 和 `late-night` 六个场景主题，并通过根节点唯一的 `data-theme` 切换。结果以图片为首要层级，但图片契约刻意保守：仓库包含 12 个为本项目生成并人工审阅的 WebP 资产，只有 9 个菜名拥有人工确认的具体图片映射；其余 166/175 道菜使用中性 `placeholder.svg`，避免用相似品类图片冒充具体菜品。这不是“175 道菜均有实拍图”的覆盖。

## 本地运行

需要 Node.js 22 或兼容版本。

```powershell
npm install
npm run build
node scripts/serve-static.mjs --root=dist --base-path=/Meal-Serendipity/ --port=4174
```

访问 <http://127.0.0.1:4174/Meal-Serendipity/>。

开发时也可使用任意静态服务器直接提供仓库根目录；生产与端到端检查始终以 `dist/` 为准。

## 验证命令

```powershell
npm run check:js
npm test
npm run build
npm run check:dist
npx playwright install chromium
npm run test:e2e
```

- `check:js`：对项目 JavaScript 和 MJS 文件运行 Node 语法检查。
- `npm test`：运行推荐、Provider、服务、展示、构建及工作流契约测试。
- `build`：打包浏览器 JavaScript，合并样式并生成干净的 `dist/`。
- `check:dist`：确认生产目录只含允许的运行时文件。
- `test:e2e`：在 `/Meal-Serendipity/` 子路径下用 Chromium 走通推荐和关键交互。

## 技术栈

- HTML5、CSS3、原生 JavaScript ES Modules
- Node.js 内置测试运行器
- esbuild，仅用于生成浏览器生产包
- Playwright，用于构建产物端到端检查
- `localStorage` / `sessionStorage`，仅保存契约允许的非敏感状态
- GitHub Actions 与 GitHub Pages 静态托管

项目无后端、无账号、无 analytics/SDK/事件上传/遥测，也没有生产运行时 npm 依赖。当前页面不请求精确位置，也未连接真实商家、价格、距离、ETA、库存或下单数据。阶段 6B 未开始，暂不开始 6B。

## 项目结构

```text
Meal-Serendipity/
├── .github/workflows/
│   ├── ci.yml                       # PR 自动检查
│   └── pages.yml                    # dist 构建与 Pages 部署
├── docs/                            # 产品、设计、契约和实施文档
├── scripts/
│   ├── build-pages.mjs              # 确定性 Pages 构建
│   ├── check-dist.mjs               # 生产产物白名单检查
│   ├── check-js.mjs                 # JavaScript 语法检查
│   └── serve-static.mjs             # 子路径静态测试服务器
├── src/
│   ├── components/                  # 页面组件与状态呈现
│   ├── data/                        # 175 条静态菜品
│   ├── domain/                      # 推荐领域模型
│   ├── presentation/                # 推荐展示模型
│   ├── providers/                   # live / inspiration Provider 边界
│   ├── recommendation/              # 过滤、评分、解释与推荐编排
│   ├── services/                    # 上下文、定位、存储与隐私清理
│   ├── styles/                      # token、基础、组件与响应式样式
│   └── main.js                      # 浏览器入口
├── tests/
│   ├── build/                       # 构建和工作流契约
│   ├── e2e/                         # Playwright 推荐流程
│   └── ...                          # 领域、Provider、服务与展示测试
├── 404.html                         # GitHub Pages 自定义 404
├── favicon.svg                      # 页面图标源文件
├── index.html                       # 开发入口与回滚基线
├── package.json
└── playwright.config.js
```

`dist/` 是生成目录，不是手工编辑的源码，也不应提交。当前精确允许列表为：

```text
dist/404.html
dist/favicon.ico
dist/favicon.svg
dist/index.html
dist/assets/app.css
dist/assets/app.js
dist/assets/dishes/braised.webp
dist/assets/dishes/celebration.webp
dist/assets/dishes/dessert.webp
dist/assets/dishes/grill.webp
dist/assets/dishes/hotpot.webp
dist/assets/dishes/light-meal.webp
dist/assets/dishes/noodles.webp
dist/assets/dishes/placeholder.svg
dist/assets/dishes/plated.webp
dist/assets/dishes/rice-bowl.webp
dist/assets/dishes/sharing.webp
dist/assets/dishes/snacks.webp
dist/assets/dishes/soup.webp
```

构建和产物检查脚本分别维护同一份显式白名单；运行时图片元数据不能扩大可发布文件集合。

## CI 与 GitHub Pages 发布

Pull Request 会自动执行语法检查、全部 Node 测试、生产构建、产物检查和 Chromium E2E。任何一步失败，检查不会通过。

`main` 已配置 branch protection：变更必须通过 Pull Request，`validate` 检查必须成功且分支保持最新，管理员也不能绕过；当前单维护者配置暂不要求批准 review。

`pages.yml` 只在 `main` 更新或手动触发时运行。部署任务依赖成功的构建任务，并通过 `actions/upload-pages-artifact` 仅上传 `./dist`。

Pages API 当前报告 Source 为 `GitHub Actions`。手动部署运行 `32035363958`、deployment `5945925813` 和 Pages artifact `9290461158` 已完成线上资源核验。每次后续部署仍需确认首页、资源、favicon、404 和关键流程；Actions 成功不能替代目标网络环境的线上 smoke test。

回滚步骤：

1. 将 Pages Source 改回 `Deploy from a branch`。
2. 选择 `main` 和 `/ (root)`。
3. 重新检查线上入口。根目录入口被保留，可继续承担旧发布方式。

## 数据、隐私与协作规则

- `live` 只能显示合法数据服务实际提供且未过期的真实字段。
- `inspiration` 只提供菜品灵感，不伪造实时信息。
- 精确位置只允许在用户主动发起并明确同意的实时请求内存中使用，不能持久化。
- 忌口原文不能写入本地存储、日志、仓库或分析系统。
- 真实手机移动网络 smoke test 仍是独立待办；本地 Chromium E2E 不能替代该网络环境检查。
- 阶段 6B 为“未开始 / 暂不开始 6B”；没有隐含的 analytics 或外部发布步骤。
- 修改前阅读 [AGENTS.md](AGENTS.md)；不要直接修改 `main`。
- 数据边界见 [docs/data-source-contract.md](docs/data-source-contract.md)，现有行为基线见 [docs/current-behavior-checklist.md](docs/current-behavior-checklist.md)。

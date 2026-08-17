# Meal-Serendipity · 一餐之缘

Meal-Serendipity 是一个面向“今天吃什么”决策疲劳的中文外卖推荐项目。

项目已确认的目标是：用户打开网页后，在约 30 秒内得到一个符合预算、口味、距离、配送时间和当前状态的推荐，并知道为什么推荐这个结果。

> 当前状态：仓库仍运行原有的单文件菜品灵感版本。现代化 UI、解耦推荐引擎和实时外卖候选尚未实施，不能把当前结果理解为真实商家、库存、距离或 ETA。

## 在线访问

- GitHub Pages：<https://tuozhekongqi.github.io/Meal-Serendipity/>
- 当前页面标题：`一餐之缘 · 今日何食`
- 当前发布方式：`main` 分支根目录的 legacy branch deployment

## 当前可用功能

- 从 175 条本地静态菜品数据中生成结果；无需后端或第三方 API。
- “开启今日一餐”进入完整表单，收集人数、总预算档、场景、逐人口味、逐人主食类型、饮食避讳和天气。
- “随便 · 不问口味”默认按 1 人、自由预算直接摇签。
- 完整流程可选择“精择 · 三案呈上”或“随缘 · 摇一签”。
- 三案分别提供首选、稳妥和尝鲜；摇签可在预算内或随心抽取。
- 选定后生成美团外卖与淘宝闪购的关键词搜索入口，也可复制菜名。
- 表单、避讳、最近菜品和最后下单页保存在浏览器本地。

当前推荐是“菜品灵感”，不是实时外卖候选。更完整的现状和已知限制见 [当前行为检查清单](docs/current-behavior-checklist.md)。

## 本地运行

当前仓库无需安装运行时依赖或执行构建；`package.json` 仅提供 Node.js 推荐逻辑测试命令。

最简单的方式是直接打开根目录 `index.html`。为获得与 GitHub Pages 更接近的 HTTP 环境，建议使用静态服务器：

```powershell
git clone https://github.com/tuozhekongqi/Meal-Serendipity.git
cd Meal-Serendipity
py -m http.server 8000
```

然后访问 <http://127.0.0.1:8000/>。macOS/Linux 可使用 `python3 -m http.server 8000`。

## 当前技术栈

- HTML5、CSS3、原生 JavaScript
- 根入口仍为 `index.html`，布局、样式和旧页面兼容逻辑保持内联；纯推荐领域模块位于 `src/`
- `localStorage` / `sessionStorage` 保存浏览器本地状态
- 无运行时依赖、无构建工具、无后端、无遥测；测试使用 Node.js 内置测试运行器
- GitHub Pages 静态托管

## 项目结构

```text
Meal-Serendipity/
├── AGENTS.md                         # 长期协作与质量规则
├── README.md                         # 项目入口说明
├── index.html                        # 当前生产入口与完整单文件应用
├── docs/
│   ├── product-brief.md              # 已确认的产品定位与范围
│   ├── design-system.md              # 已确认的极简智能型设计方向
│   ├── implementation-plan.md        # 7 个阶段的实施计划
│   ├── current-behavior-checklist.md # 当前行为与回滚基线
│   └── data-source-contract.md       # 实时/灵感候选数据契约
└── 一餐之缘_分享版/
    └── index.html                    # 独立历史分享副本，非生产权威源
```

根目录 `index.html` 是当前生产权威源。不要默认同步或从 `一餐之缘_分享版/index.html` 覆盖它。

## 数据与推荐边界

当前菜品记录包含名称、口味、类型、价格档、天气倾向、大众/小众标记、食材关键词和一句描述。推荐先按避讳、主味与主食类型过滤，再按口味优先级、主食、预算、天气、场景、多人状态和历史结果评分。

未来将支持两种明确模式：

- `live`：只展示合法数据服务提供且未过期的真实商家、价格、距离、ETA 与可售状态。
- `inspiration`：使用本地菜品库提供灵感，不展示或暗示不存在的实时字段。

具体请求、响应、超时、缓存、错误和隐私要求见 [数据源契约](docs/data-source-contract.md)。

## 开发与验证

开始修改前先阅读 [AGENTS.md](AGENTS.md) 和本次阶段对应的实施计划。当前基线可按以下方式复核：

1. 启动静态服务器并确认首页返回 200。
2. 按 [当前行为检查清单](docs/current-behavior-checklist.md) 走通快速摇签、完整表单、多人、避讳、三案、刷新恢复和下单入口。
3. 检查 320px、390px、768px、1440px 四档视口。
4. 检查控制台和失败资源。
5. 运行 `git diff --check`，确认只有计划内文件变化。

推荐领域测试可直接运行：

```powershell
npm test
```

阶段 1 已建立推荐领域模块和确定性测试；端到端测试、构建流程和 GitHub Actions 仍留在后续获批阶段。

## 产品与实施路线

- [产品简报](docs/product-brief.md)
- [设计系统](docs/design-system.md)
- [实施计划](docs/implementation-plan.md)

实施共 7 个阶段，阶段之间必须独立审查和回滚。不要直接修改 `main`；默认从最新 `main` 创建 `codex/` 分支并通过 Pull Request 合并。

## 隐私与安全

- 当前版本没有账号、后端或遥测，数据保存在用户浏览器。
- 当前版本不请求或保存精确位置；下单平台可能在跳转后自行请求定位。
- 未来精确位置只能用于用户主动发起的当前实时请求，不能写入本地持久化、仓库或分析日志。
- 任何第三方私密凭证都不得进入前端或 GitHub Pages 构建产物。

# 阶段 3.7：场景化推荐与美食发现视觉重构设计

状态：待实施
确认方案：场景画像 + 菜品发现元数据 + 多人方案编排器
基线：`origin/main`（`82faac1`）

## 目标

将当前以四种抽象优先级为入口的三步筛选，改为以真实用餐情境为主线的决策流程：

```text
人数 → 使用场景 → 多人用餐方式 → 预算与口味 → 推荐结果
```

结果页从纯文本推荐卡升级为“场景化菜品发现”，通过本地菜品图片、明确的人数和场景标签、真实推荐理由、约束与取舍，帮助用户在约 30 秒内形成一个可理解的用餐方向。

## 阶段边界

本阶段只使用仓库内静态菜品灵感：

- 不开始阶段 6B；
- 不增加 analytics、SDK、事件端点、行为上传或遥测接口；
- 不接入真实外卖平台、商家、实时价格、距离、ETA、库存或可售状态；
- 不修改真实 Provider 的请求、响应或降级行为；
- 不修改现有隐私规则，忌口原文仍只在当前页面内使用；
- 不将静态价格档展示为真实价格；
- 不修改历史分享版 `一餐之缘_分享版/index.html`。

## 设计原则

1. 场景是推荐领域输入，不是仅改变背景色的 UI 状态。
2. 推荐逻辑继续与 DOM、存储和 Provider 解耦。
3. 多人结果必须保留逐人偏好和结果归属，不把所有人平均成同一道菜。
4. 忌口与过敏相关字段继续作为不可放宽的硬约束。
5. 所有推荐理由必须由实际过滤、评分或组合证据产生。
6. 图片只表达菜品灵感，不暗示商家、库存、可下单或实际成品。
7. 默认仍突出一个首选方向，替代候选只说明可验证差异。

## 用户流程

### 步骤 1：人数

固定选项为：

- 1 人；
- 2 人；
- 3 人；
- 4 人以上。

选择“4 人以上”后显示具体人数输入，最小为 4，最大沿用领域模型的 50 人上限。具体人数用于创建匿名成员偏好槽和确定组合规模，不收集姓名。

### 步骤 2：使用场景

单人只显示：

- 快速解决；
- 学习 / 工作；
- 想吃点好的；
- 深夜加餐；
- 清淡一点；
- 今天想省钱。

多人只显示：

- 一起聚餐；
- 各点各的；
- 口味不太一样；
- 家庭用餐；
- 约会 / 庆祝。

人数从单人切到多人或反向切换时，若原场景不再合法，则清除场景和用餐方式；预算、口味和本次忌口保持不变。场景切换会清除已生成的旧结果，防止显示与新条件不一致的推荐。

### 步骤 3：多人用餐方式

仅多人显示，并要求明确选择：

- 一起吃共享菜；
- 每个人单独点；
- 主菜统一，口味各自不同；
- 还没想好。

使用场景可以把最相关的用餐方式排在前面，但不得替用户自动确认。例如“各点各的”优先展示“每个人单独点”，仍需用户选择。

### 步骤 4：预算与口味

预算使用非货币化的灵感档位：

- 省一点；
- 日常；
- 吃好一点；
- 不限定。

帮助文案明确说明预算档只用于比较静态菜品灵感，不代表真实售价、配送费或订单总额。现有 `estimatedPriceRangeCents` 继续只作为内部兼容数据，不在灵感 UI 展示。

单人填写一组口味与本次忌口。多人使用匿名成员槽，如“第 1 位”“第 2 位”：

- 每位成员可选择自己的口味；
- 不收集姓名或联系方式；
- 共享菜和统一主菜使用所有成员忌口的并集进行硬过滤；
- 每人单独点时保留每位成员的偏好、忌口和结果归属；
- 忌口原文不进入 `localStorage`、Provider 请求、URL、日志或任何上传路径。

### 步骤导航

- 每一步都有返回按钮；
- 返回后保留已填条件；
- 单人流程跳过多人用餐方式，但返回顺序仍正确；
- 结果页提供“返回修改条件”；
- 结果摘要允许直接返回人数、场景或预算与口味步骤；
- 恢复焦点到新步骤标题，移动端按需滚动到表单顶部；
- 不使用仅靠颜色或装饰性箭头表达流程状态。

## 领域模型

### UserContext 扩展

在现有 `UserContext` 上增加：

```js
mealScene
diningMode
inspirationBudgetTier
partySizeBucket
dinerProfiles
```

建议枚举：

```text
mealScene:
  solo_quick
  solo_focus
  solo_treat
  solo_late_night
  solo_lighter
  solo_save
  group_gathering
  group_individual
  group_mixed_taste
  group_family
  group_celebration

diningMode:
  shared
  individual
  shared_main_personal
  undecided

inspirationBudgetTier:
  economy
  everyday
  generous
  open
```

`dinerProfiles` 使用匿名稳定 ID：

```js
{
  id: 'diner-1',
  tastePreferences: [],
  exclusions: []
}
```

`createUserContext()` 负责限定枚举、人数和数组长度。`toProviderRequest()` 不增加这些阶段 3.7 字段，确保真实 Provider 契约不变；契约测试需要证明这些字段不会泄漏到请求。

### Candidate 图片字段

为 `item` 增加可选字段：

```js
image: {
  src: './assets/dishes/rice-bowl.webp',
  alt: '米饭类菜品灵感示意图',
  kind: 'dish-inspiration'
} | null
```

保留现有 `imageUrl` 字段以兼容未来真实 Provider。本阶段的灵感展示只消费经过数据层确认的本地 `image`，不得把任意远程 URL 直接传给 DOM。

### 静态菜品发现元数据

静态候选增加：

```js
metadata: {
  cuisineTags: [],
  servingRoles: [],
  supportedDiningModes: [],
  discoveryTraits: {
    convenient,
    stable,
    filling,
    mild,
    lighter,
    shareable,
    expressive,
    comforting,
    lateNight,
    varietyFriendly
  },
  imageKey
}
```

属性值为有限、可审计的等级，不由评分层根据菜名临时猜测。类别默认值和少量菜品覆盖值放在数据模块中，原始 175 条菜品仍保留唯一名称、口味、品类、内部价格档和忌口字段。

## 场景画像与评分

新增纯数据模块 `scenario-profiles.js`。每个画像定义：

- 可用人数类型；
- 推荐权重；
- 期望发现属性；
- 建议用餐方式排序；
- 可展示的理由代码；
- 对应页面主题。

场景影响如下：

| 场景 | 主要评分证据 |
| --- | --- |
| 快速解决 | convenient、stable，降低过度丰富度的影响 |
| 学习 / 工作 | convenient、filling、mild |
| 想吃点好的 | expressive、丰富度、品质倾向 |
| 深夜加餐 | lateNight、comforting、convenient |
| 清淡一点 | lighter、mild、清淡口味匹配 |
| 今天想省钱 | 内部 priceTier 与预算档匹配，提高预算分量 |
| 一起聚餐 | shareable、组合角色互补 |
| 各点各的 | 个体口味、候选差异和结果归属 |
| 口味不太一样 | varietyFriendly、共同菜系或折中能力 |
| 家庭用餐 | shareable、mild、覆盖面 |
| 约会 / 庆祝 | expressive、丰富度和组合完整性 |

旧调用没有 `mealScene` 时继续使用现有 `CURRENT_PRIORITY` 权重，避免非阶段 3.7 场景产生无关回归。新场景路径仍通过 `scoreCandidate()` 和 `rankCandidates()` 返回分项证据，并维持候选 ID 的确定性同分排序。

灵感预算只比较 `inspirationBudgetTier` 与 `metadata.priceTier`，不制造 `pricing.totalCents`，也不生成“真实价格在预算内”的理由。

## 推荐理由

增加与实际贡献对应的理由代码，例如：

- `quick_reliable_match`；
- `focus_friendly_match`；
- `lighter_scene_match`；
- `late_night_comfort_match`；
- `inspiration_budget_match`；
- `shareable_match`；
- `individual_taste_match`；
- `same_cuisine_variety`；
- `celebration_expression_match`。

只有相应评分分量达到明确阈值时才显示理由。清淡相关文案只描述菜品数据中的清淡、蔬菜或粗粮倾向，不作营养、减脂或医学保证。

灵感候选始终保留取舍：

```text
这是静态菜品灵感，无法确认真实商家、价格、距离、配送时间、库存或可下单状态。
```

## 多人方案编排

新增纯函数 `composeMealPlan(context, candidates, options)`，内部调用现有 `recommend()`，不读取 DOM、存储、网络或系统时间。

返回统一结构：

```js
{
  kind,
  primary,
  alternatives,
  items,
  dinerAssignments,
  contextSummary,
  diagnostics
}
```

### 单人

调用一次 `recommend()`，返回首选和两个不同的替代候选。

### 共享菜组合

先通过 `recommend()` 得到首选方向，再从已通过硬过滤的排名中选择不同 `servingRoles` 的互补候选。组合规模随人数调整，但只表达搭配方向，不承诺真实份量或套餐。

### 每个人单独点

依次使用每位成员的上下文调用 `recommend()`。选中的候选从后续成员池中移除，确保不会默认所有人得到同一道菜。每项结果明确标注“第 N 位”。若安全候选不足，显示缺口和修改条件入口，不复制已有候选冒充完整结果。

### 主菜统一，口味各自不同

先确定一个共同菜系或主方向，再针对每位成员在该菜系内选择不同菜品。若同菜系安全候选不足，明确降级为“共同主方向 + 个别替代”，并在取舍中说明，不虚称“同菜系不同菜”已经完全满足。

### 还没想好

使用成员共同偏好与忌口生成折中首选，并提供共享方案和分别点方案作为两个替代方向。理由必须说明共同点，取舍必须说明未完全覆盖的偏好。

## 展示模型

展示层把领域结果转换为：

- 模式身份；
- 场景主题；
- 首选图片、菜名、适用人数和适用场景；
- 口味标签；
- 推荐理由；
- 已通过约束；
- 取舍说明；
- 多人组合或逐人归属；
- 两个带真实差异标签的替代候选；
- 换一个、返回修改条件和复制菜名动作。

灵感模式继续隐藏商家、实时指标、订单按钮和远程 URL。替代候选差异只使用可验证的品类、菜系、口味、清淡倾向或用餐方式差异。

## 图片与资源

- 创建约 10 至 12 个项目本地、无商标和无商家环境的原创菜品类别图；
- 图片不包含包装、菜单价格、门店标志或平台 UI；
- 使用适合网页的 WebP，所有展示容器采用统一 `4:3` 比例；
- 首选图显著大于两个替代候选图；
- `assets/dishes/placeholder.svg` 作为中性缺图占位；
- 展示层在字段为空或资源加载失败时切换占位；
- 构建脚本只把批准的本地菜品资源复制到 `dist/assets/dishes/`；
- 产物白名单和构建测试验证不存在外部热链及多余文件。

## 视觉系统

视觉标志为“餐桌画幅”：大幅菜品图与开放式内容排版构成主推荐，减少厚卡片、阴影和装饰符号。

| 场景方向 | 主题色 |
| --- | --- |
| 快速 / 省钱 | 浅灰 `#F3F4F3` |
| 学习 / 工作 | 浅蓝灰 `#EEF3F6` |
| 清淡 | 浅绿 `#EEF7F1` |
| 聚餐 / 家庭 | 淡米黄 `#FBF4E2` |
| 想吃好 / 约会庆祝 | 淡紫 `#F4EFF8` |
| 深夜加餐 | 深灰蓝 `#263747` |

页面一次只激活一个主题。主题通过根节点 `data-theme` 切换，并完整定义背景、表面、边框、选中态、hover、焦点和文字对比变量。深夜主题仅在场景区域和页面环境中使用深色，内容表面保持清晰易读。

继续使用现有字体分工：

- 展示字体：页标题、菜名和区块标题；
- 正文字体：说明、表单和理由；
- 等宽字体：步骤、模式身份和简短元信息。

不使用大面积渐变、emoji 主图标、连续箭头、密集勾选或“智能生成”“AI 为你”等套话。

## 结果布局

移动端：

```text
模式与场景
大幅 4:3 菜品图
菜名 / 人数 / 场景 / 口味
推荐理由
已通过约束
取舍
多人组合或逐人结果
两个小图替代候选
固定操作栏
```

桌面端：

```text
条件摘要                         大幅菜品图
场景与人数              +        菜名与标签
返回修改入口                      理由 / 约束 / 取舍
                                 多人方案 / 替代候选
```

结果区域不继续套入多层厚卡片。主要分区使用留白、细线、轻表面差和图片比例建立层级。

## 状态与可访问性

- 每个触控目标至少 44×44px；
- 所有选择控件使用真实按钮、单选语义或字段集；
- 选中态同时使用文字、边框和背景，不依赖颜色；
- 步骤变化和结果标题正确获得焦点；
- 对话框保持焦点锁定、Escape 关闭和焦点归还；
- 动态状态使用 `aria-live`，不重复播报整页；
- 加载状态使用静态骨架和简短文案，不使用长时间旋转或夸张动画；
- `prefers-reduced-motion` 下停用非必要过渡；
- 空结果提供“修改条件”和“返回上一步”；
- 错误状态提供“重试”和“返回”，不以清空用户条件作为默认恢复；
- 320px、390px、768px、1024px、1440px 均不得横向溢出。

## 文件边界

### 新增

- `src/domain/scenarios.js`
- `src/data/dish-discovery-metadata.js`
- `src/recommendation/scenario-profiles.js`
- `src/recommendation/meal-plan.js`
- `src/presentation/meal-plan-view-model.js`
- `assets/dishes/*`
- 对应推荐、展示和场景测试

### 修改

- `index.html`
- `src/main.js`
- `src/domain/models.js`
- `src/data/dishes.js`
- `src/services/context.js`
- `src/recommendation/score.js`
- `src/recommendation/explain.js`
- `src/recommendation/recommend.js`
- `src/presentation/recommendation-view-model.js`
- `src/components/inputs.js`
- `src/components/recommendation-card.js`
- `src/components/feedback.js`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components.css`
- `src/styles/responsive.css`
- `scripts/build-pages.mjs`
- `scripts/check-dist.mjs`
- 相关测试和项目状态文档

### 不修改

- `src/providers/*`
- 真实 Provider 配置与契约
- `src/services/storage.js` 的敏感字段规则
- `docs/data-source-contract.md`
- `docs/phase-6a-*`
- `.github/workflows/*`
- 依赖和 analytics 能力

## 测试策略

### 领域与推荐

- 人数合法化和单人/多人场景集合；
- 场景画像覆盖全部定义且权重有效；
- 固定候选池中切换场景会改变首选；
- 省钱场景提高内部预算档匹配；
- 清淡、工作、夜宵、聚餐和庆祝场景使用各自证据；
- 旧上下文继续保持现有推荐行为；
- 忌口硬约束在所有多人编排模式下不被绕过；
- 共享菜组合角色互补；
- 每人单独推荐保留归属且不重复；
- 同菜系不同菜及候选不足时的明确降级；
- 替代候选与首选存在可验证差异；
- 同输入、时间和随机源下结果稳定。

### 数据与边界

- 175 条菜品仍完整、唯一且保留原字段；
- 发现元数据枚举和等级合法；
- 每个候选存在有效本地图片或可回退到占位；
- 灵感候选不增加商家、价格、距离、ETA 或可下单字段；
- 阶段 3.7 上下文字段不进入真实 Provider 请求；
- 忌口和逐人成员输入不进入存储或上传路径。

### 展示与 E2E

- 人数与场景动态联动；
- 多人用餐方式必选；
- 返回后条件保留；
- 场景切换后主题和后续选项同步更新；
- 首选图大于替代图，缺图触发占位；
- 推荐理由、约束、取舍和灵感身份可见；
- 共享、逐人、同菜系和折中结果结构正确；
- 换一个会更换首选且保持当前条件；
- 空结果和错误状态提供正确恢复路径；
- 320px、390px、768px、1024px、1440px；
- 键盘、焦点、对话框、200% 缩放和减少动效；
- 浏览器控制台、资源加载和横向溢出保持干净。

最终验证命令：

```powershell
npm run check:js
npm test
npm run build
npm run check:dist
npm run test:e2e
git diff --check
git status --short --branch
```

## 实施与回滚

实现位于独立分支 `codex/phase-3-7-scenario-discovery`，不叠加阶段 6A 的本地工作分支。实现按领域模型、场景评分、多人编排、展示模型、UI、图片资源、构建和文档分批完成，每批都有独立测试证据。

本阶段不推送、不创建 PR、不部署。完成后暂停并报告修改文件、自动化结果、浏览器结果、已知限制和回滚提交。阶段 6B 继续保持未开始。

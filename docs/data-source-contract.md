# 候选数据源契约 v1.0

本文档定义 Meal-Serendipity 前端与候选数据 provider 的稳定边界。它可独立交给服务端实现，也约束本地灵感 provider。阶段 0 只固定契约，不接入服务、不修改业务逻辑。

## 目标与模式

统一接口向推荐引擎返回两种之一：

- `live`：来自合法、可追溯且未过期的数据服务，可以包含真实商家、价格、距离、ETA、营业和库存。
- `inspiration`：来自本地静态菜品库，只提供菜品灵感，不得填充或暗示实时字段。

前端只依赖统一响应，不直接耦合第三方平台 SDK。任何模式降级都必须在响应和 UI 中可见。

## Provider 接口

```js
async function getCandidates(userContext, { signal }) {
  return {
    schemaVersion: '1.0',
    mode: 'live',
    candidates: [],
    fetchedAt: '2026-08-17T03:00:00.000Z',
    expiresAt: '2026-08-17T03:05:00.000Z',
    notices: []
  };
}
```

- 必须接收 `AbortSignal`，页面离开、输入变化或总时限到达时可取消请求。
- provider 不负责排序或选择最终推荐；它只负责获得并规范化候选。
- 推荐引擎必须再次执行产品硬约束，不能只信任远端已过滤。

## HTTP 请求

### Endpoint

`POST /v1/candidates/search`

前端 endpoint 由公开运行时配置提供。仓库、URL、请求参数和浏览器包中都不得出现第三方私密凭证。

### Headers

```http
Content-Type: application/json
Accept: application/json
X-Request-Id: <UUID>
```

### Request body

```json
{
  "schemaVersion": "1.0",
  "requestId": "f9578f23-89aa-4657-8931-d68e1098fd14",
  "requestedAt": "2026-08-17T03:00:00.000Z",
  "locale": "zh-CN",
  "location": {
    "latitude": 31.2304,
    "longitude": 121.4737,
    "accuracyMeters": 120,
    "areaLabel": "上海市黄浦区",
    "consentGrantedAt": "2026-08-17T02:59:58.000Z"
  },
  "constraints": {
    "partySize": 1,
    "totalBudgetCents": 3500,
    "maxDistanceMeters": 3000,
    "maxDeliveryMinutes": 35,
    "exclusions": ["花生", "海鲜"]
  },
  "preferences": {
    "tastes": ["辣", "咸鲜"],
    "currentPriority": "fastest",
    "recentCandidateIds": ["provider:store-7:item-42"]
  }
}
```

### 请求字段规则

| 字段 | 规则 |
| --- | --- |
| `schemaVersion` | 固定为 `1.0`；不兼容变更必须升 major 版本 |
| `requestId` | 每次用户发起搜索生成 UUID，用于端到端排错，不包含用户身份 |
| `requestedAt` | ISO 8601 UTC 时间 |
| `location` | `live` 请求必需；必须在用户主动授权后取得 |
| `accuracyMeters` | 非负数；服务端可因精度不足返回可恢复错误 |
| `partySize` | 1–50 的整数 |
| `totalBudgetCents` | 总餐资上限，人民币分，非负整数 |
| `maxDistanceMeters` | 配送距离上限，正整数 |
| `maxDeliveryMinutes` | 预计送达时长上限，正整数 |
| `exclusions` | 去空、去重后最多 30 项，每项最多 40 个 Unicode 字符 |
| `tastes` | 枚举或服务端认可的规范化标签，最多 10 项 |
| `currentPriority` | `balanced`、`fastest`、`cheapest`、`comfort`、`lighter`、`novelty` 之一，分别对应均衡、快一点、便宜一点、吃得满足、清淡舒服、想吃点新的 |
| `recentCandidateIds` | 最多 20 项，只传候选 ID，不传历史位置或自由文本 |

金额统一使用人民币分的整数，距离统一使用米，时长统一使用分钟。不得使用浮点金额或依赖本地化字符串做计算。

## HTTP 响应

### 成功响应

```json
{
  "schemaVersion": "1.0",
  "requestId": "f9578f23-89aa-4657-8931-d68e1098fd14",
  "mode": "live",
  "fetchedAt": "2026-08-17T03:00:01.000Z",
  "expiresAt": "2026-08-17T03:05:01.000Z",
  "candidates": [
    {
      "id": "provider:store-7:item-42",
      "sourceMode": "live",
      "store": {
        "id": "store-7",
        "name": "示例门店",
        "platform": "authorized-provider",
        "rating": 4.7,
        "ratingCount": 328,
        "isOpen": true
      },
      "item": {
        "id": "item-42",
        "name": "示例套餐",
        "description": "一人份",
        "imageUrl": "https://cdn.example.test/item-42.webp",
        "tasteTags": ["咸鲜"],
        "categoryTags": ["米饭类"],
        "allergenTags": [],
        "ingredientTags": ["鸡肉"],
        "isAvailable": true
      },
      "pricing": {
        "itemSubtotalCents": 2600,
        "deliveryFeeCents": 300,
        "packagingFeeCents": 100,
        "otherRequiredFeeCents": 0,
        "discountCents": 0,
        "totalCents": 3000,
        "isEstimate": false,
        "unknownFeeLabels": []
      },
      "delivery": {
        "distanceMeters": 1800,
        "etaMinutes": 28,
        "etaRangeMinutes": [25, 32]
      },
      "availability": {
        "isOrderable": true,
        "reason": null
      },
      "orderUrl": "https://provider.example.test/order/store-7/item-42",
      "dataUpdatedAt": "2026-08-17T03:00:00.000Z"
    }
  ],
  "notices": []
}
```

### 候选字段规则

- `id` 在同一 provider 内稳定且唯一，推荐历史和同分排序使用该字段。
- `sourceMode` 必须与顶层 `mode` 一致。
- `store.id`、`item.id`、`store.name`、`item.name` 在 `live` 模式必需。
- `rating` 若存在必须为 0–5；`ratingCount` 若存在必须为非负整数。缺失时用 `null`，不得补造。
- `pricing.totalCents` 必须等于已知必付项之和减优惠；存在未知必付费用时列入 `unknownFeeLabels`，并设置 `isEstimate: true`。
- `delivery.distanceMeters`、`delivery.etaMinutes` 和 `availability.isOrderable` 在 `live` 模式必需；不确定时候选不得作为满足对应硬约束的结果。
- `orderUrl` 必须使用 HTTPS，只能指向批准的域名，且不得携带精确坐标、忌口原文或其他不必要隐私数据。
- `dataUpdatedAt` 不得晚于 `fetchedAt`，且在使用时必须仍处于 5 分钟有效期内。

## 灵感模式响应

灵感 provider 使用同一顶层结构，但候选只能填静态菜品字段：

```json
{
  "schemaVersion": "1.0",
  "requestId": "local-4a0fa5c2",
  "mode": "inspiration",
  "fetchedAt": "2026-08-17T03:00:01.000Z",
  "expiresAt": "2026-08-17T03:05:01.000Z",
  "candidates": [
    {
      "id": "inspiration:红糖冰粉",
      "sourceMode": "inspiration",
      "store": null,
      "item": {
        "id": "红糖冰粉",
        "name": "红糖冰粉",
        "description": "冰爽 Q 滑，暑气全消",
        "imageUrl": null,
        "tasteTags": ["甜"],
        "categoryTags": ["甜品饮品"],
        "allergenTags": [],
        "ingredientTags": [],
        "isAvailable": null
      },
      "pricing": null,
      "delivery": null,
      "availability": null,
      "orderUrl": null,
      "dataUpdatedAt": null
    }
  ],
  "notices": [
    {
      "code": "INSPIRATION_ONLY",
      "message": "当前提供菜品灵感，不含实时商家、价格、距离或配送时间。"
    }
  ]
}
```

灵感模式不得：

- 使用静态价格档冒充可结算总价；
- 推算或随机生成距离、ETA、评分、销量、营业、库存或商家名称；
- 显示“满足 3 公里 / 30 分钟”等实时约束已经通过；
- 把关键词搜索链接描述为该候选当前可下单。

## 超时、重试与缓存

- 单次 HTTP 尝试超时 4 秒。
- 仅网络错误、`502`、`503`、`504` 可自动重试 1 次；重试前加入 200–400ms 随机抖动。
- 包含重试在内的总等待预算不得超过 8 秒；用户取消或输入变化必须立即 Abort。
- `400`、`401`、`403`、`404`、`409`、`422`、`429` 不自动重试；`429` 遵守合法且不超过 8 秒总预算的 `Retry-After`，否则直接降级。
- `live` 数据最大 TTL 为 5 分钟，`expiresAt` 不得晚于 `fetchedAt + 5 分钟`。
- 浏览器只允许内存缓存实时响应；精确坐标和实时响应不得写入 `localStorage` 或 `sessionStorage`。
- 服务端若缓存，只能用短期、粗粒度区域和规范化约束作为键，不得用用户身份或原始精确坐标作为长期缓存键。
- 过期响应不能继续标为 `live`。刷新失败时应降级为 `inspiration`，或明确显示“实时数据不可用”，不得静默沿用过期数据。

## 错误响应

所有非 2xx 响应返回：

```json
{
  "schemaVersion": "1.0",
  "requestId": "f9578f23-89aa-4657-8931-d68e1098fd14",
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "实时候选暂时不可用。",
    "retryable": true,
    "details": null
  }
}
```

| HTTP | `error.code` | 前端行为 |
| --- | --- | --- |
| 400 / 422 | `INVALID_CONTEXT` | 指出需要修正的输入，不发送原始隐私字段到日志 |
| 401 / 403 | `PROVIDER_NOT_AUTHORIZED` | 不重试，标记配置问题并降级 |
| 409 | `LOCATION_TOO_IMPRECISE` | 请求用户重试定位或选择粗粒度区域 |
| 429 | `RATE_LIMITED` | 在总预算内按规则处理，否则降级 |
| 502 / 503 | `PROVIDER_UNAVAILABLE` | 最多重试一次，然后降级 |
| 504 或客户端超时 | `PROVIDER_TIMEOUT` | 最多重试一次，然后降级 |
| 任何无效响应 | `INVALID_PROVIDER_RESPONSE` | 丢弃整份响应并降级，不带病进入推荐引擎 |

降级后的 UI 必须显示用户可理解的原因，并提供重试实时推荐或继续使用灵感模式的选择。

## 隐私、安全与运行边界

- 精确位置必须由明确用户操作触发，并在请求前获得浏览器授权。
- 精确位置只在内存中存在到当前请求完成或取消；页面隐藏、会话结束或用户清除时应释放。
- 日志可记录 `requestId`、错误码、耗时、候选数量和粗粒度区域，不得记录精确坐标、完整忌口原文、订单链接或可识别个人的信息。
- 服务端必须验证类型、长度、范围、枚举和 URL 域名，并设置速率限制与响应大小上限。
- CORS 只允许正式 GitHub Pages origin、批准的预览 origin 和本地开发 origin；不得使用带凭证的通配符 origin。
- 所有网络连接必须使用 HTTPS。服务端持有第三方密钥，并负责轮换、最小权限和供应方条款合规。
- provider 接入前必须确认数据授权、缓存许可、展示归因、深链规则和隐私政策；无法确认时只能启用灵感模式。

## 校验与兼容性

- 前端必须对整个响应做运行时 schema 校验；任一候选关键字段非法时丢弃该候选，顶层字段非法时丢弃整份响应。
- 忌口/过敏原、总预算、最大距离、最大 ETA、营业、可售和 TTL 必须在推荐引擎中再次作为硬约束验证。
- 未知字段应忽略；可选字段缺失时显示“未知”，不得补造。
- v1 的向后兼容新增只能增加可选字段。删除字段、改变单位、语义或必填性必须发布新 major 版本。
- 同一输入和同一候选集合应通过稳定 `id` 得到可复现排序；随机探索必须显式注入随机源。

## 契约验收

服务端或 provider 实现只有同时满足以下条件才可进入集成阶段：

1. 有成功、空候选、超时、取消、限流、上游不可用和无效 schema 的契约测试。
2. 能证明 `totalCents`、`distanceMeters`、`etaMinutes`、营业、可售和 TTL 的单位与含义一致。
3. 超过 5 分钟的数据不会以 `live` 模式返回或展示。
4. 灵感响应的 `store`、`pricing`、`delivery`、`availability`、`orderUrl` 保持 `null`。
5. 前端包与仓库扫描不到第三方私密凭证。
6. 日志样例不包含精确坐标、忌口原文或个人标识。
7. provider 失败时，前端能说明原因并安全降级，硬约束不被绕过。

在合法数据服务、公开前端 endpoint 和上述验收全部具备之前，生产界面只能把结果标为菜品灵感。

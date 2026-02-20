# 小灵通小程序 - 前端页面开发计划

## Goal
基于 UI 设计稿（design/xiaolingtong-ui-v2.html）和 PRD 文档，实现微信原生小程序所有前端页面的 UI 和交互逻辑（mock 数据，暂不对接后端 API）。

## Current Phase
All phases complete ✅

## 页面清单（共 36 个页面）

### 第一组：核心框架页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 登录页 | pages/login/login | ✅ |
| 身份选择页 | pages/identity/identity | ✅ |
| 首页（企业/临工） | pages/index/index | ✅ |
| 我的页面 | pages/mine/mine | ✅ |

### 第二组：供需信息页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 发布信息页 | pages/publish/publish | ✅ |
| 信息详情页 | pages/post-detail/post-detail | ✅ |
| 分类筛选页 | pages/category/category | ✅ |
| 我的发布 | pages/my-posts/my-posts | ✅ |

### 第三组：临工用工页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 发布招工 | pages/publish-job/publish-job | ✅ |
| 发布招工(企业) | pages/post-job/post-job | ✅ |
| 招工详情 | pages/job-detail/job-detail | ✅ |
| 我的报名 | pages/my-applications/my-applications | ✅ |
| 签到页 | pages/checkin/checkin | ✅ |
| 工时记录 | pages/work-record/work-record | ✅ |
| 结算页 | pages/settlement/settlement | ✅ |

### 第四组：认证页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 企业认证 | pages/cert-enterprise/cert-enterprise | ✅ |
| 临工认证 | pages/cert-worker/cert-worker | ✅ |

### 第五组：支付与财务页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 会员中心 | pages/membership/membership | ✅ |
| 灵豆充值 | pages/bean-recharge/bean-recharge | ✅ |
| 灵豆明细 | pages/bean-detail/bean-detail | ✅ |
| 钱包 | pages/wallet/wallet | ✅ |
| 收入明细 | pages/income/income | ✅ |
| 广告购买 | pages/ad-purchase/ad-purchase | ✅ |
| 信息推广 | pages/promotion/promotion | ✅ |

### 第六组：曝光与消息页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 曝光榜 | pages/exposure-board/exposure-board | ✅ |
| 发布曝光 | pages/exposure/exposure | ✅ |
| 曝光详情 | pages/exposure-detail/exposure-detail | ✅ |
| 消息中心 | pages/messages/messages | ✅ |
| 在线聊天 | pages/chat/chat | ✅ |
| 举报页 | pages/report/report | ✅ |

### 第七组：设置与协议页面
| 页面 | 路径 | 状态 |
|-----|------|------|
| 设置页 | pages/settings/settings | ✅ |
| 用户协议 | pages/agreement/agreement | ✅ |
| 隐私政策 | pages/privacy/privacy | ✅ |

### 第八组：新增功能页面（2026-02-21）
| 页面 | 路径 | 状态 |
|-----|------|------|
| 评价企业 | pages/rate/rate | ✅ |
| 提现记录 | pages/withdraw-history/withdraw-history | ✅ |
| 异常记录 | pages/anomaly/anomaly | ✅ |

## Phases

### Phase 1: 公共组件与全局样式 — ✅ complete
### Phase 2: 核心框架页面 — ✅ complete
### Phase 3: 供需信息页面 — ✅ complete
### Phase 4: 临工用工页面 — ✅ complete
### Phase 5: 认证页面 — ✅ complete
### Phase 6: 支付与财务页面 — ✅ complete
### Phase 7: 曝光与消息页面 — ✅ complete
### Phase 8: 联调与完善 — ✅ complete
- [x] 页面间跳转逻辑（全面审计+补全）
- [x] 文字头像替换（首页info-card/招工列表）
- [x] 新增5个缺失页面（评价/提现记录/异常记录/协议/隐私）
- [x] design HTML 新增5个页面设计
- [x] 所有 toast 占位跳转已替换为真实页面跳转

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 先做纯前端 UI，用 mock 数据 | 后端 API 尚未开发 |
| 企业端和临工端共用首页 | 通过 userRole 切换 |
| UI 以设计稿 HTML 为准 | 用户明确说以 UI 为准 |
| info-card 头像统一用文字头像 | 去掉 image 分支，始终用 avatarText |
| 用户协议/隐私政策各自独立页面 | 内容不同，独立更清晰 |

## Notes
- 全部 36 个页面 UI 已完成
- 所有页面跳转已接通，无 toast 占位
- design HTML 已同步新增 5 个页面设计

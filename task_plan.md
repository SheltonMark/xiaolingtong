# 小灵通小程序 - 前端页面开发计划

## Goal
基于 UI 设计稿（design/xiaolingtong-ui-v2.html）和 PRD 文档，实现微信原生小程序所有前端页面的 UI 和交互逻辑（mock 数据，暂不对接后端 API）。

## Current Phase
Phase 1

## 页面清单与分组

### 第一组：核心框架页面（登录/身份/首页/我的）
| 页面 | 路径 | 说明 |
|-----|------|------|
| 登录页 | pages/login/login | 微信授权登录 |
| 身份选择页 | pages/identity/identity | 企业/临工身份选择 |
| 首页（企业端） | pages/index/index | 采购需求/工厂库存/代加工/招工 tab 切换 |
| 首页（临工端） | pages/index/index | 用工招聘列表 |
| 我的页面 | pages/mine/mine | 企业/临工两套布局 |

### 第二组：供需信息页面
| 页面 | 路径 | 说明 |
|-----|------|------|
| 发布信息页 | pages/publish/publish | 采购/库存/代加工发布表单 |
| 信息详情页 | pages/post-detail/post-detail | 供需信息详情+联系方式 |
| 分类筛选页 | pages/category/category | 品类/地区/排序筛选 |
| 我的发布 | pages/my-posts/my-posts | 已发布信息管理 |

### 第三组：临工用工页面
| 页面 | 路径 | 说明 |
|-----|------|------|
| 发布招工 | pages/publish-job/publish-job | 企业发布用工需求 |
| 招工详情 | pages/job-detail/job-detail | 用工详情+报名 |
| 我的报名 | pages/my-applications/my-applications | 临工报名记录 |
| 签到页 | pages/checkin/checkin | 临时管理员签到 |
| 工时记录 | pages/work-record/work-record | 工时/计件记录 |
| 结算页 | pages/settlement/settlement | 收工结算核验单 |

### 第四组：认证页面
| 页面 | 路径 | 说明 |
|-----|------|------|
| 企业认证 | pages/cert-enterprise/cert-enterprise | 企业资质认证表单 |
| 临工认证 | pages/cert-worker/cert-worker | 临工身份认证表单 |

### 第五组：支付与财务页面
| 页面 | 路径 | 说明 |
|-----|------|------|
| 会员中心 | pages/membership/membership | 会员套餐选择+开通 |
| 查看机会充值 | pages/bean-recharge/bean-recharge | 查看机会套餐购买 |
| 钱包 | pages/wallet/wallet | 余额+提现 |
| 收入明细 | pages/income/income | 收入记录列表 |
| 广告购买 | pages/ad-purchase/ad-purchase | 广告位购买 |
| 信息推广 | pages/promotion/promotion | 信息置顶购买 |

### 第六组：曝光与消息页面
| 页面 | 路径 | 说明 |
|-----|------|------|
| 曝光榜 | pages/exposure-board/exposure-board | 曝光列表+分类筛选 |
| 发布曝光 | pages/exposure/exposure | 曝光发布表单 |
| 消息中心 | pages/messages/messages | 系统通知+聊天列表 |
| 举报页 | pages/report/report | 举报表单 |

## Phases

### Phase 1: 公共组件与全局样式
- [ ] 完善 app.wxss 全局样式（颜色变量、通用类）
- [ ] 创建公共组件：导航栏、底部按钮、卡片、空状态、加载状态
- [ ] 创建 utils/mock.js 模拟数据
- **Status:** pending

### Phase 2: 核心框架页面
- [ ] 登录页（微信授权按钮）
- [ ] 身份选择页（企业/临工选择）
- [ ] 首页（企业端 tab 切换 + 临工端列表）
- [ ] 我的页面（企业/临工两套布局）
- **Status:** pending

### Phase 3: 供需信息页面
- [ ] 发布信息页（采购/库存/代加工三种表单）
- [ ] 信息详情页（图片轮播+详情+联系方式解锁）
- [ ] 分类筛选页
- [ ] 我的发布页
- **Status:** pending

### Phase 4: 临工用工页面
- [ ] 发布招工页
- [ ] 招工详情页（报名按钮+福利+企业信息）
- [ ] 我的报名页
- [ ] 签到页（临时管理员）
- [ ] 工时/计件记录页
- [ ] 结算页
- **Status:** pending

### Phase 5: 认证页面
- [ ] 企业认证表单
- [ ] 临工认证表单
- **Status:** pending

### Phase 6: 支付与财务页面
- [ ] 会员中心
- [ ] 查看机会充值
- [ ] 钱包页
- [ ] 收入明细
- [ ] 广告购买
- [ ] 信息推广
- **Status:** pending

### Phase 7: 曝光与消息页面
- [ ] 曝光榜列表
- [ ] 发布曝光
- [ ] 消息中心（系统通知+聊天列表）
- [ ] 举报页
- **Status:** pending

### Phase 8: 联调与完善
- [ ] 页面间跳转逻辑
- [ ] 权限控制（未认证提示、角色隔离）
- [ ] 空状态/加载状态/错误状态
- [ ] 整体 UI 走查
- **Status:** pending

## Key Questions
1. 在线聊天页是否需要单独新建页面？（当前 app.json 中没有 chat 页面）→ 需要新增
2. 曝光详情页是否需要单独页面？（当前只有 exposure 和 exposure-board）→ 需要新增
3. 是否需要实现 WebSocket 聊天？→ 第一阶段先用 mock 数据，后续对接

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 先做纯前端 UI，用 mock 数据 | 后端 API 尚未开发，先把所有页面 UI 做出来 |
| 按页面分组分阶段开发 | 降低复杂度，每组可独立验证 |
| 企业端和临工端共用首页，通过 userRole 切换 | 减少页面数量，app.json 已有此设计 |
| UI 以设计稿 HTML 为准，PRD 为辅 | 用户明确说以 UI 为准 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- 所有 26 个页面目前都是空骨架
- app.json / app.js / app.wxss 基础框架已搭建
- 设计稿在 design/xiaolingtong-ui-v2.html
- PRD 在 Docs/prd_from_superpower/ 目录
- 需要新增页面：chat（在线聊天）、exposure-detail（曝光详情）

# Findings & Decisions

## Requirements
- 微信原生小程序，26+ 个页面
- 企业用户和临工用户两套 UI，通过 userRole 切换
- 四大业务：采购需求、工厂库存、代加工、临工用工
- 附加功能：诚信曝光榜（含用户发布+评论）、在线聊天、会员体系
- 所有价格/配置后台可配，代码不写死

## Research Findings

### 现有项目结构
- app.json 已注册 26 个页面路由 + 5 个 tabBar
- app.js 有 globalData：userInfo, userRole, isLoggedIn
- app.wxss 有基础主题色 class（text-primary, text-cta 等）
- 所有 26 个页面都是空骨架（只有路径注释和 text 标签）
- tabBar：首页、曝光、发布、消息、我的

### 设计稿分析（design/xiaolingtong-ui-v2.html）
- 使用 Tailwind CSS 类名，需转换为小程序 rpx 样式
- 主色调：#3B82F6（蓝）、#F97316（橙/CTA）、#10B981（绿/fresh）、#F43F5E（玫红/曝光）
- 字体大小对照：text-xs=20rpx, text-sm=24rpx, text-base=28rpx, text-lg=32rpx
- 间距对照：p-4=32rpx, mx-4=32rpx, gap-2=16rpx, gap-3=24rpx
- 圆角对照：rounded-xl=24rpx, rounded-2xl=32rpx, rounded-full=9999rpx

### 需要新增的页面（app.json 中缺失）
- pages/chat/chat — 在线聊天页
- pages/exposure-detail/exposure-detail — 曝光详情页

### PRD 与 UI 差异（已更新 PRD）
- 曝光板块：PRD 原只有后台管理，已补充用户端发布/列表/详情/评论
- 在线聊天：PRD 原只有客服，已补充用户间即时聊天功能

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Tailwind → rpx 手动转换 | 小程序不支持 Tailwind，需逐页转换样式 |
| mock 数据放 utils/mock.js | 集中管理，后续替换 API 方便 |
| 公共组件放 components/ 目录 | 导航栏、卡片等复用组件 |
| 企业/临工首页共用 index，条件渲染 | 减少页面数，已有 userRole 机制 |
| 颜色用 CSS 变量或 class | app.wxss 已有基础，继续扩展 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- UI 设计稿：design/xiaolingtong-ui-v2.html
- PRD 文档：Docs/prd_from_superpower/00~08
- 客户原始需求：Docs/prd_from_customer/

# 任务清单

## Phase 1: 环境搭建 ⏸️

### 前端任务
- [ ] 创建微信小程序项目 `wx-miniprogram`
- [ ] 配置 `app.json` 路由和tabBar
- [ ] 创建目录结构（pages/components/utils/services/stores）
- [ ] 安装 MobX `npm install mobx-miniprogram mobx-miniprogram-bindings`
- [ ] 封装网络请求 `utils/request.js`
- [ ] 封装路由守卫 `utils/auth.js`
- [ ] 创建通用组件（Button/Input/Modal/Loading）
- [ ] 配置 ESLint + Prettier
- [ ] 编写 README.md

### 后端任务
- [ ] 创建 NestJS 项目 `nest new backend`
- [ ] 配置目录结构（modules/common/config）
- [ ] 安装依赖（TypeORM/Redis/JWT/Winston）
- [ ] 配置 MySQL 连接 `config/database.config.ts`
- [ ] 配置 Redis 连接 `config/redis.config.ts`
- [ ] 执行数据库建表脚本
- [ ] 配置 JWT 认证 `auth/jwt.strategy.ts`
- [ ] 配置全局异常过滤器 `common/filters/http-exception.filter.ts`
- [ ] 配置日志系统 `common/logger/winston.logger.ts`
- [ ] 配置 Swagger `main.ts`
- [ ] 编写 README.md

### DevOps任务
- [ ] 创建 Git 仓库
- [ ] 配置 `.gitignore`
- [ ] 创建 `.env.example`
- [ ] 编写项目 README.md
- [ ] 配置 Git hooks（pre-commit）

---

## Phase 2: 用户体系 ⏸️

### 前端任务
- [ ] 登录页面 `pages/auth/login`
- [ ] 用户类型选择页面 `pages/auth/select-type`
- [ ] 企业认证页面 `pages/auth/enterprise-cert`
- [ ] 临工认证页面 `pages/auth/worker-cert`
- [ ] 个人中心页面 `pages/user/profile`
- [ ] 用户信息编辑页面 `pages/user/edit`
- [ ] 认证状态组件 `components/cert-status`

### 后端任务
- [ ] 用户模块 `modules/users`
- [ ] 微信登录接口 `POST /api/auth/wechat-login`
- [ ] 用户信息接口 `GET /api/users/profile`
- [ ] 用户类型选择接口 `PUT /api/users/type`
- [ ] 企业认证模块 `modules/enterprise-cert`
- [ ] 企业认证提交接口 `POST /api/enterprise-cert`
- [ ] 临工认证模块 `modules/worker-cert`
- [ ] 临工认证提交接口 `POST /api/worker-cert`
- [ ] 认证审核接口 `PUT /api/admin/cert/:id/review`
- [ ] 权限守卫 `common/guards/role.guard.ts`
- [ ] 信用分服务 `modules/users/credit-score.service.ts`

---

## Phase 3: 供需信息 ⏸️

### 前端任务
- [ ] 信息发布页面 `pages/info/publish`
- [ ] 信息列表页面 `pages/info/list`
- [ ] 信息详情页面 `pages/info/detail`
- [ ] 搜索页面 `pages/info/search`
- [ ] 我的发布页面 `pages/info/my-posts`
- [ ] 查看机会购买页面 `pages/user/buy-chances`

### 后端任务
- [ ] 供需信息模块 `modules/info-posts`
- [ ] 信息发布接口 `POST /api/info-posts`
- [ ] 信息列表接口 `GET /api/info-posts`
- [ ] 信息详情接口 `GET /api/info-posts/:id`
- [ ] 信息审核接口 `PUT /api/admin/info-posts/:id/review`
- [ ] 联系方式查看接口 `POST /api/info-posts/:id/view-contact`
- [ ] 查看机会模块 `modules/view-chances`
- [ ] 查看机会购买接口 `POST /api/view-chances/buy`
- [ ] 关键词黑名单检查服务 `modules/info-posts/keyword-check.service.ts`

---

## Phase 4: 临工用工 ⏸️

### 前端任务（工厂端）
- [ ] 用工发布页面 `pages/job/publish`
- [ ] 我的发布页面 `pages/job/my-posts`
- [ ] 报名列表页面 `pages/job/applications`
- [ ] 人员分配页面 `pages/job/assign`
- [ ] 用工详情页面 `pages/job/detail`

### 前端任务（临工端）
- [ ] 用工列表页面 `pages/job/list`
- [ ] 用工详情页面 `pages/job/detail`
- [ ] 我的报名页面 `pages/job/my-applications`
- [ ] 出勤确认页面 `pages/job/confirm`
- [ ] 打卡页面 `pages/job/checkin`
- [ ] 结算单页面 `pages/job/settlement`

### 前端任务（管理员端）
- [ ] 工时记录页面 `pages/job/record`
- [ ] 现场照片上传页面 `pages/job/photos`

### 后端任务
- [ ] 用工模块 `modules/job-posts`
- [ ] 用工发布接口 `POST /api/job-posts`
- [ ] 用工列表接口 `GET /api/job-posts`
- [ ] 用工详情接口 `GET /api/job-posts/:id`
- [ ] 报名接口 `POST /api/job-applications`
- [ ] 人员分配接口 `PUT /api/job-posts/:id/assign`
- [ ] 临时管理员指定接口 `PUT /api/job-posts/:id/assign-manager`
- [ ] 出勤确认接口 `PUT /api/job-applications/:id/confirm`
- [ ] 打卡接口 `POST /api/job-checkins`
- [ ] 工时记录接口 `POST /api/job-settlements`
- [ ] 结算单确认接口 `PUT /api/job-settlements/:id/confirm`
- [ ] 用工状态机服务 `modules/job-posts/job-state-machine.service.ts`
- [ ] 地理位置计算服务 `common/utils/geo.service.ts`

---

## Phase 5: 支付财务 ⏸️

### 前端任务
- [ ] 会员购买页面 `pages/user/buy-vip`
- [ ] 查看机会购买页面 `pages/user/buy-chances`
- [ ] 钱包页面 `pages/user/wallet`
- [ ] 提现页面 `pages/user/withdraw`
- [ ] 订单列表页面 `pages/user/orders`
- [ ] 支付结果页面 `pages/payment/result`

### 后端任务
- [ ] 支付模块 `modules/payments`
- [ ] 微信支付配置 `config/wechat-pay.config.ts`
- [ ] 统一下单接口 `POST /api/payments/unifiedorder`
- [ ] 支付回调接口 `POST /api/payments/notify`
- [ ] 会员购买接口 `POST /api/orders/vip`
- [ ] 查看机会购买接口 `POST /api/orders/view-chances`
- [ ] 钱包模块 `modules/wallet`
- [ ] 钱包查询接口 `GET /api/wallet`
- [ ] 工资支付接口 `POST /api/salary-payments`
- [ ] 提现接口 `POST /api/withdrawals`
- [ ] 提现回调接口 `POST /api/withdrawals/notify`
- [ ] 订单管理接口 `GET /api/orders`

---

## Phase 6: 消息通知 ⏸️

### 前端任务
- [ ] 消息列表页面 `pages/message/list`
- [ ] 消息详情页面 `pages/message/detail`
- [ ] 未读消息提示组件 `components/unread-badge`

### 后端任务
- [ ] 消息模块 `modules/messages`
- [ ] 消息列表接口 `GET /api/messages`
- [ ] 消息详情接口 `GET /api/messages/:id`
- [ ] 消息已读接口 `PUT /api/messages/:id/read`
- [ ] 微信通知模块 `modules/wechat-notify`
- [ ] 订阅消息发送服务 `modules/wechat-notify/subscribe-message.service.ts`
- [ ] 定时任务模块 `modules/schedule`
- [ ] 出勤提醒任务 `modules/schedule/attendance-reminder.task.ts`
- [ ] 到期提醒任务 `modules/schedule/expiry-reminder.task.ts`

---

## Phase 7: 管理后台 ⏸️

### 前端任务
- [ ] 管理员登录页面 `admin/pages/login`
- [ ] 仪表盘页面 `admin/pages/dashboard`
- [ ] 用户管理页面 `admin/pages/users`
- [ ] 认证审核页面 `admin/pages/cert-review`
- [ ] 信息审核页面 `admin/pages/info-review`
- [ ] 用工管理页面 `admin/pages/jobs`
- [ ] 财务统计页面 `admin/pages/finance`
- [ ] 系统配置页面 `admin/pages/config`
- [ ] 工种管理页面 `admin/pages/job-types`
- [ ] 城市管理页面 `admin/pages/cities`
- [ ] 关键词管理页面 `admin/pages/keywords`

### 后端任务
- [ ] 管理员模块 `modules/admin`
- [ ] 管理员登录接口 `POST /api/admin/login`
- [ ] 用户管理接口 `GET /api/admin/users`
- [ ] 认证审核接口 `PUT /api/admin/cert/:id/review`
- [ ] 信息审核接口 `PUT /api/admin/info-posts/:id/review`
- [ ] 用工管理接口 `GET /api/admin/jobs`
- [ ] 财务统计接口 `GET /api/admin/finance/stats`
- [ ] 系统配置接口 `GET/PUT /api/admin/config`
- [ ] 工种管理接口 `GET/POST/PUT/DELETE /api/admin/job-types`
- [ ] 城市管理接口 `GET/POST/PUT/DELETE /api/admin/cities`
- [ ] 关键词管理接口 `GET/POST/PUT/DELETE /api/admin/keywords`

---

## Phase 8: 测试优化 ⏸️

### 测试任务
- [ ] 编写单元测试用例
- [ ] 编写接口测试用例
- [ ] 执行功能测试
- [ ] 执行性能测试
- [ ] 执行安全测试
- [ ] 执行兼容性测试
- [ ] Bug修复

### 优化任务
- [ ] SQL查询优化
- [ ] Redis缓存优化
- [ ] 接口响应时间优化
- [ ] 图片加载优化
- [ ] 代码审查

---

## Phase 9: 上线部署 ⏸️

### 部署任务
- [ ] 购买服务器（阿里云/腾讯云）
- [ ] 配置服务器环境（Node.js/MySQL/Redis/Nginx）
- [ ] 域名备案
- [ ] SSL证书配置
- [ ] 生产环境部署
- [ ] 数据库备份配置
- [ ] 监控告警配置（Prometheus/Grafana）

### 小程序发布
- [ ] 代码上传
- [ ] 小程序提审
- [ ] 微信支付配置（生产环境）
- [ ] 审核通过后发布

### 文档任务
- [ ] 编写运维文档
- [ ] 编写API文档
- [ ] 编写用户手册

---

**最后更新**: 2026-02-16

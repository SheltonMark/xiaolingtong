# 小灵通后端 - 部署与开发指南

## 一、环境要求

- Node.js >= 18
- MySQL 8.0
- Redis（可选，开发阶段可暂不装）

## 二、克隆项目

```bash
git clone git@github.com:SheltonMark/xiaolingtong.git
cd xiaolingtong/server
npm install
```

## 三、创建数据库

```bash
mysql -u root -p -e "CREATE DATABASE xiaolingtong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 四、配置环境变量

在 `server/` 目录下创建 `.env` 文件（此文件不会上传到 Git）：

```env
# 服务
PORT=3000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的MySQL密码
DB_DATABASE=xiaolingtong

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=xiaolingtong_jwt_secret_2026
JWT_EXPIRES_IN=7d

# 微信小程序
WX_APPID=
WX_SECRET=
WX_MCH_ID=
WX_MCH_KEY=

# 腾讯位置服务
TENCENT_MAP_KEY=NOWBZ-YXCL7-PMLX2-PJSVO-C52S2-CBFVW

# 腾讯云 COS
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
```

## 五、启动开发服务

```bash
cd server
npm run start:dev
```

启动后访问 `http://localhost:3000/api`，开发模式下 TypeORM 会自动创建所有数据表。

## 六、API 接口清单（共 45 个）

### 认证登录（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/wx-login | 微信登录 | 公开 |
| POST | /api/auth/choose-role | 选择身份 | 登录 |
| GET | /api/auth/profile | 获取用户信息 | 登录 |
| POST | /api/auth/logout | 退出登录 | 登录 |

### 用户认证（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/cert/enterprise | 提交企业认证 | 登录 |
| POST | /api/cert/worker | 提交实名认证 | 登录 |
| GET | /api/cert/status | 查询认证状态 | 登录 |
| PUT | /api/settings/avatar | 更新头像 | 登录 |

### 信息帖子（7个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/posts | 帖子列表 | 登录 |
| POST | /api/posts | 发布帖子 | 登录 |
| GET | /api/posts/mine | 我的发布 | 登录 |
| GET | /api/posts/:id | 帖子详情 | 登录 |
| PUT | /api/posts/:id | 编辑帖子 | 登录 |
| DELETE | /api/posts/:id | 删除帖子 | 登录 |
| POST | /api/posts/:id/unlock | 解锁联系方式 | 登录 |

### 招工（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/jobs | 招工列表 | 登录 |
| POST | /api/jobs | 发布招工 | 企业 |
| GET | /api/jobs/:id | 招工详情 | 登录 |
| PUT | /api/jobs/:id | 编辑招工 | 企业 |

### 报名（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/jobs/:id/apply | 报名 | 临工 |
| POST | /api/jobs/:id/confirm | 确认出勤 | 临工 |
| GET | /api/applications | 我的报名 | 登录 |
| PUT | /api/applications/:id/cancel | 取消报名 | 登录 |

### 工作管理（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/work/checkin | 签到 | 登录 |
| POST | /api/work/log | 提交工时/计件 | 登录 |
| POST | /api/work/anomaly | 记录异常 | 登录 |

### 结算（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/settlements/:jobId | 结算详情 | 登录 |
| POST | /api/settlements/:jobId/pay | 企业支付 | 登录 |
| POST | /api/settlements/:jobId/confirm | 工人确认 | 登录 |

### 钱包（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/wallet | 余额 | 登录 |
| GET | /api/wallet/transactions | 流水记录 | 登录 |
| GET | /api/wallet/income | 收入明细 | 登录 |
| POST | /api/wallet/withdraw | 提现 | 登录 |

### 灵豆（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/beans/balance | 灵豆余额 | 登录 |
| POST | /api/beans/recharge | 充值 | 登录 |
| GET | /api/beans/transactions | 灵豆流水 | 登录 |

### 聊天（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/conversations | 会话列表 | 登录 |
| GET | /api/conversations/:id/messages | 消息记录 | 登录 |
| POST | /api/conversations/:id/send | 发送消息 | 登录 |
| WS | /ws/chat | WebSocket实时通道 | 登录 |

### 系统通知（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/notifications | 通知列表 | 登录 |
| POST | /api/notifications/read-all | 全部已读 | 登录 |
| PUT | /api/notifications/:id/read | 单条已读 | 登录 |

### 曝光（4个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/exposures | 曝光列表 | 登录 |
| POST | /api/exposures | 发布曝光 | 登录 |
| GET | /api/exposures/:id | 曝光详情 | 登录 |
| POST | /api/exposures/:id/comment | 评论 | 登录 |

### 收藏/举报/评价（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/favorites/toggle | 收藏/取消 | 登录 |
| POST | /api/reports | 举报 | 登录 |
| POST | /api/ratings | 评价企业 | 临工 |

### 会员/推广（3个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/membership/subscribe | 开通会员 | 登录 |
| POST | /api/promotions | 信息推广 | 登录 |
| POST | /api/ads/purchase | 广告投放 | 登录 |

### 文件上传（1个）
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/upload | 上传文件 | 登录 |

## 七、待接入的第三方服务

| 优先级 | 服务 | 用途 | 申请地址 |
|--------|------|------|----------|
| P0 | 微信支付商户号 | 灵豆充值、会员购买、企业结算 | pay.weixin.qq.com |
| P0 | 服务器 + 域名 + 备案 + SSL | 线上部署 | 腾讯云 |
| P0 | 云 MySQL + Redis | 线上数据库 | 腾讯云控制台 |
| P1 | 腾讯位置服务 | 签到定位、距离计算 | lbs.qq.com（已申请） |
| P1 | 腾讯云 COS | 图片/文件存储 | 腾讯云 COS 控制台 |
| P2 | 短信服务 | 手机号验证（可用微信授权替代） | 腾讯云短信 |

## 八、代码中的 TODO 标记

以下位置需要在接入真实服务后补充实现：

- `server/src/modules/auth/auth.service.ts` — 微信 code2session 登录（开发模式已做 mock）
- `server/src/modules/bean/bean.service.ts` — 灵豆充值接入微信支付
- `server/src/modules/wallet/wallet.service.ts` — 提现接入微信企业付款到零钱
- `server/src/modules/membership/membership.service.ts` — 会员购买接入微信支付
- `server/src/modules/promotion/promotion.service.ts` — 广告投放接入微信支付
- `server/src/modules/upload/upload.controller.ts` — 文件上传改为腾讯云 COS

## 九、项目结构

```
server/
├── src/
│   ├── main.ts                          # 入口
│   ├── app.module.ts                    # 根模块
│   ├── common/                          # 通用
│   │   ├── guards/auth.guard.ts         # JWT 鉴权
│   │   ├── guards/role.guard.ts         # 角色守卫
│   │   ├── decorators/                  # 自定义装饰器
│   │   ├── filters/                     # 异常过滤器
│   │   └── interceptors/               # 响应拦截器
│   ├── entities/                        # 20个数据库实体
│   └── modules/                         # 17个业务模块
│       ├── auth/                        # 认证登录
│       ├── user/                        # 用户认证
│       ├── post/                        # 信息帖子
│       ├── job/                         # 招工
│       ├── application/                 # 报名
│       ├── work/                        # 签到/工时
│       ├── settlement/                  # 结算
│       ├── wallet/                      # 钱包
│       ├── bean/                        # 灵豆
│       ├── chat/                        # 聊天(WebSocket)
│       ├── notification/                # 系统通知
│       ├── exposure/                    # 曝光
│       ├── favorite/                    # 收藏
│       ├── report/                      # 举报
│       ├── rating/                      # 评价
│       ├── membership/                  # 会员
│       ├── promotion/                   # 推广/广告
│       └── upload/                      # 文件上传
├── .env                                 # 环境变量（不上传Git）
├── package.json
└── tsconfig.json
```

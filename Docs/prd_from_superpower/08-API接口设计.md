# API接口设计

## 1. 接口规范

### 1.1 基础信息
- **Base URL**: `https://api.example.com/api/v1`
- **协议**: HTTPS
- **数据格式**: JSON

### 1.2 请求头
```
Content-Type: application/json
Authorization: Bearer {token}
```

### 1.3 响应格式
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 1.4 错误码
| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未登录 |
| 1003 | 无权限 |
| 1004 | 资源不存在 |
| 1005 | 操作失败 |
| 2001 | 未认证 |
| 2002 | 认证审核中 |
| 2003 | 认证被驳回 |
| 3001 | 查看机会不足 |
| 3002 | 余额不足 |

---

## 2. 用户模块接口

### 2.1 微信登录
```
POST /user/login
```

**请求参数**
```json
{
  "code": "微信登录code"
}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "token": "xxx",
    "isNewUser": true,
    "userType": null
  }
}
```

### 2.2 选择用户类型（新用户）
```
POST /user/select-type
```

**请求参数**
```json
{
  "userType": "enterprise"  // enterprise | worker
}
```

### 2.3 获取用户信息
```
GET /user/profile
```

**响应**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "userType": "enterprise",
    "nickname": "xxx",
    "avatar": "xxx",
    "phone": "138xxxx1234",
    "certStatus": "approved",
    "accountStatus": "normal",
    "creditScore": 92,
    "memberType": "normal",
    "memberExpireTime": null,
    "viewChances": 5
  }
}
```

### 2.4 提交企业认证
```
POST /user/cert/enterprise
```

**请求参数**
```json
{
  "companyName": "xxx有限公司",
  "creditCode": "91440xxx",
  "licenseImage": "图片URL",
  "legalPersonIdFront": "图片URL",
  "legalPersonIdBack": "图片URL",
  "contactName": "张三",
  "contactPhone": "138xxxx1234",
  "contactWechat": "xxx",
  "companyType": "factory",
  "industryCategory": "日用百货制造",
  "productTags": ["保温杯", "餐具"],
  "attributeTags": ["生产型", "小批量接单"],
  "province": "广东省",
  "city": "广州市",
  "district": "白云区",
  "address": "xxx路xxx号"
}
```

### 2.5 提交临工认证
```
POST /user/cert/worker
```

**请求参数**
```json
{
  "realName": "张三",
  "idNumber": "440xxx",
  "idFrontImage": "图片URL",
  "idBackImage": "图片URL"
}
```

### 2.6 获取认证状态
```
GET /user/cert/status
```

**响应**
```json
{
  "code": 0,
  "data": {
    "status": "approved",
    "rejectReason": null,
    "certInfo": { ... }
  }
}
```

### 2.7 获取信用分
```
GET /user/credit
```

**响应**
```json
{
  "code": 0,
  "data": {
    "score": 92,
    "history": [
      { "change": -10, "reason": "爽约", "time": "2026-01-20" }
    ]
  }
}
```

---

## 3. 供需信息模块接口

### 3.1 发布信息
```
POST /info/publish
```

**请求参数**
```json
{
  "infoType": "inventory",
  "title": "保温杯库存清仓",
  "content": {
    "productName": "不锈钢保温杯",
    "category": "日用百货",
    "specs": "500ml",
    "quantity": 5000,
    "unit": "个",
    "price": "15-20",
    "stockStatus": "现货",
    "minOrder": 100,
    "tradeNote": "款到发货"
  },
  "images": ["url1", "url2"],
  "contactName": "张三",
  "contactPhone": "138xxxx1234",
  "contactWechat": "xxx",
  "province": "广东省",
  "city": "广州市",
  "district": "白云区",
  "expireDays": 30
}
```

### 3.2 获取信息列表
```
GET /info/list
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| infoType | string | 是 | purchase/inventory/processing |
| category | string | 否 | 品类筛选 |
| city | string | 否 | 城市筛选 |
| keyword | string | 否 | 关键词搜索 |
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认20 |

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "保温杯库存清仓",
        "infoType": "inventory",
        "category": "日用百货",
        "price": "15-20",
        "city": "广州市",
        "images": ["url1"],
        "isTop": true,
        "createdAt": "2026-01-20 15:30"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.3 获取信息详情
```
GET /info/detail/:id
```

**响应**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "title": "保温杯库存清仓",
    "infoType": "inventory",
    "content": { ... },
    "images": ["url1", "url2"],
    "city": "广州市",
    "createdAt": "2026-01-20 15:30",
    "expireTime": "2026-02-20",
    "contactUnlocked": false
  }
}
```

### 3.4 查看联系方式
```
POST /info/contact/:id
```

**响应**
```json
{
  "code": 0,
  "data": {
    "contactName": "张三",
    "contactPhone": "138xxxx1234",
    "contactWechat": "xxx",
    "remainChances": 4
  }
}
```

### 3.5 获取我的发布
```
GET /info/my
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| infoType | string | 否 | 信息类型筛选 |
| status | string | 否 | 状态筛选 |
| page | int | 否 | 页码 |

### 3.6 删除信息
```
DELETE /info/:id
```

### 3.7 举报信息
```
POST /info/report
```

**请求参数**
```json
{
  "postId": 1,
  "reason": "虚假信息",
  "description": "该产品实际不存在",
  "evidenceImages": ["url1"]
}
```

### 3.8 购买置顶
```
POST /info/promote
```

**请求参数**
```json
{
  "postId": 1,
  "days": 7
}
```

### 3.9 获取品类列表
```
GET /info/categories
```

### 3.10 获取开放城市列表
```
GET /info/cities
```

---

## 4. 临工用工模块接口

### 4.1 发布用工需求
```
POST /job/publish
```

**请求参数**
```json
{
  "title": "招组装工10名",
  "jobTypeId": 1,
  "settlementType": "hourly",
  "factoryPrice": 25,
  "requiredCount": 10,
  "workContent": "电子产品组装",
  "workStartDate": "2026-01-25",
  "workEndDate": "2026-01-30",
  "workStartTime": "08:00",
  "workEndTime": "18:00",
  "province": "广东省",
  "city": "广州市",
  "district": "白云区",
  "address": "xxx路xxx号",
  "latitude": 23.123456,
  "longitude": 113.123456,
  "skillRequirement": "有组装经验优先",
  "otherInfo": "",
  "images": ["url1"],
  "contactName": "张经理",
  "contactPhone": "138xxxx1234"
}
```

### 4.2 获取用工列表（临工端）
```
GET /job/list
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| jobTypeId | int | 否 | 工种筛选 |
| city | string | 否 | 城市筛选 |
| settlementType | string | 否 | hourly/piece |
| latitude | float | 否 | 用户纬度（用于距离排序） |
| longitude | float | 否 | 用户经度 |
| page | int | 否 | 页码 |

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "招组装工10名",
        "jobTypeName": "组装工",
        "workerPrice": 20,
        "settlementType": "hourly",
        "requiredCount": 10,
        "appliedCount": 5,
        "workStartDate": "2026-01-25",
        "workEndDate": "2026-01-30",
        "city": "广州市",
        "district": "白云区",
        "distance": 2.5,
        "factoryCreditScore": 92
      }
    ],
    "total": 50
  }
}
```

### 4.3 获取用工详情
```
GET /job/detail/:id
```

### 4.4 报名应聘
```
POST /job/apply
```

**请求参数**
```json
{
  "jobId": 1
}
```

### 4.5 获取我的报名列表
```
GET /job/my-applications
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| status | string | 否 | applied/selected/confirmed/working/completed |

### 4.6 确认出勤
```
POST /job/confirm-attendance
```

**请求参数**
```json
{
  "applicationId": 1
}
```

### 4.7 签到（临时管理员操作）
```
POST /job/checkin
```

**请求参数**
```json
{
  "jobId": 1,
  "workerIds": [1, 2, 3]
}
```

### 4.8 确认开工（临时管理员操作）
```
POST /job/start-work
```

**请求参数**
```json
{
  "jobId": 1,
  "actualWorkerIds": [1, 2, 3]
}
```

### 4.9 上传现场照片
```
POST /job/upload-photo
```

**请求参数**
```json
{
  "jobId": 1,
  "photoUrl": "url"
}
```

### 4.10 录入计件数
```
POST /job/record-piece
```

**请求参数**
```json
{
  "jobId": 1,
  "date": "2026-01-25",
  "records": [
    { "workerId": 1, "pieces": 150 },
    { "workerId": 2, "pieces": 120 }
  ]
}
```

### 4.11 确认收工
```
POST /job/end-work
```

**请求参数**
```json
{
  "jobId": 1,
  "date": "2026-01-25",
  "records": [
    { "workerId": 1, "hours": 8 },
    { "workerId": 2, "hours": 7.5 }
  ]
}
```

### 4.12 异常上报
```
POST /job/report-issue
```

**请求参数**
```json
{
  "jobId": 1,
  "issueType": "worker_absent",
  "targetType": "worker",
  "targetId": 5,
  "description": "该工人未经请假擅自离岗",
  "evidenceImages": ["url1"]
}
```

### 4.13 获取结算单
```
GET /job/settlement/:jobId
```

### 4.14 临工确认结算
```
POST /job/confirm-settlement
```

**请求参数**
```json
{
  "settlementId": 1
}
```

### 4.15 工厂支付工资
```
POST /job/pay
```

**请求参数**
```json
{
  "settlementId": 1
}
```

### 4.16 获取工种列表
```
GET /job/types
```

---

## 5. 支付与财务模块接口

### 5.1 购买会员
```
POST /payment/member
```

**请求参数**
```json
{
  "memberType": "monthly"  // monthly | yearly
}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "orderNo": "202601201530001",
    "payParams": {
      "timeStamp": "xxx",
      "nonceStr": "xxx",
      "package": "xxx",
      "signType": "RSA",
      "paySign": "xxx"
    }
  }
}
```

### 5.2 购买查看机会
```
POST /payment/view-chance
```

**请求参数**
```json
{
  "packageId": 1  // 套餐ID
}
```

### 5.3 获取查看机会套餐
```
GET /payment/view-chance/packages
```

**响应**
```json
{
  "code": 0,
  "data": [
    { "id": 1, "count": 10, "price": 10 },
    { "id": 2, "count": 50, "price": 40 },
    { "id": 3, "count": 100, "price": 70 }
  ]
}
```

### 5.4 购买广告位
```
POST /payment/ad
```

**请求参数**
```json
{
  "adPosition": "banner",
  "imageUrl": "url",
  "linkType": "post",
  "linkPostId": 1,
  "startDate": "2026-02-01",
  "endDate": "2026-02-07"
}
```

### 5.5 获取钱包余额
```
GET /wallet/balance
```

**响应**
```json
{
  "code": 0,
  "data": {
    "balance": 520.00,
    "totalIncome": 1500.00,
    "totalWithdraw": 980.00
  }
}
```

### 5.6 提现
```
POST /wallet/withdraw
```

**请求参数**
```json
{
  "amount": 520.00
}
```

### 5.7 获取收入明细
```
GET /wallet/income-list
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | int | 否 | 页码 |
| pageSize | int | 否 | 每页数量 |

### 5.8 获取提现记录
```
GET /wallet/withdraw-list
```

### 5.9 微信支付回调
```
POST /payment/callback
```

---

## 6. 消息模块接口

### 6.1 获取消息列表
```
GET /message/list
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| category | string | 否 | system/business |
| page | int | 否 | 页码 |

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "category": "business",
        "title": "工资到账",
        "content": "您有一笔工资¥160.00已到账",
        "isRead": false,
        "createdAt": "2026-01-20 15:30"
      }
    ],
    "total": 20
  }
}
```

### 6.2 获取消息详情
```
GET /message/detail/:id
```

### 6.3 标记消息已读
```
POST /message/read/:id
```

### 6.4 全部标记已读
```
POST /message/read-all
```

### 6.5 获取未读消息数量
```
GET /message/unread-count
```

**响应**
```json
{
  "code": 0,
  "data": {
    "count": 5
  }
}
```

### 6.6 记录订阅授权状态
```
POST /message/subscribe
```

**请求参数**
```json
{
  "templateType": "audit_result",
  "authorized": true
}
```

---

## 7. 公共接口

### 7.1 图片上传
```
POST /common/upload
```

**请求参数**
- Content-Type: multipart/form-data
- file: 图片文件

**响应**
```json
{
  "code": 0,
  "data": {
    "url": "https://xxx.com/xxx.jpg"
  }
}
```

### 7.2 获取系统配置
```
GET /common/config
```

**响应**
```json
{
  "code": 0,
  "data": {
    "memberPriceMonthly": 99,
    "memberPriceYearly": 899,
    "newUserViewChances": 3,
    "viewChanceExpireDays": 7
  }
}
```

### 7.3 获取诚信曝光榜
```
GET /common/blacklist
```

---

## 8. 管理后台接口

### 8.1 管理员登录
```
POST /admin/login
```

**请求参数**
```json
{
  "username": "admin",
  "password": "xxx"
}
```

### 8.2 信息审核列表
```
GET /admin/info/list
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| status | string | 否 | pending/approved/rejected |
| infoType | string | 否 | 信息类型 |
| page | int | 否 | 页码 |

### 8.3 审核信息
```
POST /admin/info/audit
```

**请求参数**
```json
{
  "ids": [1, 2, 3],
  "action": "approve",  // approve | reject
  "rejectReason": ""
}
```

### 8.4 认证审核列表
```
GET /admin/cert/list
```

### 8.5 审核认证
```
POST /admin/cert/audit
```

**请求参数**
```json
{
  "userId": 1,
  "action": "approve",
  "rejectReason": ""
}
```

### 8.6 用户列表
```
GET /admin/user/list
```

### 8.7 用户详情
```
GET /admin/user/detail/:id
```

### 8.8 更新用户状态
```
PUT /admin/user/update/:id
```

**请求参数**
```json
{
  "accountStatus": "limited",
  "creditScore": 80
}
```

### 8.9 用工订单列表
```
GET /admin/job/list
```

### 8.10 分配人员
```
POST /admin/job/assign
```

**请求参数**
```json
{
  "jobId": 1,
  "selectedWorkerIds": [1, 2, 3, 4, 5],
  "supervisorId": 1,
  "commissionRate": 0.2
}
```

### 8.11 收入统计
```
GET /admin/finance/income
```

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

### 8.12 支出统计
```
GET /admin/finance/expense
```

### 8.13 交易明细
```
GET /admin/finance/transactions
```

### 8.14 获取/更新系统配置
```
GET /admin/config
PUT /admin/config
```

### 8.15 关键词黑名单管理
```
GET /admin/keyword/list
POST /admin/keyword/add
DELETE /admin/keyword/:id
```

### 8.16 工种管理
```
GET /admin/job-type/list
POST /admin/job-type/add
PUT /admin/job-type/:id
```

### 8.17 开放城市管理
```
GET /admin/city/list
POST /admin/city/add
DELETE /admin/city/:id
```

### 8.18 诚信曝光管理
```
GET /admin/blacklist/list
POST /admin/blacklist/add
DELETE /admin/blacklist/:id
```

### 8.19 举报处理
```
GET /admin/report/list
POST /admin/report/handle
```

**请求参数**
```json
{
  "reportId": 1,
  "action": "resolve",  // resolve | reject
  "handleResult": "已下架违规信息",
  "deductCredit": true,
  "addToBlacklist": false
}
```

### 8.20 广告审核
```
GET /admin/ad/list
POST /admin/ad/audit
```

### 8.21 数据统计
```
GET /admin/stats/user      // 用户统计
GET /admin/stats/business  // 业务统计
GET /admin/stats/finance   // 财务统计
```

---

## 9. 接口汇总

### 用户模块 (7个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /user/login | POST | 微信登录 |
| /user/select-type | POST | 选择用户类型 |
| /user/profile | GET | 获取用户信息 |
| /user/cert/enterprise | POST | 提交企业认证 |
| /user/cert/worker | POST | 提交临工认证 |
| /user/cert/status | GET | 获取认证状态 |
| /user/credit | GET | 获取信用分 |

### 供需信息模块 (10个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /info/publish | POST | 发布信息 |
| /info/list | GET | 获取信息列表 |
| /info/detail/:id | GET | 获取信息详情 |
| /info/contact/:id | POST | 查看联系方式 |
| /info/my | GET | 我的发布 |
| /info/:id | DELETE | 删除信息 |
| /info/report | POST | 举报信息 |
| /info/promote | POST | 购买置顶 |
| /info/categories | GET | 获取品类列表 |
| /info/cities | GET | 获取开放城市 |

### 临工用工模块 (16个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /job/publish | POST | 发布用工需求 |
| /job/list | GET | 获取用工列表 |
| /job/detail/:id | GET | 获取用工详情 |
| /job/apply | POST | 报名应聘 |
| /job/my-applications | GET | 我的报名列表 |
| /job/confirm-attendance | POST | 确认出勤 |
| /job/checkin | POST | 签到 |
| /job/start-work | POST | 确认开工 |
| /job/upload-photo | POST | 上传现场照片 |
| /job/record-piece | POST | 录入计件数 |
| /job/end-work | POST | 确认收工 |
| /job/report-issue | POST | 异常上报 |
| /job/settlement/:jobId | GET | 获取结算单 |
| /job/confirm-settlement | POST | 确认结算 |
| /job/pay | POST | 支付工资 |
| /job/types | GET | 获取工种列表 |

### 支付财务模块 (9个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /payment/member | POST | 购买会员 |
| /payment/view-chance | POST | 购买查看机会 |
| /payment/view-chance/packages | GET | 获取套餐 |
| /payment/ad | POST | 购买广告位 |
| /payment/callback | POST | 支付回调 |
| /wallet/balance | GET | 获取余额 |
| /wallet/withdraw | POST | 提现 |
| /wallet/income-list | GET | 收入明细 |
| /wallet/withdraw-list | GET | 提现记录 |

### 消息模块 (6个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /message/list | GET | 消息列表 |
| /message/detail/:id | GET | 消息详情 |
| /message/read/:id | POST | 标记已读 |
| /message/read-all | POST | 全部已读 |
| /message/unread-count | GET | 未读数量 |
| /message/subscribe | POST | 订阅授权 |

### 公共接口 (3个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /common/upload | POST | 图片上传 |
| /common/config | GET | 系统配置 |
| /common/blacklist | GET | 诚信曝光榜 |

### 管理后台接口 (21个)
| 接口 | 方法 | 说明 |
|-----|------|------|
| /admin/login | POST | 管理员登录 |
| /admin/info/list | GET | 信息审核列表 |
| /admin/info/audit | POST | 审核信息 |
| /admin/cert/list | GET | 认证审核列表 |
| /admin/cert/audit | POST | 审核认证 |
| /admin/user/list | GET | 用户列表 |
| /admin/user/detail/:id | GET | 用户详情 |
| /admin/user/update/:id | PUT | 更新用户 |
| /admin/job/list | GET | 用工订单列表 |
| /admin/job/assign | POST | 分配人员 |
| /admin/finance/income | GET | 收入统计 |
| /admin/finance/expense | GET | 支出统计 |
| /admin/finance/transactions | GET | 交易明细 |
| /admin/config | GET/PUT | 系统配置 |
| /admin/keyword/* | CRUD | 关键词管理 |
| /admin/job-type/* | CRUD | 工种管理 |
| /admin/city/* | CRUD | 城市管理 |
| /admin/blacklist/* | CRUD | 曝光管理 |
| /admin/report/* | GET/POST | 举报处理 |
| /admin/ad/* | GET/POST | 广告审核 |
| /admin/stats/* | GET | 数据统计 |

---

**接口总数：72个**

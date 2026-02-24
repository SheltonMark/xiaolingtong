# API接口规范

## 通用规范

### 请求格式
- **协议**: HTTPS
- **方法**: GET, POST, PUT, DELETE
- **Content-Type**: application/json
- **鉴权**: Bearer Token (JWT)

### 响应格式
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 错误码
- `0`: 成功
- `1xxx`: 通用错误
  - `1000`: 参数错误
  - `1001`: 服务器错误
- `2xxx`: 认证错误
  - `2000`: 未登录
  - `2001`: token过期
  - `2002`: 无权限
- `3xxx`: 业务错误
  - `3000`: 用户不存在
  - `3001`: 认证未通过
  - `3002`: 查看机会不足

---

## 1. 用户体系模块 (7个接口)

### 1.1 微信登录
```
POST /api/auth/wechat-login
```
**请求参数**:
```json
{
  "code": "微信登录code"
}
```
**响应**:
```json
{
  "code": 0,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "openid": "xxx",
      "nickname": "用户昵称",
      "avatar": "头像URL",
      "user_type": "enterprise|worker|null",
      "is_certified": false
    }
  }
}
```

### 1.2 获取用户信息
```
GET /api/users/profile
```
**响应**: 同上user对象

### 1.3 选择用户类型
```
PUT /api/users/type
```
**请求参数**:
```json
{
  "user_type": "enterprise|worker"
}
```

### 1.4 提交企业认证
```
POST /api/enterprise-cert
```
**请求参数**:
```json
{
  "company_name": "公司名称",
  "license_no": "营业执照号",
  "license_image": "营业执照图片URL",
  "legal_name": "法人姓名",
  "legal_id_card": "法人身份证号",
  "legal_id_front": "身份证正面URL",
  "legal_id_back": "身份证反面URL"
}
```

### 1.5 提交临工认证
```
POST /api/worker-cert
```
**请求参数**:
```json
{
  "real_name": "真实姓名",
  "id_card": "身份证号",
  "id_front": "身份证正面URL",
  "id_back": "身份证反面URL",
  "phone": "手机号"
}
```

---

## 2. 供需信息模块 (10个接口)

### 2.1 发布信息
```
POST /api/info-posts
```
**请求参数**:
```json
{
  "type": "purchase|inventory|processing",
  "category_id": 1,
  "title": "标题",
  "content": "内容",
  "images": ["图片URL"],
  "contact_name": "联系人",
  "contact_phone": "联系电话",
  "location": "地区"
}
```

### 2.2 信息列表
```
GET /api/info-posts?type=purchase&page=1&limit=20&keyword=关键词
```
**响应**:
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "type": "purchase",
        "title": "标题",
        "content": "内容摘要",
        "images": ["图片URL"],
        "location": "地区",
        "is_top": false,
        "created_at": "2026-02-16T10:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 2.3 信息详情
```
GET /api/info-posts/:id
```
**响应**: 包含完整信息，联系方式脱敏

### 2.4 查看联系方式
```
POST /api/info-posts/:id/view-contact
```
**响应**:
```json
{
  "code": 0,
  "data": {
    "contact_name": "张三",
    "contact_phone": "13800138000"
  }
}
```

### 2.5 购买查看机会
```
POST /api/view-chances/buy
```
**请求参数**:
```json
{
  "package_id": 1
}
```

---

## 3. 临工用工模块 (16个接口)

### 3.1 发布用工
```
POST /api/job-posts
```
**请求参数**:
```json
{
  "job_type_id": 1,
  "title": "标题",
  "description": "描述",
  "required_count": 10,
  "salary_type": "hourly|piece",
  "salary": 25.00,
  "work_date": "2026-02-20",
  "work_start_time": "08:00",
  "work_end_time": "18:00",
  "location": "工作地点",
  "latitude": 31.23,
  "longitude": 121.47
}
```

### 3.2 用工列表
```
GET /api/job-posts?page=1&limit=20&latitude=31.23&longitude=121.47
```
**响应**: 按距离排序的用工列表

### 3.3 报名
```
POST /api/job-applications
```
**请求参数**:
```json
{
  "job_post_id": 1
}
```

### 3.4 人员分配
```
PUT /api/job-posts/:id/assign
```
**请求参数**:
```json
{
  "worker_ids": [1, 2, 3],
  "manager_id": 1
}
```

### 3.5 出勤确认
```
PUT /api/job-applications/:id/confirm
```

### 3.6 打卡
```
POST /api/job-checkins
```
**请求参数**:
```json
{
  "job_post_id": 1,
  "type": "in|out",
  "latitude": 31.23,
  "longitude": 121.47
}
```

### 3.7 提交结算单
```
POST /api/job-settlements
```
**请求参数**:
```json
{
  "job_post_id": 1,
  "details": [
    {
      "worker_id": 1,
      "work_hours": 8,
      "work_pieces": 0,
      "salary": 160.00
    }
  ],
  "photos": ["现场照片URL"]
}
```

---

## 4. 支付财务模块 (9个接口)

### 4.1 购买会员
```
POST /api/orders/vip
```
**请求参数**:
```json
{
  "package_type": "month|year"
}
```
**响应**: 返回支付参数

### 4.2 微信支付统一下单
```
POST /api/payments/unifiedorder
```
**请求参数**:
```json
{
  "order_id": "订单号"
}
```
**响应**: 微信支付参数

### 4.3 支付回调
```
POST /api/payments/notify
```
**说明**: 微信支付回调接口

### 4.4 钱包查询
```
GET /api/wallet
```
**响应**:
```json
{
  "code": 0,
  "data": {
    "balance": 1000.00,
    "frozen": 0.00
  }
}
```

### 4.5 提现
```
POST /api/withdrawals
```
**请求参数**:
```json
{
  "amount": 100.00
}
```

---

## 5. 消息通知模块 (6个接口)

### 5.1 消息列表
```
GET /api/messages?page=1&limit=20
```

### 5.2 消息详情
```
GET /api/messages/:id
```

### 5.3 标记已读
```
PUT /api/messages/:id/read
```

### 5.4 未读数量
```
GET /api/messages/unread-count
```

---

## 6. 公共接口 (3个接口)

### 6.1 获取工种列表
```
GET /api/common/job-types
```

### 6.2 获取开通城市
```
GET /api/common/cities
```

### 6.3 图片上传
```
POST /api/common/upload
```
**请求**: multipart/form-data
**响应**: 图片URL

---

## 7. 管理后台模块 (21个接口)

### 7.1 管理员登录
```
POST /api/admin/login
```

### 7.2 用户管理
```
GET /api/admin/users
PUT /api/admin/users/:id/credit-score
PUT /api/admin/users/:id/ban
```

### 7.3 认证审核
```
GET /api/admin/cert/pending
PUT /api/admin/cert/:id/review
```

### 7.4 信息审核
```
GET /api/admin/info-posts/pending
PUT /api/admin/info-posts/:id/review
```

### 7.5 财务统计
```
GET /api/admin/finance/stats
GET /api/admin/finance/transactions
```

### 7.6 系统配置
```
GET /api/admin/config
PUT /api/admin/config
```

---

**最后更新**: 2026-02-16

# 企业端和零工端用户名重复问题分析

## 问题描述
企业端和零工端的"我的"界面中，用户名显示相同，都是使用同一个数据库字段。

## 根本原因分析

### 数据流程

```
后端 getProfile() 接口
  ↓
返回用户信息：
  - role: 'enterprise' 或 'worker'
  - nickname: 用户昵称（两个角色都有）
  - certName: 认证名称
    - 企业端：companyName（公司名称）
    - 零工端：realName（真实姓名）
  ↓
前端 mine.js loadProfile()
  ↓
显示逻辑：certName || nickname || '未认证用户'
  ↓
问题：当 certName 为空时，两个角色都显示 nickname
```

### 代码位置

**后端** - `server/src/modules/auth/auth.service.ts`

```typescript
async getProfile(userId: number) {
  const user = await this.userRepo.findOne({ where: { id: userId } });

  let certStatus = 'none';
  let certName = '';

  if (user.role === 'enterprise') {
    const cert = await this.userRepo.manager.findOne(EnterpriseCert, {
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (cert) {
      certStatus = cert.status;
      certName = cert.companyName;  // ← 企业端：公司名称
    }
  } else if (user.role === 'worker') {
    const cert = await this.userRepo.manager.findOne(WorkerCert, {
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (cert) {
      certStatus = cert.status;
      certName = cert.realName;  // ← 零工端：真实姓名
    }
  }

  return {
    id: user.id,
    role: user.role,
    nickname: user.nickname,  // ← 两个角色都有
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    beanBalance: user.beanBalance,
    isMember: user.isMember,
    memberExpireAt: user.memberExpireAt,
    creditScore: user.creditScore,
    certStatus,
    certName,  // ← 企业端是 companyName，零工端是 realName
    isVerified: certStatus === 'approved',
    inviteCode: user.inviteCode,
  };
}
```

**前端** - `pages/mine/mine.js`

```javascript
loadProfile() {
  get('/auth/profile').then(res => {
    const user = res.data

    // 认证状态
    const certStatus = user.certStatus || 'none'
    const certName = user.certName || ''

    this.setData({
      nickname: user.nickname || '',  // ← 存储 nickname
      certName,  // ← 存储 certName
      // ...
    })
  })
}
```

**前端模板** - `pages/mine/mine.wxml`

```wxml
<!-- 企业端（第 16 行） -->
<text class="user-name">{{certName || nickname || '未认证用户'}}</text>

<!-- 零工端（第 162 行） -->
<text class="user-name">{{certName || nickname || '未认证用户'}}</text>
```

## 问题场景

### 场景 1：用户已认证
```
企业端：
  - certName = "张三公司"（来自 EnterpriseCert.companyName）
  - nickname = "zhangsan"
  - 显示：张三公司 ✅

零工端：
  - certName = "张三"（来自 WorkerCert.realName）
  - nickname = "zhangsan"
  - 显示：张三 ✅
```

### 场景 2：用户未认证（问题出现）
```
企业端：
  - certName = ""（未认证）
  - nickname = "zhangsan"
  - 显示：zhangsan ❌

零工端：
  - certName = ""（未认证）
  - nickname = "zhangsan"
  - 显示：zhangsan ❌
```

## 解决方案

### 方案 1：后端返回角色特定的名称字段（推荐）

修改 `server/src/modules/auth/auth.service.ts` 的 `getProfile()` 方法：

```typescript
async getProfile(userId: number) {
  const user = await this.userRepo.findOne({ where: { id: userId } });
  if (!user) return null;

  let certStatus = 'none';
  let certName = '';
  let displayName = user.nickname;  // ← 添加这行

  if (user.role === 'enterprise') {
    const cert = await this.userRepo.manager.findOne(EnterpriseCert, {
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (cert) {
      certStatus = cert.status;
      certName = cert.companyName;
      if (certStatus === 'approved') {
        displayName = cert.companyName;  // ← 已认证时显示公司名
      }
    }
  } else if (user.role === 'worker') {
    const cert = await this.userRepo.manager.findOne(WorkerCert, {
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (cert) {
      certStatus = cert.status;
      certName = cert.realName;
      if (certStatus === 'approved') {
        displayName = cert.realName;  // ← 已认证时显示真实姓名
      }
    }
  }

  return {
    id: user.id,
    role: user.role,
    nickname: user.nickname,
    displayName,  // ← 添加这个字段
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    beanBalance: user.beanBalance,
    isMember: user.isMember,
    memberExpireAt: user.memberExpireAt,
    creditScore: user.creditScore,
    certStatus,
    certName,
    isVerified: certStatus === 'approved',
    inviteCode: user.inviteCode,
  };
}
```

然后修改前端模板 `pages/mine/mine.wxml`：

```wxml
<!-- 企业端和零工端都改为 -->
<text class="user-name">{{displayName || '未认证用户'}}</text>
```

### 方案 2：前端根据角色处理

修改 `pages/mine/mine.js` 的 `loadProfile()` 方法：

```javascript
loadProfile() {
  get('/auth/profile').then(res => {
    const user = res.data
    const userRole = this.data.userRole

    // 认证状态
    const certStatus = user.certStatus || 'none'
    const certName = user.certName || ''

    // 根据角色和认证状态决定显示的名称
    let displayName = user.nickname || ''
    if (certStatus === 'approved') {
      displayName = certName || user.nickname || ''
    }

    this.setData({
      nickname: user.nickname || '',
      certName,
      displayName,  // ← 添加这个字段
      // ...
    })
  })
}
```

然后修改前端模板 `pages/mine/mine.wxml`：

```wxml
<!-- 企业端和零工端都改为 -->
<text class="user-name">{{displayName || '未认证用户'}}</text>
```

### 方案 3：前端根据角色和认证状态显示不同的字段

修改前端模板 `pages/mine/mine.wxml`：

```wxml
<!-- 企业端 -->
<view wx:if="{{userRole === 'enterprise'}}">
  <text class="user-name">{{certName || nickname || '未认证用户'}}</text>
</view>

<!-- 零工端 -->
<view wx:if="{{userRole === 'worker'}}">
  <text class="user-name">{{certName || nickname || '未认证用户'}}</text>
</view>
```

这个方案实际上和现在一样，所以不推荐。

## 推荐方案

**采用方案 1**（后端返回 displayName）的原因：

1. **职责清晰** - 后端负责确定显示的名称，前端只负责显示
2. **逻辑集中** - 所有的名称处理逻辑都在后端
3. **易于维护** - 如果需要改变显示规则，只需修改后端
4. **性能更好** - 前端不需要额外的逻辑处理

## 实现步骤

### 步骤 1：修改后端

编辑 `server/src/modules/auth/auth.service.ts`：

1. 在 `getProfile()` 方法中添加 `displayName` 字段
2. 根据角色和认证状态设置 `displayName`
3. 在返回对象中包含 `displayName`

### 步骤 2：修改前端

编辑 `pages/mine/mine.js`：

1. 在 `loadProfile()` 中存储 `displayName`

编辑 `pages/mine/mine.wxml`：

1. 将两个标题都改为使用 `{{displayName || '未认证用户'}}`

### 步骤 3：测试

1. 企业端已认证用户 - 应显示公司名称
2. 企业端未认证用户 - 应显示昵称
3. 零工端已认证用户 - 应显示真实姓名
4. 零工端未认证用户 - 应显示昵称

## 相关文件

- 后端：`server/src/modules/auth/auth.service.ts`
- 后端：`server/src/modules/auth/auth.controller.ts`
- 前端：`pages/mine/mine.js`
- 前端：`pages/mine/mine.wxml`
- 前端：`pages/mine/mine.json`

## 总结

问题的根本原因是：
- 后端正确地返回了 `certName`（企业端是公司名，零工端是真实姓名）
- 但前端在 `certName` 为空时，都显示 `nickname`（昵称）
- 而 `nickname` 对两个角色都是相同的

解决方案是让后端返回一个 `displayName` 字段，根据角色和认证状态预先计算好应该显示的名称，这样前端就不需要处理复杂的逻辑了。

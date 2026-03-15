# Settings 页面 - Nickname 编辑功能实现

## 问题背景
招工详情页面显示已有报名者，但无法显示报名者详情（名字、信用分、接单数）。

根本原因：Worker 的 nickname 字段为 NULL，因为前端没有提供设置 nickname 的入口。

## 解决方案
在 Settings 页面添加 nickname 编辑功能，让 Worker 能够设置自己的昵称。

## 实现内容

### 1. 前端修改

#### pages/settings/settings.wxml
- 添加"昵称"编辑入口（在"账号信息"分组中）
- 显示当前昵称（未设置时显示"未设置"）
- 添加昵称编辑模态框
  - 输入框（最多20字）
  - 字数统计（0/20）
  - 取消和保存按钮

#### pages/settings/settings.js
新增方法：
- `onNicknameTap()` - 打开编辑模态框
- `onCloseNicknameModal()` - 关闭模态框
- `onNicknameInput(e)` - 处理输入
- `onSaveNickname()` - 保存昵称

新增数据字段：
- `showNicknameModal` - 模态框显示状态
- `editingNickname` - 编辑中的昵称
- `savingNickname` - 保存状态

#### pages/settings/settings.wxss
新增样式：
- `.modal-overlay` - 模态框背景
- `.modal-content` - 模态框内容
- `.modal-header` - 模态框头部
- `.modal-body` - 模态框主体
- `.modal-footer` - 模态框底部
- `.nickname-input` - 输入框
- `.input-hint` - 字数统计
- `.btn-cancel` / `.btn-confirm` - 按钮

### 2. 后端
无需修改，`UserService.updateProfile()` 方法已存在，支持更新 nickname。

API 端点：`PUT /settings/profile`

## 工作流程

### 用户操作流程
1. 临工端进入 Settings 页面
2. 点击"昵称"行
3. 模态框弹出，显示当前昵称
4. 输入新昵称（最多20字）
5. 点击"保存"按钮
6. 调用 `PUT /settings/profile` API
7. 保存成功后：
   - 更新本地数据
   - 更新全局数据
   - 关闭模态框
   - 显示成功提示

### 数据同步流程
```
Worker 设置 nickname
    ↓
PUT /settings/profile { nickname: "张三" }
    ↓
数据库更新 users.nickname = "张三"
    ↓
Worker 报名
    ↓
创建 JobApplication 记录
    ↓
企业查看报名者
    ↓
获取 Worker 信息（包含 nickname）
    ↓
前端显示报名者详情（名字、信用分、接单数）
```

## 测试步骤

### 1. 基础功能测试
- [ ] 进入 Settings 页面，昵称显示"未设置"
- [ ] 点击昵称行，模态框弹出
- [ ] 输入昵称，字数统计正确
- [ ] 点击保存，API 调用成功
- [ ] 昵称已更新，模态框关闭
- [ ] 刷新页面，昵称仍然显示

### 2. 边界情况测试
- [ ] 输入空昵称，保存按钮禁用
- [ ] 输入超过20字，自动截断
- [ ] 网络错误时，显示错误提示
- [ ] 保存中时，禁用保存按钮（防止重复提交）

### 3. 集成测试
- [ ] 设置昵称后报名
- [ ] 企业端查看报名者详情
- [ ] 验证报名者名字、信用分、接单数都显示正确

## 代码位置

### 前端
- `pages/settings/settings.js` - 业务逻辑
- `pages/settings/settings.wxml` - 页面模板
- `pages/settings/settings.wxss` - 样式

### 后端
- `server/src/modules/user/user.service.ts` - updateProfile 方法
- `server/src/modules/user/user.controller.ts` - updateProfile 端点

## 相关文件
- `ROOT_CAUSE_ANALYSIS.md` - 根本原因分析
- `DIAGNOSIS_COMPLETE.md` - 诊断完成报告
- `mysqp_q.txt` - 数据库诊断查询结果

## 后续步骤
1. 测试 nickname 编辑功能
2. 临工端设置昵称
3. 报名后验证企业端能否看到报名者详情
4. 如果仍有问题，检查：
   - 后端是否正确保存 nickname
   - 前端是否正确显示 worker 信息
   - 是否需要清除小程序缓存

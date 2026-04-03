# 风险板块定制与内容安全整改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让风险板块分类名称可由后台配置驱动，并补齐前台真实发布入口的内容安全校验。

**Architecture:** 后端复用 `sys_configs` 维护风险分类显示名，在 `exposure` 模块新增公开设置接口供小程序读取；前台风险列表与发布页统一消费该接口。内容安全继续走 `WechatSecurityService`，把昵称、联系资料、聊天发送纳入校验链路。

**Tech Stack:** NestJS, TypeORM, Jest, WeChat Mini Program JS/WXML

---

### Task 1: 后端风险分类配置

**Files:**
- Modify: `server/src/modules/exposure/exposure.service.ts`
- Modify: `server/src/modules/exposure/exposure.controller.ts`
- Modify: `server/src/modules/exposure/exposure.module.ts`
- Modify: `server/src/modules/admin/admin.service.ts`
- Test: `server/src/modules/exposure/exposure.integration.spec.ts`

- [ ] Step 1: 写失败测试，覆盖公开设置接口、配置名称映射、头像首字映射
- [ ] Step 2: 跑 `npm test -- exposure.integration.spec.ts --runInBand`，确认失败原因正确
- [ ] Step 3: 实现 `GET /exposures/settings` 与分类配置读取逻辑
- [ ] Step 4: 再跑同一组测试，确认通过

### Task 2: 内容安全补齐

**Files:**
- Modify: `server/src/modules/chat/chat.service.ts`
- Modify: `server/src/modules/chat/chat.module.ts`
- Modify: `server/src/modules/user/user.service.ts`
- Test: `server/src/modules/chat/chat.service.spec.ts`
- Test: `server/src/modules/user/user.service.spec.ts`

- [ ] Step 1: 写失败测试，覆盖聊天发送、昵称更新、联系资料更新的安全校验调用
- [ ] Step 2: 跑相关 Jest 文件，确认先红
- [ ] Step 3: 实现安全校验调用并补齐依赖注入
- [ ] Step 4: 再跑测试确认变绿

### Task 3: 小程序风险板块联动

**Files:**
- Create: `utils/exposure-settings.js`
- Modify: `pages/exposure-board/exposure-board.js`
- Modify: `pages/exposure-board/exposure-board.wxml`
- Modify: `pages/exposure/exposure.js`
- Modify: `pages/exposure/exposure.wxml`
- Modify: `pages/exposure-detail/exposure-detail.js`
- Modify: `pages/exposure-detail/exposure-detail.wxml`
- Modify: `custom-tab-bar/index.wxml`
- Modify: `app.json`
- Modify: `pages/my-favorites/my-favorites.js`
- Modify: `pages/my-favorites/my-favorites.wxml`
- Modify: `pages/mine/mine.wxml`
- Modify: `pages/agreement-confirm/agreement-confirm.js`
- Modify: `pages/settings/settings.js`

- [ ] Step 1: 接入风险分类设置读取与发布页选择
- [ ] Step 2: 调整“曝光”相关前台可见文案为中性风险文案
- [ ] Step 3: 去掉头像上传失败时的本地图片兜底
- [ ] Step 4: 跑语法检查与目标页面联动验证

### Task 4: 验证

**Files:**
- Verify only

- [ ] Step 1: 跑后端目标测试
- [ ] Step 2: 跑前端目标 JS 语法检查
- [ ] Step 3: 检查 diff，确认未触碰无关文件
- [ ] Step 4: 汇总结果与残余风险

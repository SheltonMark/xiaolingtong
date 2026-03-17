# Task Plan: 临工管理员考勤管理系统

## 结论
设计文档 `Docs/zheng/BRAINSTORM_WORKER_FLOW.md` 对应功能在核查时并未真正完成，主要问题是：

| 模块 | 核查结果 | 关键缺口 |
|------|---------|---------|
| work-record | 部分完成 | 页面已接 `/work/orders`，可继续使用 |
| checkin | 部分完成 | 前端能发 `workerId`，但后端不支持主管代签到；签到照片也未进入后续核验流程 |
| work-session | 未完成 | 只有壳层展示，缺少工时录入、完整考勤报告提交、收工时提交核验单 |
| anomaly | 未完成 | 页面参数与后端接口字段不匹配，无法形成有效异常记录 |
| work attendance API | 部分完成 | 有接口雏形，但权限、目标工人、日期明细、提交后状态流转不完整 |
| settlement attendance view | 部分完成 | 能展示基础表格，但缺少提交时间、现场照片、真实考勤确认闭环 |

## 实施计划

| 阶段 | 工作项 | 状态 |
|------|-------|------|
| 1 | 核查设计文档与当前代码完成度，识别假完成项 | 已完成 |
| 2 | 补齐 `work` 模块后端：主管代签到、代记工、异常记录、考勤提交/查询/确认 | 已完成 |
| 3 | 补齐主管端页面：签到照片贯通、工时录入、计件保存、收工提交核验单 | 已完成 |
| 4 | 补齐异常页和企业端考勤汇总：照片、提交时间、确认操作 | 已完成 |
| 5 | 补齐测试与校验：work 模块单测、TypeScript 构建检查、前端脚本语法检查 | 已完成 |

## 已落地范围

- `server/src/modules/work` 现已支持：
  - 主管代签到指定工人
  - 主管为指定工人录入工时/计件
  - 异常记录按目标工人写入当日考勤
  - `GET /work/attendance/:jobId/:date` 日期明细查询
  - 企业确认考勤后进入结算流转
- `pages/work-session` 现已支持：
  - 计时工时录入与保存
  - 计件录入与保存
  - 现场照片缓存与核验单提交
  - 收工时自动提交考勤报告并创建结算单
- `pages/anomaly` 现已支持：
  - 读取当班工人
  - 选择目标工人并提交异常
- `pages/settlement` 现已支持：
  - 展示考勤提交时间
  - 预览现场照片
  - 企业确认考勤后刷新汇总与结算信息

## 验证记录

- `npm test -- work.service.spec.ts work.service.phase3.spec.ts work.integration.spec.ts --runInBand`
- `npm run build`
- `npx tsc -p tsconfig.build.json --noEmit`
- `node -c pages/work-session/work-session.js`
- `node -c pages/anomaly/anomaly.js`
- `node -c pages/checkin/checkin.js`
- `node -c pages/settlement/settlement.js`

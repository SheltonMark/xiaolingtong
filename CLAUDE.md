# 小灵通项目工作规则

## 文件组织规则

### Markdown 文档

**核心设计文档（保留并提交）：**
- `CLAUDE.md` - 项目工作规则
- `Docs/` 目录下所有文档（产品需求、架构设计、API 规范等）
- `server/README.md` - 服务器文档

**非核心文档（不提交）：**
- 诊断分析文档：`DIAGNOSTIC_*.md`, `DIAGNOSIS_*.md`, `ANALYSIS_*.md`
- 实现方案文档：`PLAN_*.md`, `PHASE*.md`, `*_IMPLEMENTATION.md`
- 部署/修复指南：`DEPLOY_*.md`, `*_FIX_*.md`, `*_GUIDE.md`
- 临时文档：`DEBUG_*.md`, `TEMP_*.md`, `findings.md`, `progress.md`, `task_plan.md`

所有非核心文档放到 `Docs/zheng` 目录，自动被 `.gitignore` 忽略

## 代码提交规则

- 使用中文 commit message
- 格式：`type: 描述`（如 `fix:`, `feat:`, `refactor:` 等）
- 包含 `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>` 签名

## 开发流程

1. 分析需求 → 生成方案文档到 `Docs/zheng`（不提交）
2. 实现代码 → 提交到 git
3. 验证测试 → 更新核心设计文档（如需要则提交）


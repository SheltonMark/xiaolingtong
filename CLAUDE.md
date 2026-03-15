# 小灵通项目工作规则

## 文件组织规则

### Markdown 文档
所有生成的 `.md` 文件统一放到 `Docs/zheng` 目录下，包括：
- 诊断文档
- 分析报告
- 实现方案
- 部署指南
- 其他技术文档

**示例：**
```
Docs/zheng/DIAGNOSTIC_ANALYSIS.md
Docs/zheng/IMPLEMENTATION_PLAN.md
Docs/zheng/DEPLOY_GUIDE.md
```

### 提交规则
- **核心设计文档**才提交（如架构设计、API 规范等）
- **非核心文档**不提交（如诊断报告、临时分析、部署指南等）
- 非核心文档自动被 `.gitignore` 忽略

**核心设计文档示例：**
- `ARCHITECTURE.md` - 系统架构设计
- `API_SPEC.md` - API 规范
- `DATABASE_SCHEMA.md` - 数据库设计

**非核心文档示例（不提交）：**
- `DIAGNOSTIC_*.md` - 诊断分析
- `DEPLOY_*.md` - 部署指南
- `ANALYSIS_*.md` - 临时分析
- `PLAN_*.md` - 实现方案

## 代码提交规则

- 使用中文 commit message
- 格式：`type: 描述`（如 `fix:`, `feat:`, `refactor:` 等）
- 包含 `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>` 签名

## 开发流程

1. 分析需求 → 生成方案文档到 `Docs/zheng`（不提交）
2. 实现代码 → 提交到 git
3. 验证测试 → 更新核心设计文档（如需要则提交）


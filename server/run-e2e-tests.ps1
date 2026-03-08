#!/usr/bin/env pwsh

# =====================================================
# 小灵通项目 - E2E 测试完整执行脚本 (PowerShell)
# =====================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   小灵通项目 - E2E 测试完整执行脚本                        ║" -ForegroundColor Cyan
Write-Host "║   MySQL 安装 + 启动 + 数据库初始化 + E2E 测试             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# =====================================================
# 第 1 步: 检查 MySQL 是否已安装
# =====================================================

Write-Host "[1/5] 检查 MySQL 安装状态..." -ForegroundColor Yellow
Write-Host ""

$mysqlVersion = mysql --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ MySQL 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按照以下步骤安装 MySQL 8.0：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "方法 1: 使用 Chocolatey (推荐)" -ForegroundColor Green
    Write-Host "  1. 以管理员身份打开 PowerShell"
    Write-Host "  2. 运行: choco install mysql"
    Write-Host ""
    Write-Host "方法 2: 从官方网站下载" -ForegroundColor Green
    Write-Host "  1. 访问: https://dev.mysql.com/downloads/mysql/"
    Write-Host "  2. 下载 MySQL 8.0 Windows 安装程序"
    Write-Host "  3. 运行安装程序"
    Write-Host "  4. 设置 root 密码和 xlt 用户"
    Write-Host ""
    Write-Host "方法 3: 使用 Docker" -ForegroundColor Green
    Write-Host "  1. 安装 Docker Desktop"
    Write-Host "  2. 运行: docker run --name xiaolingtong-mysql ..."
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "✅ MySQL 已安装" -ForegroundColor Green
Write-Host $mysqlVersion
Write-Host ""

# =====================================================
# 第 2 步: 启动 MySQL 服务
# =====================================================

Write-Host "[2/5] 启动 MySQL 服务..." -ForegroundColor Yellow
Write-Host ""

$service = Get-Service -Name MySQL80 -ErrorAction SilentlyContinue
if ($null -eq $service) {
    Write-Host "⚠️  MySQL80 服务未找到" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请手动启动 MySQL：" -ForegroundColor Yellow
    Write-Host "  1. 按 Win + R"
    Write-Host "  2. 输入 services.msc"
    Write-Host "  3. 找到 MySQL80"
    Write-Host "  4. 右键 -> 启动"
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

if ($service.Status -ne "Running") {
    Write-Host "启动 MySQL 服务..." -ForegroundColor Yellow
    Start-Service -Name MySQL80 -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

Write-Host "✅ MySQL 服务已启动" -ForegroundColor Green
Write-Host ""

# =====================================================
# 第 3 步: 验证 MySQL 连接
# =====================================================

Write-Host "[3/5] 验证 MySQL 连接..." -ForegroundColor Yellow
Write-Host ""

$mysqlTest = mysql -h localhost -u xlt -pXLT2026db -e "SELECT 1" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 无法连接到 MySQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查：" -ForegroundColor Yellow
    Write-Host "  1. MySQL 服务是否运行"
    Write-Host "  2. 用户名和密码是否正确"
    Write-Host "  3. 端口 3306 是否被占用"
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "✅ MySQL 连接成功" -ForegroundColor Green
Write-Host ""

# =====================================================
# 第 4 步: 初始化测试数据库
# =====================================================

Write-Host "[4/5] 初始化测试数据库..." -ForegroundColor Yellow
Write-Host ""

Set-Location server

# 运行数据库初始化脚本
& .\scripts\init-test-db.bat

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 数据库初始化失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "✅ 测试数据库初始化完成" -ForegroundColor Green
Write-Host ""

# =====================================================
# 第 5 步: 运行 E2E 测试
# =====================================================

Write-Host "[5/5] 运行 E2E 测试..." -ForegroundColor Yellow
Write-Host ""

# 检查 npm 依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装 npm 依赖..." -ForegroundColor Yellow
    npm install
}

# 检查 Playwright 浏览器
Write-Host "🌐 检查 Playwright 浏览器..." -ForegroundColor Yellow
npx playwright install --with-deps

# 运行 E2E 测试
Write-Host ""
Write-Host "🧪 运行 E2E 测试..." -ForegroundColor Yellow
Write-Host ""

npm run test:e2e

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ E2E 测试执行失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查：" -ForegroundColor Yellow
    Write-Host "  1. 应用服务器是否可以启动"
    Write-Host "  2. 数据库连接是否正常"
    Write-Host "  3. 测试用例是否有效"
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host ""
Write-Host "✅ E2E 测试执行完成" -ForegroundColor Green
Write-Host ""

# =====================================================
# 查看测试报告
# =====================================================

Write-Host "📊 查看测试报告..." -ForegroundColor Yellow
Write-Host ""

npx playwright show-report

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ E2E 测试执行完成！                                    ║" -ForegroundColor Green
Write-Host "║   📊 测试报告已生成                                        ║" -ForegroundColor Green
Write-Host "║   📁 报告位置: playwright-report/index.html               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Read-Host "按 Enter 键退出"

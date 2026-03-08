@echo off
REM =====================================================
REM 小灵通项目 - E2E 测试完整执行脚本
REM =====================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   小灵通项目 - E2E 测试完整执行脚本                        ║
echo ║   MySQL 安装 + 启动 + 数据库初始化 + E2E 测试             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM 设置颜色
color 0A

REM =====================================================
REM 第 1 步: 检查 MySQL 是否已安装
REM =====================================================

echo [1/5] 检查 MySQL 安装状态...
echo.

mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL 未安装
    echo.
    echo 请按照以下步骤安装 MySQL 8.0：
    echo.
    echo 方法 1: 使用 Chocolatey (推荐)
    echo   1. 以管理员身份打开 PowerShell
    echo   2. 运行: choco install mysql
    echo.
    echo 方法 2: 从官方网站下载
    echo   1. 访问: https://dev.mysql.com/downloads/mysql/
    echo   2. 下载 MySQL 8.0 Windows 安装程序
    echo   3. 运行安装程序
    echo   4. 设置 root 密码和 xlt 用户
    echo.
    echo 方法 3: 使用 Docker
    echo   1. 安装 Docker Desktop
    echo   2. 运行: docker run --name xiaolingtong-mysql ^
    echo      -e MYSQL_ROOT_PASSWORD=root123456 ^
    echo      -e MYSQL_USER=xlt ^
    echo      -e MYSQL_PASSWORD=XLT2026db ^
    echo      -e MYSQL_DATABASE=xiaolingtong ^
    echo      -p 3306:3306 ^
    echo      -d mysql:8.0
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 已安装
mysql --version
echo.

REM =====================================================
REM 第 2 步: 启动 MySQL 服务
REM =====================================================

echo [2/5] 启动 MySQL 服务...
echo.

REM 检查 MySQL80 服务状态
sc query MySQL80 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MySQL80 服务未找到
    echo.
    echo 请手动启动 MySQL：
    echo   1. 按 Win + R
    echo   2. 输入 services.msc
    echo   3. 找到 MySQL80
    echo   4. 右键 -> 启动
    echo.
    pause
    exit /b 1
)

REM 启动 MySQL 服务
net start MySQL80 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MySQL80 服务启动失败
    echo.
    echo 请检查：
    echo   1. MySQL 是否正确安装
    echo   2. 磁盘空间是否充足
    echo   3. 防火墙设置
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 服务已启动
echo.

REM =====================================================
REM 第 3 步: 验证 MySQL 连接
REM =====================================================

echo [3/5] 验证 MySQL 连接...
echo.

mysql -h localhost -u xlt -pXLT2026db -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo ❌ 无法连接到 MySQL
    echo.
    echo 请检查：
    echo   1. MySQL 服务是否运行
    echo   2. 用户名和密码是否正确
    echo   3. 端口 3306 是否被占用
    echo.
    echo 尝试使用 root 账户连接：
    echo   mysql -h localhost -u root -p
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 连接成功
echo.

REM =====================================================
REM 第 4 步: 初始化测试数据库
REM =====================================================

echo [4/5] 初始化测试数据库...
echo.

cd server

REM 运行数据库初始化脚本
call scripts\init-test-db.bat

if errorlevel 1 (
    echo ❌ 数据库初始化失败
    pause
    exit /b 1
)

echo ✅ 测试数据库初始化完成
echo.

REM =====================================================
REM 第 5 步: 运行 E2E 测试
REM =====================================================

echo [5/5] 运行 E2E 测试...
echo.

REM 检查 npm 依赖
if not exist "node_modules" (
    echo 📦 安装 npm 依赖...
    call npm install
)

REM 检查 Playwright 浏览器
echo 🌐 检查 Playwright 浏览器...
call npx playwright install --with-deps

REM 运行 E2E 测试
echo.
echo 🧪 运行 E2E 测试...
echo.

call npm run test:e2e

if errorlevel 1 (
    echo.
    echo ❌ E2E 测试执行失败
    echo.
    echo 请检查：
    echo   1. 应用服务器是否可以启动
    echo   2. 数据库连接是否正常
    echo   3. 测试用例是否有效
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ E2E 测试执行完成
echo.

REM =====================================================
REM 查看测试报告
REM =====================================================

echo 📊 查看测试报告...
echo.

call npx playwright show-report

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   ✅ E2E 测试执行完成！                                    ║
echo ║   📊 测试报告已生成                                        ║
echo ║   📁 报告位置: playwright-report/index.html               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

pause

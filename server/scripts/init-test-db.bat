@echo off
REM 小灵通项目 - 数据库初始化脚本 (Windows)
REM 用于 E2E 测试环境

setlocal enabledelayedexpansion

echo.
echo 🔧 初始化 E2E 测试数据库...
echo.

REM 数据库配置
set DB_HOST=localhost
set DB_PORT=3306
set DB_USERNAME=xlt
set DB_PASSWORD=XLT2026db
set DB_NAME=xiaolingtong_test

REM 检查 MySQL 是否已安装
echo 📡 检查 MySQL 连接...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USERNAME% -p%DB_PASSWORD% -e "SELECT 1" >nul 2>&1

if errorlevel 1 (
    echo.
    echo ❌ 无法连接到 MySQL 数据库
    echo.
    echo 请确保 MySQL 服务已启动：
    echo   - Windows: net start MySQL80
    echo   - 或在 Services 中启动 MySQL 服务
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 连接成功
echo.

REM 创建测试数据库
echo 📦 创建测试数据库...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USERNAME% -p%DB_PASSWORD% -e "DROP DATABASE IF EXISTS `%DB_NAME%`; CREATE DATABASE `%DB_NAME%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON `%DB_NAME%`.* TO '%DB_USERNAME%'@'%%'; FLUSH PRIVILEGES;"

if errorlevel 1 (
    echo.
    echo ❌ 创建数据库失败
    echo.
    pause
    exit /b 1
)

echo ✅ 测试数据库创建成功
echo.

REM 设置环境变量
set NODE_ENV=test
set DB_DATABASE=%DB_NAME%

echo ✅ 数据库初始化完成！
echo.
echo 现在可以运行 E2E 测试：
echo   npm run test:e2e
echo.
pause

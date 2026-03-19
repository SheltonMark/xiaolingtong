@echo off
REM 数据库自动修复脚本 - Windows 版本
REM 用途: 启动 MySQL 服务并执行数据库修复

setlocal enabledelayedexpansion

echo.
echo ========================================
echo 小灵通数据库自动修复脚本
echo ========================================
echo.

REM 检查 MySQL 服务
echo [1/5] 检查 MySQL 服务状态...
sc query MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL80 服务已安装
) else (
    sc query MySQL57 >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ MySQL57 服务已安装
    ) else (
        echo ✗ 未找到 MySQL 服务
        echo 请确保 MySQL 已安装
        pause
        exit /b 1
    )
)

REM 启动 MySQL 服务
echo.
echo [2/5] 启动 MySQL 服务...
net start MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL80 服务已启动
) else (
    net start MySQL57 >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ MySQL57 服务已启动
    ) else (
        echo ✗ 无法启动 MySQL 服务
        pause
        exit /b 1
    )
)

REM 等待 MySQL 启动
echo.
echo [3/5] 等待 MySQL 启动...
timeout /t 3 /nobreak

REM 测试连接
echo.
echo [4/5] 测试数据库连接...
mysql -h localhost -u xlt -pXLT2026db xiaolingtong -e "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 数据库连接成功
) else (
    echo ✗ 数据库连接失败
    echo 请检查:
    echo   - MySQL 服务是否正在运行
    echo   - 连接凭证是否正确 (user: xlt, password: XLT2026db)
    echo   - 数据库是否存在 (xiaolingtong)
    pause
    exit /b 1
)

REM 执行修复脚本
echo.
echo [5/5] 执行数据库修复脚本...
if exist "fix-all-columns.sql" (
    mysql -h localhost -u xlt -pXLT2026db xiaolingtong < fix-all-columns.sql
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo ✓ 数据库修复成功！
        echo ========================================
        echo.
        echo 下一步:
        echo 1. 重启后端服务器: npm run start
        echo 2. 清除小程序缓存并重新加载
        echo 3. 进入招工详情页面验证
        echo.
    ) else (
        echo.
        echo ✗ 数据库修复失败！
        echo 请检查错误信息
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✗ 找不到修复脚本: fix-all-columns.sql
    echo 请确保在 server 目录中运行此脚本
    pause
    exit /b 1
)

echo.
pause

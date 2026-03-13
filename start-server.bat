@echo off
REM 小灵通服务器启动脚本 (Windows)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           小灵通服务器启动脚本 (Windows)                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装
    echo.
    echo 请安装 Docker Desktop:
    echo   https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo ✅ Docker 已安装
echo.

REM 检查 Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose 未安装
    pause
    exit /b 1
)

echo ✅ Docker Compose 已安装
echo.

REM 启动 Docker 服务
echo 📦 启动数据库和 Redis...
docker-compose up -d

REM 等待服务就绪
echo.
echo ⏳ 等待服务就绪...
timeout /t 5 /nobreak

REM 检查服务状态
echo.
echo 📊 服务状态:
docker-compose ps

echo.
echo ✅ 数据库已启动
echo.

REM 启动服务器
echo 🚀 启动服务器...
echo.

cd server
call npm run start:dev

pause

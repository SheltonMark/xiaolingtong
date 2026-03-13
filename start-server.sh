#!/bin/bash

# 小灵通服务器启动脚本

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           小灵通服务器启动脚本                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo ""
    echo "请安装 Docker Desktop:"
    echo "  https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

echo "✅ Docker Compose 已安装"
echo ""

# 启动 Docker 服务
echo "📦 启动数据库和 Redis..."
docker-compose up -d

# 等待服务就绪
echo ""
echo "⏳ 等待服务就绪..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "✅ 数据库已启动"
echo ""

# 启动服务器
echo "🚀 启动服务器..."
echo ""

cd server
npm run start:dev

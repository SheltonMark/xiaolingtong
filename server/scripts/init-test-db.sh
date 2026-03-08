#!/bin/bash

# 小灵通项目 - 数据库初始化脚本
# 用于 E2E 测试环境

set -e

echo "🔧 初始化 E2E 测试数据库..."

# 数据库配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USERNAME=${DB_USERNAME:-xlt}
DB_PASSWORD=${DB_PASSWORD:-XLT2026db}
DB_NAME=${DB_NAME:-xiaolingtong_test}

# 检查 MySQL 连接
echo "📡 检查 MySQL 连接..."
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "SELECT 1" > /dev/null 2>&1; then
    echo "❌ 无法连接到 MySQL 数据库"
    echo "请确保 MySQL 服务已启动："
    echo "  - Windows: net start MySQL80"
    echo "  - macOS: brew services start mysql"
    echo "  - Linux: sudo systemctl start mysql"
    exit 1
fi

echo "✅ MySQL 连接成功"

# 创建测试数据库
echo "📦 创建测试数据库..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "
    DROP DATABASE IF EXISTS \`$DB_NAME\`;
    CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USERNAME'@'%';
    FLUSH PRIVILEGES;
"

echo "✅ 测试数据库创建成功"

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
export NODE_ENV=test
export DB_DATABASE=$DB_NAME

# 如果有迁移脚本，运行它
if [ -f "scripts/migrate.sh" ]; then
    bash scripts/migrate.sh
else
    echo "⚠️  未找到迁移脚本，跳过迁移"
fi

echo "✅ 数据库初始化完成！"
echo ""
echo "现在可以运行 E2E 测试："
echo "  npm run test:e2e"

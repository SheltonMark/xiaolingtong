# 部署指南

## 环境要求

### 服务器配置
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **硬盘**: 100GB以上 SSD
- **带宽**: 10Mbps以上
- **操作系统**: Ubuntu 20.04 LTS / CentOS 7+

### 软件依赖
- Node.js 18.x
- MySQL 8.0
- Redis 6.x
- Nginx 1.20+
- PM2 (进程管理)

---

## 开发环境部署

### 1. 安装Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 验证安装
```

### 2. 安装MySQL
```bash
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

创建数据库:
```sql
CREATE DATABASE xiaolingtong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xlt_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON xiaolingtong.* TO 'xlt_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 安装Redis
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 4. 克隆项目
```bash
git clone <repository-url>
cd xiaolingtong
```

### 5. 后端部署
```bash
cd backend
npm install
cp .env.example .env
# 编辑.env配置文件
npm run migration:run  # 执行数据库迁移
npm run dev  # 开发模式启动
```

### 6. 前端部署
```bash
cd wx-miniprogram
npm install
# 使用微信开发者工具打开项目
```

---

## 生产环境部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt-get update
sudo apt-get upgrade

# 安装必要软件
sudo apt-get install git nginx certbot python3-certbot-nginx
```

### 2. 配置环境变量
```bash
# /home/deploy/xiaolingtong/backend/.env
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=xlt_user
DB_PASSWORD=<strong_password>
DB_DATABASE=xiaolingtong

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>

# JWT配置
JWT_SECRET=<random_secret_key>
JWT_EXPIRES_IN=7d

# 微信配置
WECHAT_APPID=<your_appid>
WECHAT_SECRET=<your_secret>

# 微信支付配置
WECHAT_PAY_MCHID=<merchant_id>
WECHAT_PAY_KEY=<api_key>
WECHAT_PAY_CERT_PATH=/path/to/cert.pem
WECHAT_PAY_KEY_PATH=/path/to/key.pem
```

### 3. 构建后端
```bash
cd /home/deploy/xiaolingtong/backend
npm install --production
npm run build
```

### 4. 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/main.js --name xiaolingtong-api

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs xiaolingtong-api

# 重启应用
pm2 restart xiaolingtong-api
```

### 5. 配置Nginx
```nginx
# /etc/nginx/sites-available/xiaolingtong
server {
    listen 80;
    server_name api.xiaolingtong.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/xiaolingtong /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. 配置SSL证书
```bash
sudo certbot --nginx -d api.xiaolingtong.com
```

### 7. 配置防火墙
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 数据库迁移

### 创建迁移文件
```bash
npm run migration:create -- CreateUsersTable
```

### 执行迁移
```bash
npm run migration:run
```

### 回滚迁移
```bash
npm run migration:revert
```

---

## 数据备份

### MySQL备份脚本
```bash
#!/bin/bash
# /home/deploy/scripts/backup-mysql.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups/mysql"
DB_NAME="xiaolingtong"
DB_USER="xlt_user"
DB_PASS="password"

mkdir -p $BACKUP_DIR

mysqldump -u$DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 删除7天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### 设置定时备份
```bash
# 每天凌晨2点执行备份
crontab -e
0 2 * * * /home/deploy/scripts/backup-mysql.sh
```

---

## 监控配置

### PM2监控
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 系统监控
```bash
# 安装htop
sudo apt-get install htop

# 查看系统资源
htop
```

---

## 故障排查

### 后端无法启动
```bash
# 查看PM2日志
pm2 logs xiaolingtong-api

# 查看错误日志
tail -f /home/deploy/xiaolingtong/backend/logs/error.log

# 检查端口占用
netstat -tulpn | grep 3000
```

### 数据库连接失败
```bash
# 检查MySQL状态
sudo systemctl status mysql

# 测试连接
mysql -u xlt_user -p -h localhost xiaolingtong
```

### Redis连接失败
```bash
# 检查Redis状态
sudo systemctl status redis

# 测试连接
redis-cli ping
```

---

## 性能优化

### MySQL优化
```sql
-- 添加索引
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_job_posts_status ON job_posts(status);
CREATE INDEX idx_job_posts_work_date ON job_posts(work_date);

-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

### Redis优化
```bash
# 配置最大内存
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Nginx优化
```nginx
# 开启gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 配置缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 7d;
}
```

---

## 小程序发布

### 1. 配置服务器域名
在微信公众平台配置:
- request合法域名: `https://api.xiaolingtong.com`
- uploadFile合法域名: `https://api.xiaolingtong.com`
- downloadFile合法域名: `https://api.xiaolingtong.com`

### 2. 上传代码
- 使用微信开发者工具
- 点击"上传"
- 填写版本号和备注

### 3. 提交审核
- 登录微信公众平台
- 进入版本管理
- 提交审核

### 4. 发布上线
- 审核通过后
- 点击"发布"

---

## 回滚方案

### 代码回滚
```bash
# 查看提交历史
git log --oneline

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新构建
npm run build

# 重启服务
pm2 restart xiaolingtong-api
```

### 数据库回滚
```bash
# 恢复备份
gunzip < backup_20260216_020000.sql.gz | mysql -u xlt_user -p xiaolingtong
```

---

**最后更新**: 2026-02-16

# 部署指南

本项目支持两种部署模式：开发环境和生产环境。

## 🔧 开发环境部署

**特点：**
- 使用Django开发服务器
- 代码热重载
- 调试模式开启
- 适合本地开发测试

**部署命令：**
```bash
./deploy.sh          # 标准部署
./deploy_safe.sh     # 安全部署（有确认提示）
```

**访问地址：** http://localhost:8000

## 🚀 生产环境部署

**特点：**
- 使用Nginx + Gunicorn
- 高性能和安全性
- 静态文件优化服务
- 适合服务器部署

**部署命令：**
```bash
./deploy_prod.sh
```

**访问地址：** http://localhost

## 📁 文件上传位置

### 开发环境
- 文件保存在：`项目根目录/media/uploads/`
- 可以直接在文件系统中查看

### 生产环境
- 文件保存在：Docker容器内的 `/app/media/uploads/`
- 通过Docker volume持久化存储
- 可以通过以下命令查看：
```bash
# 进入容器查看文件
docker compose -f docker-compose.prod.yml exec web ls -la /app/media/uploads/

# 从容器复制文件到主机
docker compose -f docker-compose.prod.yml cp web:/app/media/uploads/filename.ext ./
```

## 🛠️ 常用管理命令

### 开发环境
```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 进入容器
docker compose exec web bash
```

### 生产环境
```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 查看Nginx日志
docker compose -f docker-compose.prod.yml logs nginx

# 查看Django应用日志
docker compose -f docker-compose.prod.yml logs web

# 停止服务
docker compose -f docker-compose.prod.yml down

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 进入Django容器
docker compose -f docker-compose.prod.yml exec web bash

# 进入Nginx容器
docker compose -f docker-compose.prod.yml exec nginx sh
```

## 🔍 故障排除

### 检查服务状态
```bash
# 开发环境
docker compose ps

# 生产环境
docker compose -f docker-compose.prod.yml ps
```

### 健康检查
```bash
# 生产环境健康检查
curl http://localhost/health/
```

### 重新构建镜像
```bash
# 开发环境
docker compose build --no-cache

# 生产环境
docker compose -f docker-compose.prod.yml build --no-cache
```

## 📊 性能对比

| 特性 | 开发环境 | 生产环境 |
|------|----------|----------|
| Web服务器 | Django runserver | Nginx + Gunicorn |
| 并发处理 | 单线程 | 多进程 |
| 静态文件 | Django处理 | Nginx直接服务 |
| 性能 | 低 | 高 |
| 安全性 | 基础 | 增强 |
| 适用场景 | 开发测试 | 生产部署 |
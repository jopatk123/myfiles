# 生产环境部署指南

## 服务器准备

### 1. 安装Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

### 2. 克隆项目
```bash
git clone <your-repo-url> personal-cloud
cd personal-cloud
```

### 3. 生产环境配置（可选）

创建 `.env` 文件：
```bash
# .env
DEBUG=False
SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=your-domain.com,your-server-ip
```

修改 `settings.py` 以读取环境变量：
```python
import os
from pathlib import Path

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-key')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')
```

### 4. 运行部署

**开发环境部署（Django开发服务器）：**
```bash
./deploy.sh
# 访问: http://localhost:8000
```

**生产环境部署（Nginx + Gunicorn）：**
```bash
./deploy_prod.sh
# 访问: http://localhost
```

## 常用命令

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

## 端口配置

默认端口是8000，如需修改，编辑 `docker-compose.yml`：
```yaml
ports:
  - "80:8000"  # 将容器8000端口映射到主机80端口
```
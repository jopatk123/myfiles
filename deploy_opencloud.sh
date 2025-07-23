#!/bin/bash

# 生产环境部署脚本
# 可配置服务器信息
SERVER_IP=${SERVER_IP:-"43.163.120.212"}
SERVER_TYPE=${SERVER_TYPE:-"OpenCloudOS"}
set -e

# 错误处理函数
handle_error() {
    echo "❌ 部署过程中发生错误！"
    echo "🔧 请检查上面的错误信息"
    echo "📋 常见问题排查："
    echo "   1. 检查Docker服务是否正常运行"
    echo "   2. 检查网络连接是否正常"
    echo "   3. 检查磁盘空间是否充足"
    echo "   4. 查看详细日志: docker compose -f docker-compose.prod.yml logs"
    exit 1
}

# 设置错误处理
trap handle_error ERR

echo "🚀 开始在 $SERVER_TYPE 服务器上部署..."
echo "📍 服务器IP: $SERVER_IP"
echo "⏰ 部署时间: $(date)"

# 预检查
echo "🔍 执行部署前检查..."
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 未找到 docker-compose.prod.yml 文件"
    exit 1
fi

if [ ! -f "Dockerfile.prod" ]; then
    echo "❌ 未找到 Dockerfile.prod 文件"
    exit 1
fi

if [ ! -f "nginx.conf" ]; then
    echo "❌ 未找到 nginx.conf 文件"
    exit 1
fi

echo "✅ 配置文件检查通过"

# 检查Docker和Docker Compose是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "💡 在 OpenCloudOS 上安装 Docker："
    echo "   sudo yum install -y docker"
    echo "   sudo systemctl start docker"
    echo "   sudo systemctl enable docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装"
    echo "💡 安装 Docker Compose："
    echo "   sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "   sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# 检查防火墙设置
echo "🔥 检查防火墙设置..."
if command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --state &> /dev/null; then
        echo "📋 当前防火墙状态："
        firewall-cmd --list-ports
        echo "💡 如果端口80未开放，请运行："
        echo "   sudo firewall-cmd --permanent --add-port=80/tcp"
        echo "   sudo firewall-cmd --reload"
    fi
fi

# 拉取最新代码
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull origin main || git pull origin master || echo "⚠️  Git拉取失败或未配置"
fi

# 停止现有容器
if [ "$(docker compose -f docker-compose.prod.yml ps -q 2>/dev/null)" ]; then
    echo "🛑 停止现有生产容器..."
    docker compose -f docker-compose.prod.yml down
fi

# 清理旧镜像（可选，节省空间）
echo "🧹 清理未使用的Docker镜像..."
docker image prune -f

# 构建新镜像
echo "🔨 构建生产镜像..."
docker compose -f docker-compose.prod.yml build --no-cache

# 设置环境变量
echo "� 设置生生产环境变量..."
export DEBUG=False
export SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null || echo 'django-insecure-pb8ss3+s*8jt3cyh$igyt3cx71xh#mtq@xo=u1l%l+)4*dlj5k')

# 启动服务
echo "🔄 启动生产服务..."
docker compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate

# 收集静态文件
echo "📦 收集静态文件..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput

# 检查服务状态
echo "📊 当前运行的容器："
docker compose -f docker-compose.prod.yml ps

# 健康检查
echo "🔍 测试应用健康状态..."
sleep 5

# 检查容器是否正常运行
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ 容器启动失败！"
    echo "🔧 查看错误日志："
    docker compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi

# 检查应用响应
echo "🌐 测试应用访问..."
for i in {1..10}; do
    if curl -f http://localhost/health/ > /dev/null 2>&1; then
        echo "✅ 应用响应正常！"
        break
    elif [ $i -eq 10 ]; then
        echo "⚠️  应用健康检查失败，但容器正在运行"
        echo "🔧 请检查容器日志："
        echo "   docker compose -f docker-compose.prod.yml logs"
        echo "🔧 或尝试直接访问应用："
        echo "   curl -v http://localhost/"
    else
        echo "⏳ 等待应用启动... ($i/10)"
        sleep 3
    fi
done

# 显示系统资源使用情况
echo ""
echo "💻 系统资源使用情况："
echo "内存使用："
free -h
echo ""
echo "磁盘使用："
df -h
echo ""

echo "✅ OpenCloudOS 生产环境部署完成！"
echo ""
echo "🌐 访问地址："
echo "   外网: http://$SERVER_IP"
echo "   内网: http://localhost"
echo ""
echo "📝 常用命令："
echo "   查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "   停止服务: docker compose -f docker-compose.prod.yml down"
echo "   重启服务: docker compose -f docker-compose.prod.yml restart"
echo "   进入容器: docker compose -f docker-compose.prod.yml exec web bash"
echo ""
echo "🔧 故障排除："
echo "   如果无法访问，请检查："
echo "   1. 防火墙是否开放80端口"
echo "   2. 云服务器安全组是否允许80端口"
echo "   3. 容器是否正常运行"
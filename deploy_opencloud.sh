#!/bin/bash

# 生产环境部署脚本
# 可配置服务器信息
SERVER_IP=${SERVER_IP:-"43.163.120.212"}
SERVER_TYPE=${SERVER_TYPE:-"OpenCloudOS"}
PREFERRED_PORTS=(80 8080 8081 8082 8083 8084 8085 8086 8087 8088 8089 8090)
SELECTED_PORT=""
set -e

# 端口检测函数
check_port() {
    local port=$1
    if command -v ss &> /dev/null; then
        ss -tlnp | grep ":$port " > /dev/null 2>&1
    elif command -v netstat &> /dev/null; then
        netstat -tlnp | grep ":$port " > /dev/null 2>&1
    else
        # 使用lsof作为备选
        lsof -i :$port > /dev/null 2>&1
    fi
}

# 查找可用端口函数
find_available_port() {
    echo "🔍 检测可用端口..."
    
    for port in "${PREFERRED_PORTS[@]}"; do
        if ! check_port $port; then
            echo "✅ 端口 $port 可用"
            SELECTED_PORT=$port
            return 0
        else
            echo "⚠️  端口 $port 已被占用"
        fi
    done
    
    echo "❌ 所有预设端口都被占用，尝试查找其他可用端口..."
    
    # 在8091-8199范围内查找可用端口
    for port in {8091..8199}; do
        if ! check_port $port; then
            echo "✅ 找到可用端口: $port"
            SELECTED_PORT=$port
            return 0
        fi
    done
    
    echo "❌ 无法找到可用端口！"
    return 1
}

# 更新docker-compose文件端口配置
update_docker_compose_port() {
    local port=$1
    echo "🔧 更新Docker Compose配置文件端口为: $port"
    
    # 备份原文件
    cp docker-compose.prod.yml docker-compose.prod.yml.backup
    
    # 使用sed替换端口配置
    sed -i "s/- \"[0-9]*:80\"/- \"$port:80\"/g" docker-compose.prod.yml
    
    echo "✅ Docker Compose端口配置已更新"
}

# 错误处理函数
handle_error() {
    echo "❌ 部署过程中发生错误！"
    echo "🔧 请检查上面的错误信息"
    echo "📋 常见问题排查："
    echo "   1. 检查Docker服务是否正常运行"
    echo "   2. 检查网络连接是否正常"
    echo "   3. 检查磁盘空间是否充足"
    echo "   4. 查看详细日志: docker compose -f docker-compose.prod.yml logs"
    
    # 恢复备份文件
    if [ -f "docker-compose.prod.yml.backup" ]; then
        echo "🔄 恢复Docker Compose配置文件..."
        mv docker-compose.prod.yml.backup docker-compose.prod.yml
    fi
    
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

# 端口检测和配置
if ! find_available_port; then
    echo "❌ 无法找到可用端口，部署终止"
    exit 1
fi

echo "🎯 选择端口: $SELECTED_PORT"

# 更新Docker Compose配置
update_docker_compose_port $SELECTED_PORT

# 检查防火墙设置
echo "🔥 检查防火墙设置..."
if command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --state &> /dev/null; then
        echo "📋 当前防火墙状态："
        firewall-cmd --list-ports
        echo "💡 如果端口$SELECTED_PORT未开放，请运行："
        echo "   sudo firewall-cmd --permanent --add-port=$SELECTED_PORT/tcp"
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
    if curl -f http://localhost:$SELECTED_PORT/health/ > /dev/null 2>&1; then
        echo "✅ 应用响应正常！"
        break
    elif [ $i -eq 10 ]; then
        echo "⚠️  应用健康检查失败，但容器正在运行"
        echo "🔧 请检查容器日志："
        echo "   docker compose -f docker-compose.prod.yml logs"
        echo "🔧 或尝试直接访问应用："
        echo "   curl -v http://localhost:$SELECTED_PORT/"
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

# 清理备份文件
if [ -f "docker-compose.prod.yml.backup" ]; then
    rm docker-compose.prod.yml.backup
fi

echo ""
echo "🎉 =================================="
echo "✅ OpenCloudOS 生产环境部署完成！"
echo "🎉 =================================="
echo ""
echo "📊 部署信息："
echo "   🖥️  服务器类型: $SERVER_TYPE"
echo "   📍 服务器IP: $SERVER_IP"
echo "   🔌 使用端口: $SELECTED_PORT"
echo "   ⏰ 部署时间: $(date)"
echo ""
echo "🌐 访问地址："
echo "   🌍 外网访问: http://$SERVER_IP:$SELECTED_PORT"
echo "   🏠 内网访问: http://localhost:$SELECTED_PORT"
echo ""
echo "📝 管理命令："
echo "   📋 查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "   🛑 停止服务: docker compose -f docker-compose.prod.yml down"
echo "   🔄 重启服务: docker compose -f docker-compose.prod.yml restart"
echo "   💻 进入容器: docker compose -f docker-compose.prod.yml exec web bash"
echo "   📊 查看状态: docker compose -f docker-compose.prod.yml ps"
echo ""
echo "🔧 故障排除："
echo "   如果无法访问，请检查："
echo "   1. 防火墙是否开放$SELECTED_PORT端口"
echo "   2. 云服务器安全组是否允许$SELECTED_PORT端口"
echo "   3. 容器是否正常运行"
echo ""
echo "💡 提示："
if [ "$SELECTED_PORT" != "80" ]; then
    echo "   ⚠️  应用部署在端口$SELECTED_PORT上（80端口被占用）"
    echo "   🔗 请使用完整URL访问: http://$SERVER_IP:$SELECTED_PORT"
else
    echo "   ✅ 应用部署在标准HTTP端口80上"
fi
echo ""
echo "🚀 部署成功！享受你的应用吧！"
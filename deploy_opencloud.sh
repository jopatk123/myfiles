#!/bin/bash

# 生产环境部署脚本
# 可配置服务器信息
SERVER_IP=${SERVER_IP:-"43.163.120.212"}
SERVER_TYPE=${SERVER_TYPE:-"OpenCloudOS"}
PREFERRED_PORTS=(80 8080 8081 8082 8083 8084 8085 8086 8087 8088 8089 8090)
SELECTED_PORT=""
PROJECT_NAME=$(basename "$(pwd)")
COMPOSE_PROJECT_NAME="${PROJECT_NAME}_prod"
EXISTING_CONTAINERS=""
set -e

# 检测相同项目容器函数
check_existing_containers() {
    echo "🔍 检测是否已有相同项目的容器运行..."
    
    # 检查当前目录的docker-compose容器
    local current_containers=$(docker compose -f docker-compose.prod.yml ps -q 2>/dev/null || echo "")
    
    # 检查是否有同名项目的容器
    local project_containers=$(docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "")
    
    # 检查是否有相同镜像名称的容器
    local image_containers=$(docker ps -a --filter "ancestor=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "")
    
    if [ -n "$current_containers" ]; then
        echo "⚠️  发现当前项目的容器正在运行："
        docker compose -f docker-compose.prod.yml ps
        EXISTING_CONTAINERS="current"
        return 0
    fi
    
    if [ -n "$project_containers" ] && [ "$project_containers" != "NAMES\tSTATUS\tPORTS" ]; then
        echo "⚠️  发现同名项目的容器："
        echo "$project_containers"
        EXISTING_CONTAINERS="project"
        return 0
    fi
    
    if [ -n "$image_containers" ] && [ "$image_containers" != "NAMES\tSTATUS\tPORTS" ]; then
        echo "⚠️  发现相同镜像的容器："
        echo "$image_containers"
        EXISTING_CONTAINERS="image"
        return 0
    fi
    
    echo "✅ 未发现相同项目的容器"
    return 1
}

# 处理现有容器函数
handle_existing_containers() {
    if [ -z "$EXISTING_CONTAINERS" ]; then
        return 0
    fi
    
    echo ""
    echo "🤔 发现已存在的容器，请选择处理方式："
    echo "   1) 停止并替换现有容器（推荐）"
    echo "   2) 保留现有容器，使用不同端口部署新实例"
    echo "   3) 取消部署"
    echo ""
    
    while true; do
        read -p "请输入选择 (1/2/3): " choice
        case $choice in
            1)
                echo "🛑 停止并清理现有容器..."
                if [ "$EXISTING_CONTAINERS" = "current" ]; then
                    docker compose -f docker-compose.prod.yml down -v
                else
                    # 停止所有相关容器
                    docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" -q | xargs -r docker stop
                    docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" -q | xargs -r docker rm
                fi
                echo "✅ 现有容器已清理"
                break
                ;;
            2)
                echo "📝 将为新实例寻找不同的端口..."
                break
                ;;
            3)
                echo "❌ 部署已取消"
                exit 0
                ;;
            *)
                echo "❌ 无效选择，请输入 1、2 或 3"
                ;;
        esac
    done
}

# 获取现有容器端口函数
get_existing_container_ports() {
    local used_ports=()
    
    # 获取所有Docker容器使用的端口
    local docker_ports=$(docker ps --format "table {{.Ports}}" | grep -oE '[0-9]+:' | sed 's/://' | sort -n | uniq 2>/dev/null || echo "")
    
    if [ -n "$docker_ports" ]; then
        while IFS= read -r port; do
            if [ -n "$port" ]; then
                used_ports+=($port)
            fi
        done <<< "$docker_ports"
    fi
    
    # 从首选端口列表中排除已使用的端口
    local available_ports=()
    for port in "${PREFERRED_PORTS[@]}"; do
        local port_used=false
        for used_port in "${used_ports[@]}"; do
            if [ "$port" = "$used_port" ]; then
                port_used=true
                break
            fi
        done
        if [ "$port_used" = false ] && ! check_port $port; then
            available_ports+=($port)
        fi
    done
    
    PREFERRED_PORTS=("${available_ports[@]}")
}

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
    echo "   sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\\$(uname -s)-\\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "   sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# 检测现有容器
if check_existing_containers; then
    handle_existing_containers
fi

# 获取现有容器端口信息，避免冲突
get_existing_container_ports

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

# 最终检查并停止现有容器（如果用户选择了替换）
if [ "$(docker compose -f docker-compose.prod.yml ps -q 2>/dev/null)" ]; then
    echo "🛑 停止现有生产容器..."
    docker compose -f docker-compose.prod.yml down
fi


# 构建新镜像（优化缓存判断）
echo "🔨 检查是否需要重建镜像..."

# 定义关键文件（根据项目实际依赖文件调整，如requirements.txt、package.json等）
CRITICAL_FILES=(
    "Dockerfile.prod" 
    "requirements.txt"  # Python项目依赖
    "package.json"      # Node.js项目依赖（如有）
    "docker-compose.prod.yml"
)

# 生成关键文件的哈希值，用于判断是否变更
generate_cache_key() {
    local cache_key=""
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            # 计算文件内容哈希（忽略空文件）
            local hash=$(sha256sum "$file" | awk '{print $1}')
            cache_key+="$hash"
        fi
    done
    echo "$cache_key" | sha256sum | awk '{print $1}'  # 合并为一个哈希值
}

# 检查上次构建的缓存key
CACHE_KEY_FILE=".docker_build_cache_key"
current_key=$(generate_cache_key)
previous_key=$(cat "$CACHE_KEY_FILE" 2>/dev/null || echo "")

if [ "$current_key" = "$previous_key" ] && docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${PROJECT_NAME}_prod"; then
    echo "✅ 关键文件未变更，使用现有镜像缓存"
    docker compose -f docker-compose.prod.yml build  # 不禁用缓存，直接使用缓存
else
    echo "🔄 关键文件有变更，重建镜像（禁用缓存）"
    docker compose -f docker-compose.prod.yml build --no-cache  # 仅变更时禁用缓存
    echo "$current_key" > "$CACHE_KEY_FILE"  # 保存新的缓存key
fi

# 设置环境变量
echo "🔧 设置生产环境变量..."
if [ ! -f ".env.prod" ]; then
    echo "🔑 生成新的 SECRET_KEY 并创建 .env.prod 文件..."
    SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    echo "SECRET_KEY=$SECRET_KEY" > .env.prod
    echo "DEBUG=False" >> .env.prod
    echo "✅ .env.prod 文件已创建"
else
    echo "✅ 使用现有的 .env.prod 文件"
fi

# 验证Django配置
echo "🧪 验证Django配置..."
if python3 test_django_config.py; then
    echo "✅ Django配置验证通过"
else
    echo "❌ Django配置验证失败，请检查配置"
    exit 1
fi

# 启动服务
echo "🔄 启动生产服务..."
docker compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查容器状态
echo "🔍 检查容器启动状态..."
sleep 5

# 显示容器日志以诊断问题
echo "📋 显示容器启动日志..."
docker compose -f docker-compose.prod.yml logs --tail=20

# 检查容器是否正在运行
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ 容器启动失败！显示完整日志："
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi

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
echo "    项目服名称: $PROJECT_NAME"
echo "   ️  服务器:类型: $SERVER_TYPE"
echo "     服务器IP: $SERVER_IP"
echo "    使用端口: $SELECTED_PORT"
echo "   ⏰ 部署时间: $(date)"
if [ -n "$EXISTING_CONTAINERS" ]; then
    echo "   ♻️  容器处理: 已处理现有容器冲突"
fi
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
echo "🐳 当前所有相关容器状态："
docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   无相关容器"
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
echo "🚀 部署成功！享受你的应用吧!"
#!/bin/bash

# OpenCloudOS 服务器环境检查脚本
echo "🔍 检查 OpenCloudOS 服务器环境..."
echo "📍 目标服务器: 43.163.120.212"
echo ""

# 检查操作系统
echo "💻 操作系统信息："
cat /etc/os-release 2>/dev/null || echo "无法获取系统信息"
echo ""

# 检查Docker
echo "🐳 Docker 状态："
if command -v docker &> /dev/null; then
    echo "✅ Docker 已安装"
    docker --version
    if systemctl is-active --quiet docker; then
        echo "✅ Docker 服务运行中"
    else
        echo "❌ Docker 服务未运行"
        echo "💡 启动命令: sudo systemctl start docker"
    fi
else
    echo "❌ Docker 未安装"
    echo "💡 安装命令:"
    echo "   sudo yum update -y"
    echo "   sudo yum install -y docker"
    echo "   sudo systemctl start docker"
    echo "   sudo systemctl enable docker"
fi
echo ""

# 检查Docker Compose
echo "🔧 Docker Compose 状态："
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose 已安装"
    docker-compose --version
elif docker compose version &> /dev/null 2>&1; then
    echo "✅ docker compose (plugin) 已安装"
    docker compose version
else
    echo "❌ Docker Compose 未安装"
    echo "💡 安装命令:"
    echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "   sudo chmod +x /usr/local/bin/docker-compose"
fi
echo ""

# 检查端口
echo "🔌 端口检查："
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":80 "; then
        echo "⚠️  端口80已被占用："
        netstat -tuln | grep ":80 "
    else
        echo "✅ 端口80可用"
    fi
else
    echo "💡 安装netstat: sudo yum install -y net-tools"
fi
echo ""

# 检查防火墙
echo "🔥 防火墙状态："
if command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --state &> /dev/null 2>&1; then
        echo "🔥 防火墙运行中"
        echo "开放的端口："
        firewall-cmd --list-ports
        if firewall-cmd --list-ports | grep -q "80/tcp"; then
            echo "✅ 端口80已开放"
        else
            echo "❌ 端口80未开放"
            echo "💡 开放命令:"
            echo "   sudo firewall-cmd --permanent --add-port=80/tcp"
            echo "   sudo firewall-cmd --reload"
        fi
    else
        echo "✅ 防火墙未运行"
    fi
elif command -v ufw &> /dev/null; then
    echo "🔥 使用UFW防火墙"
    ufw status
else
    echo "💡 未检测到防火墙管理工具"
fi
echo ""

# 检查磁盘空间
echo "💾 磁盘空间："
df -h
echo ""

# 检查内存
echo "🧠 内存使用："
free -h
echo ""

# 检查网络连接
echo "🌐 网络连接测试："
if ping -c 1 google.com &> /dev/null; then
    echo "✅ 外网连接正常"
else
    echo "❌ 外网连接异常"
fi

if ping -c 1 registry-1.docker.io &> /dev/null; then
    echo "✅ Docker Hub 连接正常"
else
    echo "❌ Docker Hub 连接异常"
fi
echo ""

echo "📋 检查完成！"
echo "💡 如果所有检查都通过，可以运行: ./deploy_opencloud.sh"
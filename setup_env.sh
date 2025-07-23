#!/bin/bash

echo "🔧 配置生产环境变量..."

# 获取当前服务器IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")

# 生成新的SECRET_KEY
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null)

if [ -z "$SECRET_KEY" ]; then
    echo "⚠️  无法生成SECRET_KEY，使用默认值"
    SECRET_KEY="django-insecure-$(openssl rand -hex 32)"
fi

echo "📝 创建 .env.prod 文件..."

cat > .env.prod << EOF
# 生产环境配置文件
DEBUG=False
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$SERVER_IP,localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=personal_cloud_project.settings
EOF

echo "✅ .env.prod 文件已创建"
echo "📍 服务器IP: $SERVER_IP"
echo "🔑 SECRET_KEY: ${SECRET_KEY:0:20}..."

echo ""
echo "⚠️  重要提醒："
echo "1. 请确保 $SERVER_IP 是你的正确服务器IP"
echo "2. 如果IP不正确，请手动编辑 .env.prod 文件"
echo "3. SECRET_KEY 已自动生成，请妥善保管"
echo ""
echo "🔧 如需手动编辑："
echo "   nano .env.prod"
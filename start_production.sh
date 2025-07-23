#!/bin/bash
set -e

echo "🚀 启动生产环境应用..."

# 等待数据库准备就绪（如果使用外部数据库）
echo "⏳ 等待数据库准备..."
sleep 5

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
python manage.py migrate --noinput

# 收集静态文件
echo "📦 收集静态文件..."
python manage.py collectstatic --noinput

# 创建媒体目录
echo "📁 创建媒体目录..."
mkdir -p /app/media/uploads
chmod 755 /app/media

echo "✅ 初始化完成，启动Gunicorn..."

# 启动Gunicorn
exec gunicorn personal_cloud_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
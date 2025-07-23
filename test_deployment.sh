#!/bin/bash

echo "🧪 测试部署配置..."

# 测试Django配置
echo "1. 测试Django配置..."
if python3 test_django_config.py; then
    echo "✅ Django配置正常"
else
    echo "❌ Django配置有问题"
    exit 1
fi

# 测试Docker构建
echo "2. 测试Docker镜像构建..."
if docker build -f Dockerfile.prod -t test-myfiles .; then
    echo "✅ Docker镜像构建成功"
else
    echo "❌ Docker镜像构建失败"
    exit 1
fi

# 清理测试镜像
docker rmi test-myfiles 2>/dev/null || true

echo "🎉 所有测试通过！可以进行部署。"
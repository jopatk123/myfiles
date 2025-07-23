#!/usr/bin/env python3
"""
测试存储空间限制功能
"""
import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'personal_cloud_project.settings')
django.setup()

from storage.utils import get_storage_usage_info, format_file_size
from storage.config import MAX_TOTAL_STORAGE

def test_storage_limit():
    print("=== 存储空间限制测试 ===")
    print(f"配置的最大存储容量: {format_file_size(MAX_TOTAL_STORAGE)}")
    
    # 获取当前存储使用情况
    storage_info = get_storage_usage_info()
    
    print(f"当前已使用: {storage_info['formatted_current']}")
    print(f"最大容量: {storage_info['formatted_max']}")
    print(f"可用空间: {storage_info['formatted_available']}")
    print(f"使用率: {storage_info['usage_percentage']:.1f}%")
    print(f"是否已满: {'是' if storage_info['is_full'] else '否'}")
    print(f"是否接近满: {'是' if storage_info['is_nearly_full'] else '否'}")
    
    print("\n=== 测试完成 ===")

if __name__ == '__main__':
    test_storage_limit()
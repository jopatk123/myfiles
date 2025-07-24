#!/usr/bin/env python3
"""
测试新建文件夹功能的脚本
"""
import os
import sys
import django
import json

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'personal_cloud_project.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from storage.models import Folder

def test_create_folder():
    """测试创建文件夹功能"""
    client = Client()
    
    # 测试数据
    test_data = {
        'name': '测试文件夹',
        'parent_id': None
    }
    
    print("测试创建文件夹功能...")
    print(f"测试数据: {test_data}")
    
    # 先获取 CSRF token
    response = client.get('/')
    csrf_token = None
    if 'csrftoken' in response.cookies:
        csrf_token = response.cookies['csrftoken'].value
        print(f"获取到 CSRF token: {csrf_token[:10]}...")
    
    # 发送 POST 请求
    headers = {'HTTP_X_CSRFTOKEN': csrf_token} if csrf_token else {}
    response = client.post(
        '/create-folder/',
        data=json.dumps(test_data),
        content_type='application/json',
        **headers
    )
    
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.content.decode()}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print("✅ 文件夹创建成功!")
            print(f"文件夹信息: {result.get('folder')}")
            
            # 验证数据库中是否真的创建了文件夹
            folder_name = test_data['name']
            if Folder.objects.filter(name=folder_name).exists():
                print("✅ 数据库验证通过，文件夹已保存")
                
                # 清理测试数据
                Folder.objects.filter(name=folder_name).delete()
                print("🧹 测试数据已清理")
            else:
                print("❌ 数据库验证失败，文件夹未保存")
        else:
            print(f"❌ 创建失败: {result.get('error')}")
    else:
        print(f"❌ 请求失败，状态码: {response.status_code}")

if __name__ == '__main__':
    test_create_folder()
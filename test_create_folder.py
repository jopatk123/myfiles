#!/usr/bin/env python3
"""
测试文件夹创建功能的脚本
"""

import os
import sys
import django
import json

# 设置Django环境
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'personal_cloud_project.settings')
django.setup()

from django.test import Client
from django.urls import reverse
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
    
    # 发送POST请求
    response = client.post(
        '/create-folder/',
        data=json.dumps(test_data),
        content_type='application/json'
    )
    
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.content.decode()}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print("✅ 文件夹创建成功！")
            
            # 验证数据库中是否存在该文件夹
            folder = Folder.objects.filter(name='测试文件夹').first()
            if folder:
                print(f"✅ 数据库验证成功，文件夹ID: {folder.id}")
                
                # 清理测试数据
                folder.delete()
                print("🧹 测试数据已清理")
            else:
                print("❌ 数据库验证失败，未找到创建的文件夹")
        else:
            print(f"❌ 创建失败: {result.get('error')}")
    else:
        print(f"❌ 请求失败，状态码: {response.status_code}")

def test_invalid_folder_names():
    """测试非法文件夹名称"""
    client = Client()
    
    invalid_names = ['test/folder', 'test\\folder', 'test:folder', 'test*folder', 'test?folder']
    
    print("\n测试非法文件夹名称...")
    
    for name in invalid_names:
        test_data = {
            'name': name,
            'parent_id': None
        }
        
        response = client.post(
            '/create-folder/',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        
        if response.status_code == 400:
            result = response.json()
            print(f"✅ 正确拒绝非法名称 '{name}': {result.get('error')}")
        else:
            print(f"❌ 未正确拒绝非法名称 '{name}'")

def test_empty_folder_name():
    """测试空文件夹名称"""
    client = Client()
    
    test_data = {
        'name': '',
        'parent_id': None
    }
    
    print("\n测试空文件夹名称...")
    
    response = client.post(
        '/create-folder/',
        data=json.dumps(test_data),
        content_type='application/json'
    )
    
    if response.status_code == 400:
        result = response.json()
        print(f"✅ 正确拒绝空名称: {result.get('error')}")
    else:
        print("❌ 未正确拒绝空名称")

if __name__ == '__main__':
    print("开始测试文件夹创建功能...\n")
    
    try:
        test_create_folder()
        test_invalid_folder_names()
        test_empty_folder_name()
        
        print("\n✅ 所有测试完成！")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
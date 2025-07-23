#!/usr/bin/env python
"""Django 项目管理命令行工具"""
import os
import sys


def main():
    """执行管理任务"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'personal_cloud_project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "无法导入 Django。请确保已正确安装 Django 并且 "
            "PYTHONPATH 环境变量中包含 Django。是否忘记激活虚拟环境？"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

"""
存储应用工具函数
"""
import os
import mimetypes
from django.core.files.storage import default_storage
from django.conf import settings


def format_file_size(size_bytes):
    """
    格式化文件大小显示
    """
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"


def get_file_icon_class(filename):
    """
    根据文件扩展名返回对应的图标类名
    """
    ext = os.path.splitext(filename)[1].lower()
    
    icon_map = {
        # 文档类
        '.pdf': 'fas fa-file-pdf text-danger',
        '.doc': 'fas fa-file-word text-primary',
        '.docx': 'fas fa-file-word text-primary',
        '.xls': 'fas fa-file-excel text-success',
        '.xlsx': 'fas fa-file-excel text-success',
        '.ppt': 'fas fa-file-powerpoint text-warning',
        '.pptx': 'fas fa-file-powerpoint text-warning',
        
        # 图片类
        '.jpg': 'fas fa-file-image text-info',
        '.jpeg': 'fas fa-file-image text-info',
        '.png': 'fas fa-file-image text-info',
        '.gif': 'fas fa-file-image text-info',
        '.bmp': 'fas fa-file-image text-info',
        '.svg': 'fas fa-file-image text-info',
        '.webp': 'fas fa-file-image text-info',
        
        # 视频类
        '.mp4': 'fas fa-file-video text-purple',
        '.avi': 'fas fa-file-video text-purple',
        '.mov': 'fas fa-file-video text-purple',
        '.wmv': 'fas fa-file-video text-purple',
        '.flv': 'fas fa-file-video text-purple',
        '.webm': 'fas fa-file-video text-purple',
        
        # 音频类
        '.mp3': 'fas fa-file-audio text-success',
        '.wav': 'fas fa-file-audio text-success',
        '.flac': 'fas fa-file-audio text-success',
        '.aac': 'fas fa-file-audio text-success',
        '.ogg': 'fas fa-file-audio text-success',
        
        # 压缩包类
        '.zip': 'fas fa-file-archive text-warning',
        '.rar': 'fas fa-file-archive text-warning',
        '.7z': 'fas fa-file-archive text-warning',
        '.tar': 'fas fa-file-archive text-warning',
        '.gz': 'fas fa-file-archive text-warning',
        
        # 文本类
        '.txt': 'fas fa-file-alt text-secondary',
        '.md': 'fas fa-file-alt text-info',
        '.rtf': 'fas fa-file-alt text-secondary',
        
        # 代码类
        '.py': 'fas fa-file-code text-success',
        '.js': 'fas fa-file-code text-warning',
        '.html': 'fas fa-file-code text-danger',
        '.css': 'fas fa-file-code text-primary',
        '.php': 'fas fa-file-code text-purple',
        '.java': 'fas fa-file-code text-danger',
        '.cpp': 'fas fa-file-code text-info',
        '.c': 'fas fa-file-code text-info',
        '.json': 'fas fa-file-code text-warning',
        '.xml': 'fas fa-file-code text-success',
        '.sql': 'fas fa-file-code text-primary',
    }
    
    return icon_map.get(ext, 'fas fa-file text-secondary')


def get_file_type_display(filename):
    """
    获取文件类型的显示名称
    """
    ext = os.path.splitext(filename)[1].lower()
    
    type_map = {
        '.pdf': 'PDF文档',
        '.doc': 'Word文档',
        '.docx': 'Word文档',
        '.xls': 'Excel表格',
        '.xlsx': 'Excel表格',
        '.ppt': 'PowerPoint演示',
        '.pptx': 'PowerPoint演示',
        '.jpg': '图片',
        '.jpeg': '图片',
        '.png': '图片',
        '.gif': '动图',
        '.mp4': '视频',
        '.avi': '视频',
        '.mp3': '音频',
        '.wav': '音频',
        '.zip': '压缩包',
        '.rar': '压缩包',
        '.txt': '文本文件',
        '.py': 'Python代码',
        '.js': 'JavaScript代码',
        '.html': 'HTML文件',
        '.css': 'CSS样式',
    }
    
    return type_map.get(ext, '未知类型')


def calculate_total_storage():
    """
    计算总存储空间使用量
    """
    from .models import UploadedFile
    
    total_size = 0
    files = UploadedFile.objects.all()
    
    for file_obj in files:
        try:
            total_size += file_obj.get_file_size()
        except:
            continue
    
    return total_size


def get_storage_usage_info():
    """
    获取存储空间使用情况信息
    """
    from .config import MAX_TOTAL_STORAGE
    
    current_usage = calculate_total_storage()
    max_storage = MAX_TOTAL_STORAGE
    usage_percentage = (current_usage / max_storage) * 100 if max_storage > 0 else 0
    available_space = max_storage - current_usage
    
    return {
        'current_usage': current_usage,
        'max_storage': max_storage,
        'usage_percentage': usage_percentage,
        'available_space': available_space,
        'formatted_current': format_file_size(current_usage),
        'formatted_max': format_file_size(max_storage),
        'formatted_available': format_file_size(available_space),
        'is_full': current_usage >= max_storage,
        'is_nearly_full': usage_percentage >= 90
    }


def validate_file_upload(file, check_total_storage=True):
    """
    验证上传的文件
    """
    from .config import MAX_UPLOAD_SIZE, ALLOWED_FILE_EXTENSIONS, FORBIDDEN_FILE_EXTENSIONS, MAX_TOTAL_STORAGE
    
    # 检查总存储空间（优先检查，如果空间不足就不需要检查单个文件大小）
    if check_total_storage:
        current_total = calculate_total_storage()
        if current_total + file.size > MAX_TOTAL_STORAGE:
            available_space = MAX_TOTAL_STORAGE - current_total
            return False, f'存储空间不足！当前已使用 {format_file_size(current_total)}，剩余空间 {format_file_size(available_space)}，需要 {format_file_size(file.size)}。请删除一些文件后再试。'
    
    # 只有在总存储空间足够的情况下，才检查单个文件大小限制
    # 这样在容量充足时就不会限制单个文件大小
    if not check_total_storage and file.size > MAX_UPLOAD_SIZE:
        return False, f'文件大小超过限制（最大{format_file_size(MAX_UPLOAD_SIZE)}）'
    
    ext = os.path.splitext(file.name)[1].lower()
    
    # 检查禁止的文件类型
    if ext in FORBIDDEN_FILE_EXTENSIONS:
        return False, f'禁止上传的文件类型：{ext}'
    
    # 检查允许的文件类型
    if ALLOWED_FILE_EXTENSIONS and ext not in ALLOWED_FILE_EXTENSIONS:
        return False, f'不支持的文件类型：{ext}'
    
    return True, 'OK'


def clean_filename(filename):
    """
    清理文件名，移除特殊字符
    """
    from .config import MAX_FILENAME_LENGTH
    import re
    
    # 移除或替换特殊字符
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # 移除多余的空格和点
    filename = re.sub(r'\s+', ' ', filename).strip()
    filename = re.sub(r'\.+', '.', filename)
    
    # 限制文件名长度
    name, ext = os.path.splitext(filename)
    if len(name) > MAX_FILENAME_LENGTH:
        name = name[:MAX_FILENAME_LENGTH]
    
    return name + ext
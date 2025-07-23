from django.db import models
import os
import mimetypes

class UploadedFile(models.Model):
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return os.path.basename(self.file.name)

    def get_filename(self):
        """获取文件名（不包含路径）"""
        return os.path.basename(self.file.name)
    
    def get_file_size(self):
        """获取文件大小（字节）"""
        try:
            return self.file.size
        except:
            return 0
    
    def get_formatted_size(self):
        """获取格式化的文件大小"""
        size = self.get_file_size()
        if size == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        import math
        i = int(math.floor(math.log(size, 1024)))
        p = math.pow(1024, i)
        s = round(size / p, 2)
        return f"{s} {size_names[i]}"
    
    def get_file_type(self):
        """获取文件类型"""
        filename = self.get_filename()
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'
    
    def get_file_extension(self):
        """获取文件扩展名"""
        return os.path.splitext(self.get_filename())[1].lower()
    
    def get_icon_class(self):
        """根据文件类型返回图标类名"""
        ext = self.get_file_extension()
        icon_map = {
            '.pdf': 'fas fa-file-pdf text-danger',
            '.doc': 'fas fa-file-word text-primary',
            '.docx': 'fas fa-file-word text-primary',
            '.xls': 'fas fa-file-excel text-success',
            '.xlsx': 'fas fa-file-excel text-success',
            '.ppt': 'fas fa-file-powerpoint text-warning',
            '.pptx': 'fas fa-file-powerpoint text-warning',
            '.jpg': 'fas fa-file-image text-info',
            '.jpeg': 'fas fa-file-image text-info',
            '.png': 'fas fa-file-image text-info',
            '.gif': 'fas fa-file-image text-info',
            '.mp4': 'fas fa-file-video text-purple',
            '.avi': 'fas fa-file-video text-purple',
            '.mp3': 'fas fa-file-audio text-success',
            '.wav': 'fas fa-file-audio text-success',
            '.zip': 'fas fa-file-archive text-warning',
            '.rar': 'fas fa-file-archive text-warning',
            '.txt': 'fas fa-file-alt text-secondary',
            '.py': 'fas fa-file-code text-success',
            '.js': 'fas fa-file-code text-warning',
            '.html': 'fas fa-file-code text-danger',
            '.css': 'fas fa-file-code text-primary',
        }
        return icon_map.get(ext, 'fas fa-file text-secondary')

    def delete(self, *args, **kwargs):
        # 首先从文件系统中删除文件
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        # 然后调用父类方法删除数据库记录
        super(UploadedFile, self).delete(*args, **kwargs)
"""
存储应用配置
"""

# 最大上传文件大小（字节）
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# 允许的文件扩展名（None表示允许所有类型）
ALLOWED_FILE_EXTENSIONS = None
# 示例：只允许特定类型
# ALLOWED_FILE_EXTENSIONS = [
#     '.jpg', '.jpeg', '.png', '.gif', '.bmp',  # 图片文件
#     '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',  # 办公文档
#     '.txt', '.md', '.rtf',  # 文本文件
#     '.zip', '.rar', '.7z',  # 压缩文件
#     '.mp3', '.wav', '.flac',  # 音频文件
#     '.mp4', '.avi', '.mov',  # 视频文件
# ]

# 禁止的文件扩展名
FORBIDDEN_FILE_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'
]

# 上传目录
UPLOAD_DIR = 'uploads/'

# 文件名最大长度
MAX_FILENAME_LENGTH = 100

# 每次最多上传文件数量
MAX_FILES_PER_UPLOAD = 10

# 总存储容量限制（字节）- 35GB
MAX_TOTAL_STORAGE = 35 * 1024 * 1024 * 1024  # 35GB 总容量
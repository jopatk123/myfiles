"""
个人云存储项目的 Django 配置文件

由 'django-admin startproject' 使用 Django 5.2.4 生成

有关此文件的更多信息，请参阅
https://docs.djangoproject.com/en/5.2/topics/settings/

有关设置及其值的完整列表，请参阅
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

import os
from pathlib import Path

# 构建项目内部路径，如：BASE_DIR / 'subdir'
BASE_DIR = Path(__file__).resolve().parent.parent


# 快速开发设置 - 不适用于生产环境
# 参见 https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# 安全警告：在生产环境中请保密密钥！
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-pb8ss3+s*8jt3cyh$igyt3cx71xh#mtq@xo=u1l%l+)4*dlj5k')

# 安全警告：不要在生产环境中开启调试模式！
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# 从环境变量获取ALLOWED_HOSTS，支持逗号分隔
ALLOWED_HOSTS_ENV = os.environ.get('ALLOWED_HOSTS', '43.163.120.212,localhost,127.0.0.1')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',') if host.strip()]

# CSRF设置 - 动态配置以支持不同端口
def get_csrf_trusted_origins():
    origins = [
        'http://localhost',
        'http://127.0.0.1',
        'https://localhost',
        'https://127.0.0.1',
    ]
    
    # 添加服务器IP的各种端口组合
    server_ip = '43.163.120.212'
    common_ports = ['80', '8000', '8080', '8081', '8082', '8083', '8084', '8085']
    
    for port in common_ports:
        origins.extend([
            f'http://{server_ip}:{port}',
            f'https://{server_ip}:{port}',
        ])
    
    # 添加不带端口的配置（用于80端口）
    origins.extend([
        f'http://{server_ip}',
        f'https://{server_ip}',
    ])
    
    return origins

CSRF_TRUSTED_ORIGINS = get_csrf_trusted_origins()

# 生产环境安全设置
if not DEBUG:
    SECURE_SSL_REDIRECT = False  # 如果使用HTTPS，设置为True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'


# 应用程序定义

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'storage',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'personal_cloud_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'personal_cloud_project.wsgi.application'


# 数据库配置
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# 将数据库放在媒体卷中以实现持久化
DB_DIR = BASE_DIR / 'media' / 'database'
DB_DIR.mkdir(parents=True, exist_ok=True)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DB_DIR / 'db.sqlite3',
    }
}


# 密码验证
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# 国际化配置
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# 静态文件配置 (CSS, JavaScript, 图片)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'storage' / 'static',
]

# 媒体文件配置
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 默认主键字段类型
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 文件上传配置 - 取消大小限制
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024 * 1024  # 10GB 作为缓冲区
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024 * 1024  # 10GB 作为缓冲区

# 日志配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

/**
 * 文件上传管理器
 * 处理文件选择、拖拽上传、进度显示等功能
 */
class UploadManager {
    constructor() {
        this.selectedFiles = [];
        this.isUploading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // 文件选择按钮
        document.getElementById('select-files-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // 文件输入变化
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(Array.from(e.target.files));
        });

        // 上传按钮
        document.getElementById('upload-btn').addEventListener('click', () => {
            this.uploadFiles();
        });

        // 清除预览
        document.getElementById('clear-preview').addEventListener('click', () => {
            this.clearSelection();
        });
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('upload-zone');
        
        // 阻止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // 拖拽进入和悬停
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => {
                uploadZone.classList.add('drag-over');
            }, false);
        });

        // 拖拽离开
        uploadZone.addEventListener('dragleave', (e) => {
            // 只有当拖拽完全离开上传区域时才移除样式
            if (!uploadZone.contains(e.relatedTarget)) {
                uploadZone.classList.remove('drag-over');
            }
        }, false);

        // 文件放置
        uploadZone.addEventListener('drop', (e) => {
            uploadZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelect(files);
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelect(files) {
        if (files.length === 0) return;

        // 过滤有效文件
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showToast('没有有效的文件可以上传', 'warning');
            return;
        }

        this.selectedFiles = validFiles;
        this.showFilePreview();
        this.updateUploadButton();
    }

    validateFile(file) {
        // 文件大小检查 (100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast(`文件 ${file.name} 超过大小限制 (100MB)`, 'error');
            return false;
        }

        // 文件类型检查
        const forbiddenTypes = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs'];
        const ext = this.getFileExtension(file.name);
        if (forbiddenTypes.includes(ext)) {
            this.showToast(`不允许上传 ${ext} 类型的文件`, 'error');
            return false;
        }

        return true;
    }

    showFilePreview() {
        const previewContainer = document.getElementById('file-preview');
        const previewList = document.getElementById('preview-list');
        const previewCount = document.getElementById('preview-count');

        previewCount.textContent = this.selectedFiles.length;
        previewList.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const previewItem = this.createPreviewItem(file, index);
            previewList.appendChild(previewItem);
        });

        previewContainer.classList.remove('d-none');
        previewContainer.classList.add('bounce-in');
    }

    createPreviewItem(file, index) {
        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.innerHTML = `
            <div class="file-preview-icon">
                <i class="${this.getFileIcon(file.name)}"></i>
            </div>
            <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="uploadManager.removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        return item;
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        if (this.selectedFiles.length === 0) {
            this.clearSelection();
        } else {
            this.showFilePreview();
            this.updateUploadButton();
        }
    }

    clearSelection() {
        this.selectedFiles = [];
        document.getElementById('file-input').value = '';
        document.getElementById('file-preview').classList.add('d-none');
        this.updateUploadButton();
    }

    updateUploadButton() {
        const uploadBtn = document.getElementById('upload-btn');
        const hasFiles = this.selectedFiles.length > 0;
        
        uploadBtn.disabled = !hasFiles || this.isUploading;
        uploadBtn.innerHTML = hasFiles 
            ? `<i class="fas fa-upload me-2"></i>上传 ${this.selectedFiles.length} 个文件`
            : `<i class="fas fa-upload me-2"></i>开始上传`;
    }

    async uploadFiles() {
        if (this.selectedFiles.length === 0 || this.isUploading) return;

        // 检查存储空间
        const storageCheck = await this.checkStorageSpace();
        if (!storageCheck.canUpload) {
            this.showToast(storageCheck.message, 'error');
            return;
        }

        this.isUploading = true;
        this.showUploadProgress();

        const formData = new FormData();
        const description = document.getElementById('file-description').value.trim();

        // 添加文件到表单数据
        this.selectedFiles.forEach((file, index) => {
            formData.append(`file_${index}`, file);
        });
        
        if (description) {
            formData.append('description', description);
        }

        // 计算总文件大小
        const totalSize = this.selectedFiles.reduce((total, file) => total + file.size, 0);
        const startTime = Date.now();

        try {
            await this.uploadWithProgress(formData, totalSize, startTime);
        } catch (error) {
            this.handleUploadError('网络错误：' + error.message);
        } finally {
            this.isUploading = false;
            this.hideUploadProgress();
        }
    }

    uploadWithProgress(formData, totalSize, startTime) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const loaded = event.loaded;
                    const total = event.total;
                    const progress = (loaded / total) * 100;
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    const speed = loaded / elapsedTime; // 字节/秒
                    const remainingTime = (total - loaded) / speed; // 剩余时间（秒）

                    this.updateProgressWithSpeed(progress, loaded, total, speed, remainingTime);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (result.success) {
                            this.handleUploadSuccess(result);
                            resolve(result);
                        } else {
                            this.handleUploadError(result.error || '上传失败');
                            reject(new Error(result.error || '上传失败'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('网络错误'));
            });

            xhr.open('POST', '/upload/');
            xhr.setRequestHeader('X-CSRFToken', this.getCsrfToken());
            xhr.send(formData);
        });
    }

    showUploadProgress() {
        const modal = document.getElementById('upload-progress-modal');
        const uploadTotal = document.getElementById('upload-total');
        
        uploadTotal.textContent = this.selectedFiles.length;
        modal.classList.remove('d-none');
        
        // 模拟进度更新
        this.updateProgress(0);
        this.progressInterval = setInterval(() => {
            const current = parseInt(document.getElementById('upload-current').textContent);
            if (current < this.selectedFiles.length) {
                this.updateProgress(current + 1);
            }
        }, 500);
    }

    updateProgress(current) {
        const progressFill = document.querySelector('.upload-progress-fill');
        const uploadCurrent = document.getElementById('upload-current');
        const total = this.selectedFiles.length;
        
        const percentage = (current / total) * 100;
        progressFill.style.width = percentage + '%';
        uploadCurrent.textContent = current;
    }

    updateProgressWithSpeed(progress, loaded, total, speed, remainingTime) {
        const progressFill = document.querySelector('.upload-progress-fill');
        const speedElement = document.getElementById('upload-speed');
        const timeElement = document.getElementById('upload-time');
        const sizeElement = document.getElementById('upload-size');
        
        // 更新进度条
        progressFill.style.width = progress + '%';
        
        // 更新网速显示
        if (speedElement) {
            speedElement.textContent = this.formatSpeed(speed);
        }
        
        // 更新剩余时间
        if (timeElement) {
            timeElement.textContent = this.formatTimeRemaining(remainingTime);
        }
        
        // 更新已传大小
        if (sizeElement) {
            sizeElement.textContent = `${this.formatFileSize(loaded)} / ${this.formatFileSize(total)}`;
        }
    }

    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';
        
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let speed = bytesPerSecond;
        let unitIndex = 0;
        
        while (speed >= 1024 && unitIndex < units.length - 1) {
            speed /= 1024;
            unitIndex++;
        }
        
        return `${speed.toFixed(1)} ${units[unitIndex]}`;
    }

    formatTimeRemaining(seconds) {
        if (seconds === Infinity || isNaN(seconds) || seconds < 0) {
            return '计算中...';
        }
        
        if (seconds < 60) {
            return `${Math.ceil(seconds)} 秒`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} 分钟`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.ceil((seconds % 3600) / 60);
            return `${hours}小时${minutes}分钟`;
        }
    }

    hideUploadProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        setTimeout(() => {
            document.getElementById('upload-progress-modal').classList.add('d-none');
        }, 1000);
    }

    handleUploadSuccess(result) {
        this.showToast(`成功上传 ${result.files.length} 个文件！`, 'success');
        
        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(error => {
                this.showToast(error, 'warning');
            });
        }

        // 清理界面
        this.clearSelection();
        document.getElementById('file-description').value = '';
        
        // 刷新文件列表
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    handleUploadError(error) {
        this.showToast('上传失败：' + error, 'error');
    }

    // 工具方法
    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    getFileIcon(filename) {
        const ext = this.getFileExtension(filename);
        const iconMap = {
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
        };
        return iconMap[ext] || 'fas fa-file text-secondary';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
               this.getCookieValue('csrftoken');
    }

    getCookieValue(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    showToast(message, type = 'info') {
        // 这个方法将在主文件管理器中实现
        if (window.fileManager && window.fileManager.showToast) {
            window.fileManager.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// 初始化上传管理器
const uploadManager = new UploadManager();
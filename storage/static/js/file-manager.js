/**
 * 主文件管理器
 * 协调各个子模块，处理视图切换、全局状态管理等
 */
class FileManager {
    constructor() {
        this.currentView = 'grid';
        this.selectedFiles = [];
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStorageInfo();
        this.initializeTooltips();
    }

    setupEventListeners() {
        // 视图切换
        document.getElementById('view-grid').addEventListener('click', () => {
            this.switchView('grid');
        });

        document.getElementById('view-list').addEventListener('click', () => {
            this.switchView('list');
        });

        // 全选功能
        document.getElementById('select-all').addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // 删除选中文件
        document.getElementById('delete-selected').addEventListener('click', () => {
            this.deleteSelectedFiles();
        });

        // 搜索功能（如果有搜索框）
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 窗口大小变化时的响应式处理
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    switchView(viewType) {
        const gridView = document.getElementById('grid-view');
        const listView = document.getElementById('list-view');
        const gridBtn = document.getElementById('view-grid');
        const listBtn = document.getElementById('view-list');

        // 添加切换动画
        const currentView = this.currentView === 'grid' ? gridView : listView;
        const targetView = viewType === 'grid' ? gridView : listView;

        if (this.currentView === viewType) return;

        // 淡出当前视图
        currentView.style.animation = 'fadeOut 0.2s ease-out';
        
        setTimeout(() => {
            if (viewType === 'grid') {
                gridView.classList.remove('d-none');
                listView.classList.add('d-none');
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                gridView.classList.add('d-none');
                listView.classList.remove('d-none');
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');
            }

            // 淡入目标视图
            targetView.style.animation = 'fadeIn 0.3s ease-in';
            this.currentView = viewType;

            // 保存用户偏好
            localStorage.setItem('fileManagerView', viewType);
        }, 200);
    }

    toggleSelectAll() {
        if (this.currentView === 'grid') {
            const totalFiles = document.querySelectorAll('.file-card').length;
            const selectedCount = this.selectedFiles.length;
            
            if (selectedCount === totalFiles && totalFiles > 0) {
                window.fileGridManager.deselectAll();
            } else {
                window.fileGridManager.selectAll();
            }
        } else {
            const totalFiles = document.querySelectorAll('.file-list-item').length;
            const selectedCount = this.selectedFiles.length;
            
            if (selectedCount === totalFiles && totalFiles > 0) {
                window.fileListManager.deselectAll();
            } else {
                window.fileListManager.selectAll();
            }
        }
    }

    async deleteSelectedFiles() {
        if (this.selectedFiles.length === 0) return;

        // 显示确认对话框
        const result = await this.showConfirmDialog(
            '删除确认',
            `确定要删除选中的 ${this.selectedFiles.length} 个文件吗？此操作不可撤销。`,
            'danger'
        );

        if (!result) return;

        try {
            // 显示加载状态
            this.showLoadingToast('正在删除文件...');

            const response = await fetch('/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    file_ids: this.selectedFiles
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast(`成功删除 ${result.deleted_count} 个文件`, 'success');
                
                // 从界面中移除已删除的文件
                this.selectedFiles.forEach(fileId => {
                    if (this.currentView === 'grid') {
                        window.fileGridManager.removeFileFromGrid(fileId);
                    } else {
                        window.fileListManager.removeFileFromList(fileId);
                    }
                });
                
                this.selectedFiles = [];
                this.updateSelectionUI();
                
                // 刷新存储信息
                this.updateStorageInfo();
            } else {
                this.showToast('删除失败：' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('删除失败：' + error.message, 'error');
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        
        if (this.currentView === 'grid') {
            window.fileGridManager.filterFiles(this.searchTerm);
        } else {
            window.fileListManager.filterFiles(this.searchTerm);
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+A 全选
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.toggleSelectAll();
        }
        
        // Delete 键删除选中文件
        if (e.key === 'Delete' && this.selectedFiles.length > 0) {
            e.preventDefault();
            this.deleteSelectedFiles();
        }
        
        // Ctrl+V 粘贴（触发文件选择）
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            document.getElementById('file-input').click();
        }
        
        // Escape 取消选择
        if (e.key === 'Escape') {
            if (this.currentView === 'grid') {
                window.fileGridManager.deselectAll();
            } else {
                window.fileListManager.deselectAll();
            }
        }
    }

    handleResize() {
        // 响应式处理逻辑
        const width = window.innerWidth;
        
        if (width < 768 && this.currentView === 'list') {
            // 在小屏幕上自动切换到网格视图
            this.switchView('grid');
        }
    }

    // 更新选中文件列表（由子管理器调用）
    updateSelectedFiles(selectedFileIds) {
        this.selectedFiles = selectedFileIds;
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedFiles.length;
        const deleteBtn = document.getElementById('delete-selected');
        const selectAllBtn = document.getElementById('select-all');
        
        // 更新删除按钮
        if (deleteBtn) {
            deleteBtn.disabled = selectedCount === 0;
            deleteBtn.innerHTML = selectedCount > 0 
                ? `<i class="fas fa-trash me-1"></i>删除选中 (${selectedCount})`
                : `<i class="fas fa-trash me-1"></i>删除选中`;
        }
        
        // 更新全选按钮
        if (selectAllBtn) {
            const totalFiles = this.currentView === 'grid' 
                ? document.querySelectorAll('.file-card').length
                : document.querySelectorAll('.file-list-item').length;
            const allSelected = selectedCount === totalFiles && totalFiles > 0;
            
            selectAllBtn.innerHTML = allSelected
                ? `<i class="fas fa-check-square me-1"></i>取消全选`
                : `<i class="fas fa-check-square me-1"></i>全选`;
        }
    }

    async updateStorageInfo() {
        try {
            const response = await fetch('/storage-info/');
            const data = await response.json();
            
            // 更新导航栏中的存储信息
            const fileCountElement = document.getElementById('file-count');
            const totalSizeElement = document.getElementById('total-size');
            
            if (fileCountElement) {
                fileCountElement.textContent = data.file_count;
            }
            if (totalSizeElement) {
                totalSizeElement.textContent = data.formatted_size;
            }
            
            // 更新存储概览
            const fileCountDisplay = document.getElementById('file-count-display');
            const totalSizeDisplay = document.getElementById('total-size-display');
            const maxSizeDisplay = document.getElementById('max-size-display');
            const availableSizeDisplay = document.getElementById('available-size-display');
            const fileCountBadge = document.getElementById('file-count-badge');
            const usagePercent = document.getElementById('usage-percent');
            
            if (fileCountDisplay) {
                fileCountDisplay.textContent = data.file_count;
            }
            if (totalSizeDisplay) {
                totalSizeDisplay.textContent = data.formatted_size;
            }
            if (maxSizeDisplay) {
                maxSizeDisplay.textContent = data.formatted_max;
            }
            if (availableSizeDisplay) {
                availableSizeDisplay.textContent = data.formatted_available;
            }
            if (fileCountBadge) {
                fileCountBadge.textContent = data.file_count;
            }
            if (usagePercent) {
                usagePercent.textContent = data.usage_percentage.toFixed(1) + '%';
            }
            
            // 更新存储使用率
            this.updateStorageUsage(data);
            
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    updateStorageUsage(data) {
        const usageBar = document.getElementById('storage-usage-bar');
        if (usageBar) {
            usageBar.style.width = Math.min(data.usage_percentage, 100) + '%';
            
            // 根据使用率和状态改变颜色
            if (data.is_full) {
                usageBar.style.background = '#dc3545';
            } else if (data.is_nearly_full) {
                usageBar.style.background = '#ffc107';
            } else {
                usageBar.style.background = 'rgba(255,255,255,0.8)';
            }
        }
        
        // 显示或隐藏存储警告
        this.updateStorageWarnings(data);
    }

    updateStorageWarnings(data) {
        // 移除现有的警告
        const existingAlert = document.querySelector('.storage-info .alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // 根据存储状态添加警告
        const storageInfo = document.querySelector('.storage-info');
        if (data.is_full) {
            const alertHtml = `
                <div class="alert alert-danger mt-2 mb-0" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    存储空间已满！请删除一些文件后再上传。
                </div>
            `;
            storageInfo.insertAdjacentHTML('beforeend', alertHtml);
        } else if (data.is_nearly_full) {
            const alertHtml = `
                <div class="alert alert-warning mt-2 mb-0" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    存储空间即将用完，剩余 ${data.formatted_available}。
                </div>
            `;
            storageInfo.insertAdjacentHTML('beforeend', alertHtml);
        }
    }

    initializeTooltips() {
        // 初始化Bootstrap工具提示
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // 下载文件并显示网速
    async downloadFileWithSpeed(url, filename) {
        const startTime = Date.now();
        let downloadedBytes = 0;
        
        try {
            const response = await fetch(url);
            const contentLength = response.headers.get('content-length');
            const totalSize = parseInt(contentLength, 10) || 0;
            
            // 创建进度显示
            this.showDownloadProgress(filename, totalSize);
            
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                downloadedBytes += value.length;
                
                const elapsedTime = (Date.now() - startTime) / 1000;
                const speed = downloadedBytes / elapsedTime;
                const remainingTime = totalSize > 0 ? (totalSize - downloadedBytes) / speed : 0;
                const progress = totalSize > 0 ? (downloadedBytes / totalSize) * 100 : 0;
                
                this.updateDownloadProgress(progress, downloadedBytes, totalSize, speed, remainingTime);
            }
            
            // 合并所有chunk
            const blob = new Blob(chunks);
            const blobUrl = window.URL.createObjectURL(blob);
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                this.hideDownloadProgress();
            }, 1000);
            
            this.showToast(`文件 ${filename} 下载完成`, 'success');
            
        } catch (error) {
            this.hideDownloadProgress();
            this.showToast(`下载失败：${error.message}`, 'error');
        }
    }

    showDownloadProgress(filename, totalSize) {
        // 创建下载进度模态框
        const modalHtml = `
            <div id="download-progress-modal" class="upload-progress" style="z-index: 9999;">
                <div class="upload-progress-icon">
                    <i class="fas fa-download"></i>
                </div>
                <h5>正在下载 ${filename}</h5>
                <p class="upload-progress-text">请稍候，文件正在下载中</p>
                <div class="upload-progress-bar">
                    <div class="upload-progress-fill" id="download-progress-fill" style="width: 0%"></div>
                </div>
                <div class="upload-progress-info">
                    <div class="progress-info-item">
                        <span class="info-label">下载速度：</span>
                        <span id="download-speed" class="info-value">0 KB/s</span>
                    </div>
                    <div class="progress-info-item">
                        <span class="info-label">剩余时间：</span>
                        <span id="download-time" class="info-value">计算中...</span>
                    </div>
                    <div class="progress-info-item">
                        <span class="info-label">已下载：</span>
                        <span id="download-size" class="info-value">0 B / ${this.formatFileSize(totalSize)}</span>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm mt-3" onclick="fileManager.cancelDownload()">
                    <i class="fas fa-times me-1"></i>取消下载
                </button>
            </div>
        `;
        
        // 添加到body
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    }

    updateDownloadProgress(progress, downloaded, total, speed, remainingTime) {
        const progressFill = document.getElementById('download-progress-fill');
        const speedElement = document.getElementById('download-speed');
        const timeElement = document.getElementById('download-time');
        const sizeElement = document.getElementById('download-size');
        
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }
        
        if (speedElement) {
            speedElement.textContent = this.formatSpeed(speed);
        }
        
        if (timeElement) {
            timeElement.textContent = this.formatTimeRemaining(remainingTime);
        }
        
        if (sizeElement) {
            sizeElement.textContent = `${this.formatFileSize(downloaded)} / ${this.formatFileSize(total)}`;
        }
    }

    hideDownloadProgress() {
        const modal = document.getElementById('download-progress-modal');
        if (modal) {
            modal.remove();
        }
    }

    cancelDownload() {
        // 取消下载逻辑
        this.hideDownloadProgress();
        this.showToast('下载已取消', 'info');
    }

    // Toast通知系统
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="fas ${this.getToastIcon(type)} me-2"></i>
                    <strong class="me-auto">${this.getToastTitle(type)}</strong>
                    <small class="text-muted">刚刚</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
        bsToast.show();
        
        // 自动清理DOM
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    showLoadingToast(message) {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'loading-toast';
        
        // 移除现有的加载提示
        const existingToast = document.getElementById(toastId);
        if (existingToast) {
            existingToast.remove();
        }
        
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <div class="loading-spinner me-2"></div>
                    <strong class="me-auto">处理中</strong>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, { autohide: false });
        bsToast.show();
        
        return {
            hide: () => {
                bsToast.hide();
                setTimeout(() => toastElement.remove(), 300);
            }
        };
    }

    async showConfirmDialog(title, message, type = 'primary') {
        return new Promise((resolve) => {
            const modalId = 'confirm-modal-' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-${type}" id="confirm-btn">确定</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);
            
            modalElement.querySelector('#confirm-btn').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
                resolve(false);
            });
            
            modal.show();
        });
    }

    getToastIcon(type) {
        const icons = {
            'success': 'fa-check-circle text-success',
            'error': 'fa-exclamation-circle text-danger',
            'warning': 'fa-exclamation-triangle text-warning',
            'info': 'fa-info-circle text-info'
        };
        return icons[type] || icons['info'];
    }

    getToastTitle(type) {
        const titles = {
            'success': '成功',
            'error': '错误',
            'warning': '警告',
            'info': '信息'
        };
        return titles[type] || titles['info'];
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 工具方法
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
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主文件管理器
    window.fileManager = new FileManager();
    
    // 恢复用户的视图偏好
    const savedView = localStorage.getItem('fileManagerView');
    if (savedView && savedView !== 'grid') {
        window.fileManager.switchView(savedView);
    }
    
    console.log('文件管理器初始化完成');
});
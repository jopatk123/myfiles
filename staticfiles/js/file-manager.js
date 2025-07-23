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
            const fileCountBadge = document.getElementById('file-count-badge');
            
            if (fileCountDisplay) {
                fileCountDisplay.textContent = data.file_count;
            }
            if (totalSizeDisplay) {
                totalSizeDisplay.textContent = data.formatted_size;
            }
            if (fileCountBadge) {
                fileCountBadge.textContent = data.file_count;
            }
            
            // 更新存储使用率
            this.updateStorageUsage(data.total_size);
            
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    updateStorageUsage(totalBytes) {
        const maxBytes = 100 * 1024 * 1024; // 100MB
        const usagePercent = (totalBytes / maxBytes) * 100;
        
        const usageBar = document.getElementById('storage-usage-bar');
        if (usageBar) {
            usageBar.style.width = Math.min(usagePercent, 100) + '%';
            
            // 根据使用率改变颜色
            if (usagePercent > 90) {
                usageBar.className = 'progress-bar bg-danger';
            } else if (usagePercent > 70) {
                usageBar.className = 'progress-bar bg-warning';
            } else {
                usageBar.className = 'progress-bar bg-success';
            }
        }
    }

    initializeTooltips() {
        // 初始化Bootstrap工具提示
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
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
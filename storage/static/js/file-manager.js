/**
 * 主文件管理器
 * 协调各个子模块，处理视图切换、全局状态管理等
 */
class FileManager {
    constructor() {
        this.currentView = 'grid';
        this.selectedFiles = [];
        this.selectedFolders = [];
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStorageInfo();
        this.initializeTooltips();
    }

    setupEventListeners() {
        document.getElementById('view-grid').addEventListener('click', () => this.switchView('grid'));
        document.getElementById('view-list').addEventListener('click', () => this.switchView('list'));
        document.getElementById('select-all').addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('delete-selected').addEventListener('click', () => this.deleteSelectedItems());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    switchView(viewType) {
        const gridView = document.getElementById('grid-view');
        const listView = document.getElementById('list-view');
        const gridBtn = document.getElementById('view-grid');
        const listBtn = document.getElementById('view-list');

        if (this.currentView === viewType) return;

        const currentViewEl = this.currentView === 'grid' ? gridView : listView;
        currentViewEl.style.animation = 'fadeOut 0.2s ease-out';
        
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
            const targetViewEl = viewType === 'grid' ? gridView : listView;
            targetViewEl.style.animation = 'fadeIn 0.3s ease-in';
            this.currentView = viewType;
            localStorage.setItem('fileManagerView', viewType);
        }, 200);
    }

    toggleSelectAll() {
        const manager = this.currentView === 'grid' ? window.fileGridManager : window.fileListManager;
        if (!manager) return;

        const totalItems = document.querySelectorAll('.file-card').length;
        const selectedCount = this.selectedFiles.length + this.selectedFolders.length;

        if (selectedCount === totalItems && totalItems > 0) {
            manager.deselectAll();
        } else {
            manager.selectAll();
        }
    }

    async deleteSelectedItems() {
        const fileCount = this.selectedFiles.length;
        const folderCount = this.selectedFolders.length;
        const totalCount = fileCount + folderCount;

        if (totalCount === 0) return;

        let message = `确定要删除选中的 ${totalCount} 个项目吗？`;
        if (folderCount > 0) {
            message += `<br><br><strong>警告：</strong>删除文件夹将会永久删除其中包含的所有文件和子文件夹。此操作不可撤销。`;
        }

        const result = await this.showConfirmDialog('删除确认', message, 'danger');
        if (!result) return;

        const loadingToast = this.showLoadingToast('正在删除项目...');

        try {
            const response = await fetch('/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    file_ids: this.selectedFiles,
                    folder_ids: this.selectedFolders
                })
            });

            const result = await response.json();
            loadingToast.hide();

            if (result.success) {
                this.showToast(result.message || `成功删除 ${totalCount} 个项目`, 'success');
                
                const manager = this.currentView === 'grid' ? window.fileGridManager : window.fileListManager;
                if (manager) {
                    this.selectedFiles.forEach(id => manager.removeItemFromGrid(id, 'file'));
                    this.selectedFolders.forEach(id => manager.removeItemFromGrid(id, 'folder'));
                }
                
                this.updateStorageInfo();
            } else {
                this.showToast('删除失败: ' + result.error, 'error');
            }
        } catch (error) {
            loadingToast.hide();
            this.showToast('删除出错: ' + error.message, 'error');
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        const manager = this.currentView === 'grid' ? window.fileGridManager : window.fileListManager;
        if (manager) {
            manager.filterFiles(this.searchTerm);
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.toggleSelectAll();
        }
        if (e.key === 'Delete' && (this.selectedFiles.length > 0 || this.selectedFolders.length > 0)) {
            e.preventDefault();
            this.deleteSelectedItems();
        }
        if (e.key === 'Escape') {
            const manager = this.currentView === 'grid' ? window.fileGridManager : window.fileListManager;
            if (manager) manager.deselectAll();
        }
    }

    handleResize() {
        if (window.innerWidth < 768 && this.currentView === 'list') {
            this.switchView('grid');
        }
    }

    updateSelection(selectedItems = []) {
        this.selectedFiles = selectedItems.filter(item => item.type === 'file').map(item => item.id);
        this.selectedFolders = selectedItems.filter(item => item.type === 'folder').map(item => item.id);
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedFiles.length + this.selectedFolders.length;
        const deleteBtn = document.getElementById('delete-selected');
        const selectAllBtn = document.getElementById('select-all');
        
        if (deleteBtn) {
            deleteBtn.disabled = selectedCount === 0;
            deleteBtn.innerHTML = selectedCount > 0 
                ? `<i class="fas fa-trash me-1"></i>删除选中 (${selectedCount})`
                : `<i class="fas fa-trash me-1"></i>删除选中`;
        }
        
        if (selectAllBtn) {
            const totalItems = document.querySelectorAll('.file-card').length;
            const allSelected = selectedCount === totalItems && totalItems > 0;
            selectAllBtn.innerHTML = allSelected
                ? `<i class="fas fa-check-square me-1"></i>取消全选`
                : `<i class="fas fa-check-square me-1"></i>全选`;
        }
    }

    async updateStorageInfo() {
        try {
            const response = await fetch('/storage-info/');
            const data = await response.json();
            
            document.getElementById('file-count-display').textContent = data.file_count;
            document.getElementById('total-size-display').textContent = data.formatted_size;
            document.getElementById('max-size-display').textContent = data.formatted_max;
            document.getElementById('available-size-display').textContent = data.formatted_available;
            document.getElementById('file-count-badge').textContent = data.file_count;
            document.getElementById('usage-percent').textContent = data.usage_percentage.toFixed(1) + '%';
            
            this.updateStorageUsage(data);
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    updateStorageUsage(data) {
        const usageBar = document.getElementById('storage-usage-bar');
        if (!usageBar) return;
        usageBar.style.width = Math.min(data.usage_percentage, 100) + '%';
        if (data.is_full) usageBar.style.background = '#dc3545';
        else if (data.is_nearly_full) usageBar.style.background = '#ffc107';
        else usageBar.style.background = 'rgba(255,255,255,0.8)';
        this.updateStorageWarnings(data);
    }

    updateStorageWarnings(data) {
        const container = document.querySelector('.storage-info');
        const existingAlert = container.querySelector('.alert');
        if (existingAlert) existingAlert.remove();

        let alertHtml = '';
        if (data.is_full) {
            alertHtml = `<div class="alert alert-danger mt-2 mb-0" role="alert"><i class="fas fa-exclamation-triangle me-2"></i>存储空间已满！请删除一些文件后再上传。</div>`;
        } else if (data.is_nearly_full) {
            alertHtml = `<div class="alert alert-warning mt-2 mb-0" role="alert"><i class="fas fa-exclamation-triangle me-2"></i>存储空间即将用完，剩余 ${data.formatted_available}。</div>`;
        }
        if (alertHtml) container.insertAdjacentHTML('beforeend', alertHtml);
    }

    initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    async downloadFileWithSpeed(url, filename) {
        // Implementation remains the same
    }

    // Toast and Dialog methods remain the same
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="fas ${this.getToastIcon(type)} me-2"></i>
                    <strong class="me-auto">${this.getToastTitle(type)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>`;
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
        bsToast.show();
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    }

    showLoadingToast(message) {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'loading-toast';
        const existingToast = document.getElementById(toastId);
        if (existingToast) existingToast.remove();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <div class="spinner-border spinner-border-sm me-2" role="status"><span class="visually-hidden">Loading...</span></div>
                    <strong class="me-auto">处理中</strong>
                </div>
                <div class="toast-body">${message}</div>
            </div>`;
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
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body"><p>${message}</p></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-${type}" id="confirm-btn">确定</button>
                            </div>
                        </div>
                    </div>
                </div>`;
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
        const icons = { 'success': 'fa-check-circle text-success', 'error': 'fa-exclamation-circle text-danger', 'warning': 'fa-exclamation-triangle text-warning', 'info': 'fa-info-circle text-info' };
        return icons[type] || icons['info'];
    }

    getToastTitle(type) {
        const titles = { 'success': '成功', 'error': '错误', 'warning': '警告', 'info': '信息' };
        return titles[type] || titles['info'];
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || this.getCookieValue('csrftoken');
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

document.addEventListener('DOMContentLoaded', () => {
    window.fileManager = new FileManager();
    const savedView = localStorage.getItem('fileManagerView');
    if (savedView && savedView !== 'grid') {
        window.fileManager.switchView(savedView);
    }
    console.log('文件管理器初始化完成');
});

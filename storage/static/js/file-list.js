/**
 * 文件列表视图管理器
 * 处理列表视图的显示和交互
 */
class FileListManager {
    constructor() {
        this.selectedFiles = new Set();
        this.sortColumn = 'name';
        this.sortOrder = 'asc';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSortableHeaders();
    }

    setupEventListeners() {
        // 列表项点击事件
        document.addEventListener('click', (e) => {
            const listItem = e.target.closest('.file-list-item');
            if (listItem && !e.target.closest('.file-list-checkbox, .file-list-actions')) {
                this.toggleFileSelection(listItem);
            }
        });

        // 复选框变化事件
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('file-list-checkbox')) {
                const listItem = e.target.closest('.file-list-item');
                this.handleCheckboxChange(listItem, e.target.checked);
            }
        });

        // 全选复选框
        const selectAllList = document.getElementById('select-all-list');
        if (selectAllList) {
            selectAllList.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAll();
                } else {
                    this.deselectAll();
                }
            });
        }

        // 文件操作按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-file')) {
                const fileId = e.target.closest('.delete-file').dataset.fileId;
                this.deleteFile(fileId);
            }
        });
    }

    setupSortableHeaders() {
        // 为表头添加排序功能
        const headers = document.querySelectorAll('.file-list-header span[data-sort]');
        
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const sortBy = header.dataset.sort;
                this.sortFiles(sortBy);
            });
            
            // 添加排序图标
            header.innerHTML += ' <i class="fas fa-sort text-muted"></i>';
        });
    }

    toggleFileSelection(listItem) {
        const checkbox = listItem.querySelector('.file-list-checkbox');
        const fileId = listItem.dataset.fileId;
        
        if (this.selectedFiles.has(fileId)) {
            this.deselectFile(listItem, fileId);
            checkbox.checked = false;
        } else {
            this.selectFile(listItem, fileId);
            checkbox.checked = true;
        }
        
        this.updateSelectionUI();
    }

    handleCheckboxChange(listItem, checked) {
        const fileId = listItem.dataset.fileId;
        
        if (checked) {
            this.selectFile(listItem, fileId);
        } else {
            this.deselectFile(listItem, fileId);
        }
        
        this.updateSelectionUI();
    }

    selectFile(listItem, fileId) {
        this.selectedFiles.add(fileId);
        listItem.classList.add('selected');
        
        // 添加选中动画
        listItem.style.animation = 'highlightRow 0.3s ease-out';
        setTimeout(() => {
            listItem.style.animation = '';
        }, 300);
    }

    deselectFile(listItem, fileId) {
        this.selectedFiles.delete(fileId);
        listItem.classList.remove('selected');
    }

    selectAll() {
        const listItems = document.querySelectorAll('.file-list-item');
        
        listItems.forEach(item => {
            const fileId = item.dataset.fileId;
            const checkbox = item.querySelector('.file-list-checkbox');
            
            this.selectFile(item, fileId);
            checkbox.checked = true;
        });
        
        this.updateSelectionUI();
    }

    deselectAll() {
        const listItems = document.querySelectorAll('.file-list-item');
        
        listItems.forEach(item => {
            const fileId = item.dataset.fileId;
            const checkbox = item.querySelector('.file-list-checkbox');
            
            this.deselectFile(item, fileId);
            checkbox.checked = false;
        });
        
        this.selectedFiles.clear();
        this.updateSelectionUI();
        
        // 更新全选复选框
        const selectAllList = document.getElementById('select-all-list');
        if (selectAllList) {
            selectAllList.checked = false;
        }
    }

    updateSelectionUI() {
        const selectedCount = this.selectedFiles.size;
        const totalFiles = document.querySelectorAll('.file-list-item').length;
        const deleteBtn = document.getElementById('delete-selected');
        const selectAllList = document.getElementById('select-all-list');
        const selectAllBtn = document.getElementById('select-all');
        
        // 更新删除按钮
        if (deleteBtn) {
            deleteBtn.disabled = selectedCount === 0;
            deleteBtn.innerHTML = selectedCount > 0 
                ? `<i class="fas fa-trash me-1"></i>删除选中 (${selectedCount})`
                : `<i class="fas fa-trash me-1"></i>删除选中`;
        }
        
        // 更新列表视图的全选复选框状态
        if (selectAllList) {
            if (selectedCount === 0) {
                selectAllList.indeterminate = false;
                selectAllList.checked = false;
            } else if (selectedCount === totalFiles) {
                selectAllList.indeterminate = false;
                selectAllList.checked = true;
            } else {
                selectAllList.indeterminate = true;
                selectAllList.checked = false;
            }
        }
        
        // 更新工具栏的全选按钮
        if (selectAllBtn) {
            const allSelected = selectedCount === totalFiles && totalFiles > 0;
            selectAllBtn.innerHTML = allSelected
                ? `<i class="fas fa-check-square me-1"></i>取消全选`
                : `<i class="fas fa-check-square me-1"></i>全选`;
        }
        
        // 通知主管理器更新
        if (window.fileManager) {
            window.fileManager.updateSelectedFiles(Array.from(this.selectedFiles));
        }
    }

    sortFiles(sortBy) {
        // 切换排序顺序
        if (this.sortColumn === sortBy) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = sortBy;
            this.sortOrder = 'asc';
        }
        
        const fileList = document.querySelector('.file-list');
        const listItems = Array.from(fileList.querySelectorAll('.file-list-item'));
        
        listItems.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'name':
                    valueA = a.querySelector('.file-list-name span').textContent.toLowerCase();
                    valueB = b.querySelector('.file-list-name span').textContent.toLowerCase();
                    break;
                case 'size':
                    valueA = this.parseFileSize(a.querySelector('.file-list-size').textContent);
                    valueB = this.parseFileSize(b.querySelector('.file-list-size').textContent);
                    break;
                case 'type':
                    valueA = a.querySelector('.file-list-type').textContent.toLowerCase();
                    valueB = b.querySelector('.file-list-type').textContent.toLowerCase();
                    break;
                case 'date':
                    valueA = new Date(a.querySelector('.file-list-date').textContent);
                    valueB = new Date(b.querySelector('.file-list-date').textContent);
                    break;
                default:
                    return 0;
            }
            
            if (this.sortOrder === 'desc') {
                return valueA < valueB ? 1 : -1;
            } else {
                return valueA > valueB ? 1 : -1;
            }
        });
        
        // 更新排序图标
        this.updateSortIcons(sortBy);
        
        // 重新排列DOM元素
        const header = fileList.querySelector('.file-list-header');
        listItems.forEach(item => fileList.appendChild(item));
        
        // 添加排序动画
        listItems.forEach((item, index) => {
            item.style.animation = `slideInLeft 0.3s ease-out ${index * 0.02}s`;
        });
    }

    updateSortIcons(activeColumn) {
        const headers = document.querySelectorAll('.file-list-header span[data-sort]');
        
        headers.forEach(header => {
            const icon = header.querySelector('i');
            const column = header.dataset.sort;
            
            if (column === activeColumn) {
                icon.className = this.sortOrder === 'asc' 
                    ? 'fas fa-sort-up text-primary' 
                    : 'fas fa-sort-down text-primary';
            } else {
                icon.className = 'fas fa-sort text-muted';
            }
        });
    }

    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？')) {
            return;
        }

        try {
            const response = await fetch('/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    file_ids: [fileId]
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.removeFileFromList(fileId);
                this.showToast('文件删除成功', 'success');
                this.updateStorageInfo();
            } else {
                this.showToast('删除失败：' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('删除失败：' + error.message, 'error');
        }
    }

    removeFileFromList(fileId) {
        const listItem = document.querySelector(`.file-list-item[data-file-id="${fileId}"]`);
        if (listItem) {
            // 添加删除动画
            listItem.style.animation = 'slideOutRight 0.3s ease-out';
            
            setTimeout(() => {
                listItem.remove();
                this.selectedFiles.delete(fileId);
                this.updateSelectionUI();
                this.checkEmptyState();
            }, 300);
        }
    }

    checkEmptyState() {
        const fileList = document.querySelector('.file-list');
        const remainingFiles = fileList.querySelectorAll('.file-list-item').length;
        
        if (remainingFiles === 0) {
            const listView = document.getElementById('list-view');
            listView.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h5 class="empty-state-title">还没有上传任何文件</h5>
                    <p class="empty-state-description">开始上传您的第一个文件吧！</p>
                </div>
            `;
        }
    }

    // 搜索和过滤功能
    filterFiles(searchTerm) {
        const listItems = document.querySelectorAll('.file-list-item');
        const term = searchTerm.toLowerCase();
        
        listItems.forEach(item => {
            const fileName = item.querySelector('.file-list-name span').textContent.toLowerCase();
            const description = item.querySelector('.file-list-description').textContent.toLowerCase();
            const shouldShow = fileName.includes(term) || description.includes(term);
            
            if (shouldShow) {
                item.style.display = 'grid';
                item.classList.add('fade-in');
            } else {
                item.style.display = 'none';
                item.classList.remove('fade-in');
            }
        });
    }

    // 批量操作
    async deleteSelectedFiles() {
        if (this.selectedFiles.size === 0) return;

        if (!confirm(`确定要删除选中的 ${this.selectedFiles.size} 个文件吗？`)) {
            return;
        }

        try {
            const response = await fetch('/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    file_ids: Array.from(this.selectedFiles)
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // 移除已删除的文件
                this.selectedFiles.forEach(fileId => {
                    this.removeFileFromList(fileId);
                });
                
                this.showToast(`成功删除 ${result.deleted_count} 个文件`, 'success');
                this.selectedFiles.clear();
                this.updateSelectionUI();
                this.updateStorageInfo();
            } else {
                this.showToast('删除失败：' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('删除失败：' + error.message, 'error');
        }
    }

    // 工具方法
    parseFileSize(sizeText) {
        const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024 };
        const match = sizeText.match(/^([\d.]+)\s*(\w+)$/);
        if (match) {
            return parseFloat(match[1]) * (units[match[2]] || 1);
        }
        return 0;
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
        if (window.fileManager && window.fileManager.showToast) {
            window.fileManager.showToast(message, type);
        }
    }

    updateStorageInfo() {
        if (window.fileManager && window.fileManager.updateStorageInfo) {
            window.fileManager.updateStorageInfo();
        }
    }
}

// CSS动画定义
const style = document.createElement('style');
style.textContent = `
    @keyframes highlightRow {
        0% { background-color: rgba(79, 70, 229, 0.2); }
        100% { background-color: rgba(79, 70, 229, 0.08); }
    }
    
    @keyframes slideInLeft {
        from { 
            opacity: 0; 
            transform: translateX(-20px); 
        }
        to { 
            opacity: 1; 
            transform: translateX(0); 
        }
    }
    
    @keyframes slideOutRight {
        from { 
            opacity: 1; 
            transform: translateX(0); 
        }
        to { 
            opacity: 0; 
            transform: translateX(20px); 
        }
    }
`;
document.head.appendChild(style);

// 初始化文件列表管理器
window.fileListManager = new FileListManager();
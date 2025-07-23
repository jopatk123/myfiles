/**
 * 文件网格视图管理器
 * 处理图标视图的显示和交互
 */
class FileGridManager {
    constructor() {
        this.selectedFiles = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFileCardInteractions();
    }

    setupEventListeners() {
        // 文件卡片点击事件
        document.addEventListener('click', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard && !e.target.closest('.file-checkbox, .file-actions')) {
                this.toggleFileSelection(fileCard);
            }
        });

        // 复选框变化事件
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('file-checkbox')) {
                const fileCard = e.target.closest('.file-card');
                this.handleCheckboxChange(fileCard, e.target.checked);
            }
        });

        // 文件操作按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-file')) {
                const fileId = e.target.closest('.delete-file').dataset.fileId;
                this.deleteFile(fileId);
            }
        });
    }

    setupFileCardInteractions() {
        const fileCards = document.querySelectorAll('.file-card');
        
        fileCards.forEach((card, index) => {
            // 添加悬停效果
            card.addEventListener('mouseenter', () => {
                this.animateCard(card, 'hover');
            });

            card.addEventListener('mouseleave', () => {
                this.animateCard(card, 'leave');
            });

            // 添加进入动画延迟
            card.style.animationDelay = `${index * 0.05}s`;
        });
    }

    animateCard(card, type) {
        const icon = card.querySelector('.file-icon i');
        const actions = card.querySelector('.file-actions');
        
        if (type === 'hover') {
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
            }
            if (actions) {
                actions.style.opacity = '1';
                actions.style.transform = 'translateY(0)';
            }
        } else {
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
            if (actions) {
                actions.style.opacity = '0';
                actions.style.transform = 'translateY(10px)';
            }
        }
    }

    toggleFileSelection(fileCard) {
        const checkbox = fileCard.querySelector('.file-checkbox');
        const fileId = fileCard.dataset.fileId;
        
        if (this.selectedFiles.has(fileId)) {
            this.deselectFile(fileCard, fileId);
            checkbox.checked = false;
        } else {
            this.selectFile(fileCard, fileId);
            checkbox.checked = true;
        }
        
        this.updateSelectionUI();
    }

    handleCheckboxChange(fileCard, checked) {
        const fileId = fileCard.dataset.fileId;
        
        if (checked) {
            this.selectFile(fileCard, fileId);
        } else {
            this.deselectFile(fileCard, fileId);
        }
        
        this.updateSelectionUI();
    }

    selectFile(fileCard, fileId) {
        this.selectedFiles.add(fileId);
        fileCard.classList.add('selected');
        
        // 添加选中动画
        fileCard.style.animation = 'none';
        fileCard.offsetHeight; // 触发重排
        fileCard.style.animation = 'scaleIn 0.2s ease-out';
    }

    deselectFile(fileCard, fileId) {
        this.selectedFiles.delete(fileId);
        fileCard.classList.remove('selected');
    }

    selectAll() {
        const fileCards = document.querySelectorAll('.file-card');
        
        fileCards.forEach(card => {
            const fileId = card.dataset.fileId;
            const checkbox = card.querySelector('.file-checkbox');
            
            this.selectFile(card, fileId);
            checkbox.checked = true;
        });
        
        this.updateSelectionUI();
    }

    deselectAll() {
        const fileCards = document.querySelectorAll('.file-card');
        
        fileCards.forEach(card => {
            const fileId = card.dataset.fileId;
            const checkbox = card.querySelector('.file-checkbox');
            
            this.deselectFile(card, fileId);
            checkbox.checked = false;
        });
        
        this.selectedFiles.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedFiles.size;
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
            const totalFiles = document.querySelectorAll('.file-card').length;
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
                this.removeFileFromGrid(fileId);
                this.showToast('文件删除成功', 'success');
                this.updateStorageInfo();
            } else {
                this.showToast('删除失败：' + result.error, 'error');
            }
        } catch (error) {
            this.showToast('删除失败：' + error.message, 'error');
        }
    }

    removeFileFromGrid(fileId) {
        const fileCard = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
        if (fileCard) {
            // 添加删除动画
            fileCard.style.animation = 'fadeOut 0.3s ease-out';
            
            setTimeout(() => {
                fileCard.remove();
                this.selectedFiles.delete(fileId);
                this.updateSelectionUI();
                this.checkEmptyState();
            }, 300);
        }
    }

    checkEmptyState() {
        const fileGrid = document.getElementById('file-grid');
        const remainingFiles = fileGrid.querySelectorAll('.file-card').length;
        
        if (remainingFiles === 0) {
            fileGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
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
        const fileCards = document.querySelectorAll('.file-card');
        const term = searchTerm.toLowerCase();
        
        fileCards.forEach(card => {
            const fileName = card.querySelector('.file-name').textContent.toLowerCase();
            const shouldShow = fileName.includes(term);
            
            if (shouldShow) {
                card.style.display = 'block';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });
    }

    // 排序功能
    sortFiles(sortBy, order = 'asc') {
        const fileGrid = document.getElementById('file-grid');
        const fileCards = Array.from(fileGrid.querySelectorAll('.file-card'));
        
        fileCards.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'name':
                    valueA = a.querySelector('.file-name').textContent.toLowerCase();
                    valueB = b.querySelector('.file-name').textContent.toLowerCase();
                    break;
                case 'size':
                    valueA = this.parseFileSize(a.querySelector('.file-size').textContent);
                    valueB = this.parseFileSize(b.querySelector('.file-size').textContent);
                    break;
                case 'type':
                    valueA = this.getFileType(a.querySelector('.file-name').textContent);
                    valueB = this.getFileType(b.querySelector('.file-name').textContent);
                    break;
                default:
                    return 0;
            }
            
            if (order === 'desc') {
                return valueA < valueB ? 1 : -1;
            } else {
                return valueA > valueB ? 1 : -1;
            }
        });
        
        // 重新排列DOM元素
        fileCards.forEach(card => fileGrid.appendChild(card));
    }

    parseFileSize(sizeText) {
        const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024 };
        const match = sizeText.match(/^([\d.]+)\s*(\w+)$/);
        if (match) {
            return parseFloat(match[1]) * (units[match[2]] || 1);
        }
        return 0;
    }

    getFileType(fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
        return ext || 'unknown';
    }

    // 批量删除选中文件
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
                    this.removeFileFromGrid(fileId);
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
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
    
    .file-actions {
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
    }
`;
document.head.appendChild(style);

// 初始化文件网格管理器
window.fileGridManager = new FileGridManager();
/**
 * 文件网格视图管理器
 * 处理图标视图的显示和交互
 */
class FileGridManager {
    constructor() {
        this.selectedItems = new Map(); // Using a Map to store items with type {id: '...', type: 'file'/'folder'}
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFileCardInteractions();
    }

    setupEventListeners() {
        const gridView = document.getElementById('grid-view');

        // Delegated click for selection
        gridView.addEventListener('click', (e) => {
            const fileCard = e.target.closest('.file-card');
            if (fileCard && !e.target.closest('input[type="checkbox"], .file-actions, a')) {
                this.toggleSelection(fileCard);
            }
        });

        // Delegated change for checkboxes
        gridView.addEventListener('change', (e) => {
            const checkbox = e.target;
            if (checkbox.matches('.file-checkbox, .folder-checkbox')) {
                const fileCard = checkbox.closest('.file-card');
                this.handleCheckboxChange(fileCard, checkbox.checked);
            }
        });

        // Delegated click for single item deletion
        gridView.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-file, .delete-folder');
            if (deleteButton) {
                const fileCard = deleteButton.closest('.file-card');
                const { id, type } = this.getItemIdentifier(fileCard);
                if (id) {
                    this.deleteSingleItem(id, type);
                }
            }
        });
    }

    setupFileCardInteractions() {
        const fileCards = document.querySelectorAll('.file-card');
        fileCards.forEach((card, index) => {
            card.addEventListener('mouseenter', () => this.animateCard(card, 'hover'));
            card.addEventListener('mouseleave', () => this.animateCard(card, 'leave'));
            card.style.animationDelay = `${index * 0.05}s`;
        });
    }

    animateCard(card, type) {
        const icon = card.querySelector('.file-icon i');
        const actions = card.querySelector('.file-actions');
        if (type === 'hover') {
            if (icon) icon.style.transform = 'scale(1.1) rotate(5deg)';
            if (actions) {
                actions.style.opacity = '1';
                actions.style.transform = 'translateY(0)';
            }
        } else {
            if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
            if (actions) {
                actions.style.opacity = '0';
                actions.style.transform = 'translateY(10px)';
            }
        }
    }

    getItemIdentifier(card) {
        const fileId = card.dataset.fileId;
        if (fileId) {
            return { id: fileId, type: 'file' };
        }
        const folderId = card.dataset.folderId;
        if (folderId) {
            return { id: folderId, type: 'folder' };
        }
        return { id: null, type: null };
    }

    toggleSelection(card) {
        const { id } = this.getItemIdentifier(card);
        if (!id) return;

        const checkbox = card.querySelector('.file-checkbox, .folder-checkbox');
        if (this.selectedItems.has(id)) {
            this.deselectItem(card);
            if (checkbox) checkbox.checked = false;
        } else {
            this.selectItem(card);
            if (checkbox) checkbox.checked = true;
        }
        this.updateGlobalSelection();
    }

    handleCheckboxChange(card, isChecked) {
        if (isChecked) {
            this.selectItem(card);
        } else {
            this.deselectItem(card);
        }
        this.updateGlobalSelection();
    }

    selectItem(card) {
        const { id, type } = this.getItemIdentifier(card);
        if (!id) return;

        this.selectedItems.set(id, { type });
        card.classList.add('selected');
        card.style.animation = 'none';
        card.offsetHeight; // Trigger reflow
        card.style.animation = 'scaleIn 0.2s ease-out';
    }

    deselectItem(card) {
        const { id } = this.getItemIdentifier(card);
        if (!id) return;

        this.selectedItems.delete(id);
        card.classList.remove('selected');
    }

    selectAll() {
        document.querySelectorAll('.file-card').forEach(card => {
            const checkbox = card.querySelector('.file-checkbox, .folder-checkbox');
            this.selectItem(card);
            if (checkbox) checkbox.checked = true;
        });
        this.updateGlobalSelection();
    }

    deselectAll() {
        document.querySelectorAll('.file-card.selected').forEach(card => {
            const checkbox = card.querySelector('.file-checkbox, .folder-checkbox');
            this.deselectItem(card);
            if (checkbox) checkbox.checked = false;
        });
        this.updateGlobalSelection();
    }

    updateGlobalSelection() {
        if (window.fileManager) {
            const selection = Array.from(this.selectedItems.entries()).map(([id, data]) => ({ id, ...data }));
            window.fileManager.updateSelection(selection);
        }
    }

    async deleteSingleItem(id, type) {
        const isFolder = type === 'folder';
        let message = isFolder
            ? '确定要删除这个文件夹吗？文件夹内的所有文件和子文件夹都将被永久删除。'
            : '确定要删除这个文件吗？';
        
        const result = await window.fileManager.showConfirmDialog('删除确认', message, 'danger');
        if (!result) return;

        const payload = {
            file_ids: isFolder ? [] : [id],
            folder_ids: isFolder ? [id] : [],
        };

        const loadingToast = window.fileManager.showLoadingToast('正在删除...');
        try {
            const response = await fetch('/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.fileManager.getCsrfToken()
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            loadingToast.hide();

            if (result.success) {
                window.fileManager.showToast(result.message || '删除成功', 'success');
                this.removeItemFromGrid(id, type);
                window.fileManager.updateStorageInfo();
            } else {
                window.fileManager.showToast('删除失败: ' + result.error, 'error');
            }
        } catch (error) {
            loadingToast.hide();
            window.fileManager.showToast('删除出错: ' + error.message, 'error');
        }
    }

    removeItemFromGrid(id, type) {
        const selector = type === 'file' ? `.file-card[data-file-id="${id}"]` : `.file-card[data-folder-id="${id}"]`;
        const card = document.querySelector(selector);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                card.remove();
                this.selectedItems.delete(id);
                this.updateGlobalSelection();
                this.checkEmptyState();
            }, 300);
        }
    }

    checkEmptyState() {
        const fileGrid = document.getElementById('file-grid');
        if (fileGrid.childElementCount === 0) {
            fileGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                    <h5 class="empty-state-title">此文件夹为空</h5>
                    <p class="empty-state-description">拖拽文件到此以上传</p>
                </div>
            `;
        }
    }

    filterFiles(searchTerm) {
        const term = searchTerm.toLowerCase();
        document.querySelectorAll('.file-card').forEach(card => {
            const name = card.querySelector('.file-name').textContent.toLowerCase();
            card.style.display = name.includes(term) ? 'block' : 'none';
        });
    }
}

// CSS动画定义
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
    .file-card.selected {
        box-shadow: 0 0 0 2px var(--bs-primary), 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }
    .file-actions {
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
    }
`;
document.head.appendChild(style);

// 初始化文件网格管理器
document.addEventListener('DOMContentLoaded', () => {
    window.fileGridManager = new FileGridManager();
});

# 存储容量限制更新说明

## 更新内容

项目的上传文件总容量上限已从100MB更改为35GB，并实现了存储空间满时的上传限制功能。

## 主要修改

### 1. 配置文件更新 (`storage/config.py`)
- 添加了 `MAX_TOTAL_STORAGE = 35 * 1024 * 1024 * 1024` (35GB)
- 保持单个文件上传限制为100MB不变

### 2. 后端逻辑更新

#### `storage/utils.py`
- 更新 `validate_file_upload()` 函数，增加总存储空间检查
- 添加 `get_storage_usage_info()` 函数，提供详细的存储使用情况
- 改进存储空间计算和格式化显示

#### `storage/views.py`
- 更新 `file_list()` 视图，传递完整的存储信息到模板
- 更新 `get_storage_info()` API，返回详细的存储状态信息
- 上传时会检查存储空间，满了会阻止上传

### 3. 前端界面更新

#### 模板更新 (`storage/templates/storage/file_list.html`)
- 存储信息显示区域增加了"可用空间"显示
- 进度条颜色会根据使用率变化（绿色→黄色→红色）
- 当存储空间满或接近满时显示警告信息

#### JavaScript更新
- `upload-manager.js`: 添加上传前的存储空间检查
- `file-manager.js`: 更新存储信息显示逻辑，支持35GB限制
- 删除文件后自动刷新存储信息

### 4. 管理工具

#### 管理命令 (`storage/management/commands/storage_info.py`)
```bash
# 查看存储使用情况
python manage.py storage_info

# 查看详细信息（包括最大文件列表）
python manage.py storage_info --detailed
```

#### 测试脚本 (`test_storage_limit.py`)
```bash
# 测试存储限制配置
python3 test_storage_limit.py
```

## 功能特性

### 1. 存储空间监控
- 实时显示已使用空间、总容量、可用空间
- 使用率百分比显示
- 可视化进度条，颜色随使用率变化

### 2. 上传限制
- 上传前检查存储空间是否足够
- 存储空间不足时阻止上传并显示详细错误信息
- 前端和后端双重验证

### 3. 警告系统
- 使用率超过90%时显示黄色警告
- 存储空间满时显示红色警告
- 动态更新警告状态

### 4. 用户体验
- 上传失败时提供清晰的错误信息
- 删除文件后立即更新存储信息
- 响应式设计，适配不同屏幕尺寸

## 技术实现

### 存储空间计算
```python
# 获取当前使用量
current_usage = calculate_total_storage()

# 检查是否可以上传
if current_usage + file.size > MAX_TOTAL_STORAGE:
    # 阻止上传
```

### 前端检查
```javascript
// 上传前检查存储空间
const storageCheck = await this.checkStorageSpace();
if (!storageCheck.canUpload) {
    this.showToast(storageCheck.message, 'error');
    return;
}
```

## 配置说明

如需修改存储容量限制，请编辑 `storage/config.py` 文件中的 `MAX_TOTAL_STORAGE` 常量：

```python
# 修改为其他容量，例如50GB
MAX_TOTAL_STORAGE = 50 * 1024 * 1024 * 1024  # 50GB
```

## 注意事项

1. 存储空间计算基于数据库中记录的文件大小
2. 删除文件时会同时删除文件系统中的实际文件和数据库记录
3. 建议定期使用管理命令检查存储使用情况
4. 前端检查是为了提升用户体验，实际限制由后端强制执行

## 测试验证

1. 运行测试脚本确认配置正确：
   ```bash
   python3 test_storage_limit.py
   ```

2. 使用管理命令查看存储状态：
   ```bash
   python manage.py storage_info --detailed
   ```

3. 尝试上传大文件测试限制功能

## 更新完成

✅ 存储容量限制已成功更新为35GB
✅ 存储空间满时会阻止继续上传
✅ 用户界面显示详细的存储使用情况
✅ 提供管理工具用于监控存储状态
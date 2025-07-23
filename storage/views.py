from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from .models import UploadedFile, Folder
from .forms import UploadFileForm
from .utils import format_file_size, calculate_total_storage, validate_file_upload, clean_filename, get_storage_usage_info
import os
import json
import mimetypes

def file_list(request):
    current_folder_id = request.GET.get('folder')
    current_folder = None
    
    if current_folder_id:
        current_folder = get_object_or_404(Folder, id=current_folder_id)
        files = UploadedFile.objects.filter(folder=current_folder).order_by('-uploaded_at')
        folders = Folder.objects.filter(parent=current_folder).order_by('name')
    else:
        files = UploadedFile.objects.filter(folder__isnull=True).order_by('-uploaded_at')
        folders = Folder.objects.filter(parent__isnull=True).order_by('name')
    
    # 获取存储空间使用情况
    storage_info = get_storage_usage_info()
    
    return render(request, 'storage/file_list.html', {
        'files': files,
        'folders': folders,
        'current_folder': current_folder,
        'file_count': files.count(),
        'storage_info': storage_info,
    })

@csrf_exempt
@require_http_methods(["POST"])
def upload_files(request):
    """处理多文件上传的AJAX请求"""
    if not request.FILES:
        return JsonResponse({'error': '没有选择文件'}, status=400)
    
    uploaded_files = []
    errors = []
    
    for file_key in request.FILES:
        files = request.FILES.getlist(file_key)
        for file in files:
            try:
                # 验证文件
                is_valid, message = validate_file_upload(file)
                if not is_valid:
                    errors.append(f'{file.name}: {message}')
                    continue
                
                # 清理文件名
                file.name = clean_filename(file.name)
                
                # 获取目标文件夹
                folder_id = request.POST.get('folder_id')
                folder = None
                if folder_id:
                    try:
                        folder = Folder.objects.get(id=folder_id)
                    except Folder.DoesNotExist:
                        pass
                
                # 创建文件记录
                uploaded_file = UploadedFile.objects.create(
                    file=file,
                    folder=folder,
                    description=request.POST.get('description', '')
                )
                uploaded_files.append({
                    'id': uploaded_file.id,
                    'name': uploaded_file.get_filename(),
                    'size': uploaded_file.get_file_size(),
                    'type': uploaded_file.get_file_type(),
                    'uploaded_at': uploaded_file.uploaded_at.strftime('%Y-%m-%d %H:%M'),
                    'url': uploaded_file.file.url,
                })
            except Exception as e:
                errors.append(f'上传 {file.name} 失败: {str(e)}')
    
    return JsonResponse({
        'success': True,
        'files': uploaded_files,
        'errors': errors
    })

@csrf_exempt
@require_http_methods(["POST"])
def delete_files(request):
    """处理多文件删除的AJAX请求"""
    try:
        data = json.loads(request.body)
        file_ids = data.get('file_ids', [])
        
        if not file_ids:
            return JsonResponse({'error': '没有选择要删除的文件'}, status=400)
        
        deleted_count = 0
        for file_id in file_ids:
            try:
                file_obj = get_object_or_404(UploadedFile, pk=file_id)
                file_obj.delete()
                deleted_count += 1
            except Exception as e:
                continue
        
        return JsonResponse({
            'success': True,
            'deleted_count': deleted_count
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_storage_info(request):
    """获取存储信息的AJAX请求"""
    files = UploadedFile.objects.all()
    file_count = files.count()
    storage_info = get_storage_usage_info()
    
    return JsonResponse({
        'total_size': storage_info['current_usage'],
        'max_storage': storage_info['max_storage'],
        'usage_percentage': storage_info['usage_percentage'],
        'available_space': storage_info['available_space'],
        'file_count': file_count,
        'formatted_size': storage_info['formatted_current'],
        'formatted_max': storage_info['formatted_max'],
        'formatted_available': storage_info['formatted_available'],
        'is_full': storage_info['is_full'],
        'is_nearly_full': storage_info['is_nearly_full']
    })

@csrf_exempt
@require_http_methods(["POST"])
def create_folder(request):
    """创建新文件夹"""
    try:
        data = json.loads(request.body)
        folder_name = data.get('name', '').strip()
        parent_id = data.get('parent_id')
        
        if not folder_name:
            return JsonResponse({'error': '文件夹名称不能为空'}, status=400)
        
        # 检查文件夹名称是否合法
        if any(char in folder_name for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']):
            return JsonResponse({'error': '文件夹名称包含非法字符'}, status=400)
        
        parent_folder = None
        if parent_id:
            try:
                parent_folder = Folder.objects.get(id=parent_id)
            except Folder.DoesNotExist:
                return JsonResponse({'error': '父文件夹不存在'}, status=400)
        
        # 检查同级目录下是否已存在同名文件夹
        if Folder.objects.filter(name=folder_name, parent=parent_folder).exists():
            return JsonResponse({'error': '文件夹名称已存在'}, status=400)
        
        # 创建文件夹
        folder = Folder.objects.create(
            name=folder_name,
            parent=parent_folder
        )
        
        return JsonResponse({
            'success': True,
            'folder': {
                'id': folder.id,
                'name': folder.name,
                'created_at': folder.created_at.strftime('%Y-%m-%d %H:%M'),
                'file_count': 0
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def move_files(request):
    """移动文件到指定文件夹"""
    try:
        data = json.loads(request.body)
        file_ids = data.get('file_ids', [])
        target_folder_id = data.get('target_folder_id')
        
        if not file_ids:
            return JsonResponse({'error': '没有选择要移动的文件'}, status=400)
        
        target_folder = None
        if target_folder_id:
            try:
                target_folder = Folder.objects.get(id=target_folder_id)
            except Folder.DoesNotExist:
                return JsonResponse({'error': '目标文件夹不存在'}, status=400)
        
        moved_count = 0
        for file_id in file_ids:
            try:
                file_obj = UploadedFile.objects.get(id=file_id)
                file_obj.folder = target_folder
                file_obj.save()
                moved_count += 1
            except UploadedFile.DoesNotExist:
                continue
        
        return JsonResponse({
            'success': True,
            'moved_count': moved_count
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def delete_folder(request):
    """删除文件夹"""
    try:
        data = json.loads(request.body)
        folder_id = data.get('folder_id')
        
        if not folder_id:
            return JsonResponse({'error': '文件夹ID不能为空'}, status=400)
        
        try:
            folder = Folder.objects.get(id=folder_id)
        except Folder.DoesNotExist:
            return JsonResponse({'error': '文件夹不存在'}, status=400)
        
        # 检查文件夹是否为空
        if folder.files.exists() or folder.subfolders.exists():
            return JsonResponse({'error': '只能删除空文件夹'}, status=400)
        
        folder.delete()
        
        return JsonResponse({
            'success': True,
            'message': '文件夹删除成功'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_folder_tree(request):
    """获取文件夹树结构"""
    def build_tree(parent=None):
        folders = Folder.objects.filter(parent=parent).order_by('name')
        tree = []
        for folder in folders:
            tree.append({
                'id': folder.id,
                'name': folder.name,
                'file_count': folder.get_file_count(),
                'children': build_tree(folder)
            })
        return tree
    
    return JsonResponse({
        'success': True,
        'tree': build_tree()
    })

def health_check(request):
    """健康检查端点"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Application is running'
    })


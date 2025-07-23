from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from .models import UploadedFile
from .forms import UploadFileForm
from .utils import format_file_size, calculate_total_storage, validate_file_upload, clean_filename, get_storage_usage_info
import os
import json
import mimetypes

def file_list(request):
    files = UploadedFile.objects.all().order_by('-uploaded_at')
    
    # 获取存储空间使用情况
    storage_info = get_storage_usage_info()
    
    return render(request, 'storage/file_list.html', {
        'files': files,
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
                
                # 创建文件记录
                uploaded_file = UploadedFile.objects.create(
                    file=file,
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


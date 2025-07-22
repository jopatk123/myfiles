from django.shortcuts import render, redirect
from django.http import HttpResponse, Http404
from .models import UploadedFile
from .forms import UploadFileForm
import os

def file_list(request):
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('file_list')
    else:
        form = UploadFileForm()
    
    files = UploadedFile.objects.all().order_by('-uploaded_at')
    return render(request, 'storage/file_list.html', {
        'files': files,
        'form': form,
    })

def delete_file(request, pk):
    if request.method == 'POST':
        file_to_delete = UploadedFile.objects.get(pk=pk)
        file_to_delete.delete()
    return redirect('file_list')
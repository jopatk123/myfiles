from django.urls import path
from . import views

urlpatterns = [
    path('', views.file_list, name='file_list'),
    path('upload/', views.upload_files, name='upload_files'),
    path('delete/', views.delete_files, name='delete_files'),
    path('storage-info/', views.get_storage_info, name='storage_info'),
]

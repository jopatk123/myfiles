from django.urls import path
from . import views

urlpatterns = [
    path('', views.file_list, name='file_list'),
    path('upload/', views.upload_files, name='upload_files'),
    path('delete/', views.delete_files, name='delete_files'),
    path('storage-info/', views.get_storage_info, name='storage_info'),
    path('create-folder/', views.create_folder, name='create_folder'),
    path('move-files/', views.move_files, name='move_files'),
    path('delete-folder/', views.delete_folder, name='delete_folder'),
    path('folder-tree/', views.get_folder_tree, name='folder_tree'),
    path('health/', views.health_check, name='health_check'),
]

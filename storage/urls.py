from django.urls import path
from . import views

urlpatterns = [
    path('', views.file_list, name='file_list'),
    path('delete/<int:pk>/', views.delete_file, name='delete_file'),
]

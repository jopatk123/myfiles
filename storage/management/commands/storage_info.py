from django.core.management.base import BaseCommand
from storage.utils import get_storage_usage_info
from storage.models import UploadedFile

class Command(BaseCommand):
    help = '显示存储空间使用情况'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='显示详细信息',
        )

    def handle(self, *args, **options):
        storage_info = get_storage_usage_info()
        
        self.stdout.write(self.style.SUCCESS('=== 存储空间使用情况 ==='))
        self.stdout.write(f"当前已使用: {storage_info['formatted_current']}")
        self.stdout.write(f"最大容量: {storage_info['formatted_max']}")
        self.stdout.write(f"可用空间: {storage_info['formatted_available']}")
        self.stdout.write(f"使用率: {storage_info['usage_percentage']:.1f}%")
        
        if storage_info['is_full']:
            self.stdout.write(self.style.ERROR('⚠️  存储空间已满！'))
        elif storage_info['is_nearly_full']:
            self.stdout.write(self.style.WARNING('⚠️  存储空间即将用完！'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ 存储空间充足'))
        
        if options['detailed']:
            files = UploadedFile.objects.all().order_by('-file__size')[:10]
            self.stdout.write('\n=== 最大的10个文件 ===')
            for file in files:
                self.stdout.write(f"{file.get_formatted_size():>10} - {file.get_filename()}")
            
            total_files = UploadedFile.objects.count()
            self.stdout.write(f'\n总文件数: {total_files}')
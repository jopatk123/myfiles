import os
import sys
from django.core.management.utils import get_random_secret_key

def check_django_config():
    """
    Tests the Django configuration.
    """
    try:
        from personal_cloud_project import settings
        print("✅ Django settings imported successfully.")

        if not settings.SECRET_KEY:
            print("❌ SECRET_KEY is not set.")
            sys.exit(1)
        
        if settings.DEBUG:
            print("⚠️ DEBUG is set to True in production.")
        
        print("✅ SECRET_KEY is set.")
        print("✅ Django configuration seems ok.")
        sys.exit(0)
    except ImportError as e:
        print(f"❌ Error importing Django settings: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Set a dummy secret key for testing purposes if it's not set
    if 'DJANGO_SETTINGS_MODULE' not in os.environ:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'personal_cloud_project.settings')
    if 'SECRET_KEY' not in os.environ:
        os.environ['SECRET_KEY'] = get_random_secret_key()
    
    # Add the project directory to the python path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    check_django_config()

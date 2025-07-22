from django.db import models
import os

class UploadedFile(models.Model):
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return os.path.basename(self.file.name)

    def delete(self, *args, **kwargs):
        # First, delete the file from the filesystem
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        # Now, call the superclass method to delete the database record
        super(UploadedFile, self).delete(*args, **kwargs)
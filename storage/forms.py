from django import forms
from .models import UploadedFile

class UploadFileForm(forms.ModelForm):
    class Meta:
        model = UploadedFile
        fields = ('file', 'description')
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Optional: file description'}),
            'file': forms.FileInput(attrs={'class': 'form-control'}),
        }

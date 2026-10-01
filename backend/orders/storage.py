import uuid
import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class ReceiptStorage(FileSystemStorage):
    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):
        raise ValueError('Receipts must be accessed through the authenticated API.')


def receipt_path(instance, filename):
    extension = filename.rsplit('.', 1)[-1].lower()
    return f'receipts/{uuid.uuid4().hex}.{extension}'

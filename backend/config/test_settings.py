import os

# Tests never use a developer's database, mail account, or tracked .env secrets.
os.environ['DEBUG'] = 'True'
os.environ['OWNER_PREVIEW_MODE'] = 'False'
os.environ['SECRET_KEY'] = 'isolated-test-key-not-for-production-use-000000000000000'
os.environ['DATABASE_URL'] = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
os.environ['EMAIL_BACKEND'] = 'django.core.mail.backends.locmem.EmailBackend'

from .settings import *  # noqa: F403,E402

ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

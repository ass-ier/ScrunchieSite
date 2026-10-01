import shutil
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from orders.models import Order


class Command(BaseCommand):
    help = 'Move legacy order receipts from public media into private storage. Back up media first.'

    def handle(self, *args, **options):
        public_root = Path(settings.MEDIA_ROOT).resolve()
        private_root = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
        if private_root == public_root or public_root in private_root.parents:
            raise CommandError('Private receipt storage must be outside public media.')
        moved = 0
        for name in Order.objects.exclude(receipt_url='').values_list('receipt_url', flat=True).distinct():
            source, destination = (public_root / name).resolve(), (private_root / name).resolve()
            if public_root not in source.parents or private_root not in destination.parents:
                raise CommandError('Unsafe legacy receipt path. Review the database before proceeding.')
            if source.is_file():
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists() and source.read_bytes() != destination.read_bytes():
                    raise CommandError('A different private receipt already exists; refusing to overwrite it.')
                shutil.copy2(source, destination)
                source.unlink()
                moved += 1
            elif not destination.is_file():
                raise CommandError('An order receipt is missing. Restore it from backup before deployment.')
        self.stdout.write(f'Moved {moved} legacy receipts to private storage.')

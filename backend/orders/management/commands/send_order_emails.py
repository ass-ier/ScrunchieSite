from django.core.management.base import BaseCommand, CommandError
from orders.models import OrderEmail
from orders.services import deliver_email


class Command(BaseCommand):
    help = 'Retry up to 100 unsent order emails. Schedule every five minutes.'

    def handle(self, *args, **options):
        ids = list(OrderEmail.objects.filter(sent_at__isnull=True).order_by('attempts', 'created_at').values_list('pk', flat=True)[:100])
        results = [deliver_email(pk) for pk in ids]
        self.stdout.write(f'{sum(results)}/{len(ids)} emails accepted by the email backend.')
        if not all(results):
            raise CommandError('Some emails failed and remain queued. Check SMTP configuration.')

# Deploying AKEYA

This is the current deployment guide. Older setup/checklist documents are
historical. Target: Vercel storefront + Render Django API, PostgreSQL, persistent
file storage and SMTP email. No automatic payment gateway is used.

## 1. Prepare credentials and business details

- Rotate any credentials previously committed in `backend/.env`. Removing it
  from tracking does not remove it from old commits. Keep database backups private.
- Generate a new production Django secret (at least 50 characters):
  `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- Set up a transactional SMTP provider. Verify your sender/domain and configure
  SPF/DKIM/DMARC according to that provider's instructions.
- Confirm your real bank/Telebirr account numbers, account holder, delivery fee,
  supported delivery area and pickup address. Enter them in the owner interface.
- Prepare product photos and available quantities. No seed stock/accounts are
  automatically published.

## 2. Backend on Render

Use the repository's `render.yaml` as a Render Blueprint. Review costs before
creating it: it includes a **paid** web service, disk, PostgreSQL and cron job.
For an existing Render service, apply the equivalent settings manually rather
than creating a second production database.

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Python | 3.13 |
| Build | `bash build.sh` |
| Start | `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60 --access-logfile -` |
| Health endpoint | `/api/health/` |
| Persistent disk mount | `/var/data` |
| Public media | `MEDIA_ROOT=/var/data/media` |
| Private receipts | `PRIVATE_MEDIA_ROOT=/var/data/private-media` |

Required environment:

```dotenv
DEBUG=False
SECRET_KEY=<new-random-secret-at-least-50-characters>
DATABASE_URL=<Render-internal-PostgreSQL-URL>
ALLOWED_HOSTS=<your-api-hostname>
FRONTEND_URL=https://<your-storefront-hostname>
MEDIA_ROOT=/var/data/media
PRIVATE_MEDIA_ROOT=/var/data/private-media
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<SMTP-host>
EMAIL_PORT=587
EMAIL_HOST_USER=<SMTP-username>
EMAIL_HOST_PASSWORD=<SMTP-password>
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=AKEYA <orders@your-verified-domain>
```

`CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` default to `FRONTEND_URL`.
Override them with comma-separated HTTPS origins if necessary. Add the API's
HTTPS origin to `CSRF_TRUSTED_ORIGINS` if your proxy setup requires it for Django
admin. Do not use wildcard allowed hosts or CORS origins.

Render supplies the trusted forwarded-protocol header. For another host, ensure
your reverse proxy strips untrusted forwarding headers and sets
`X-Forwarded-Proto` itself.

For SMTP providers using port 465, set `EMAIL_USE_SSL=True`,
`EMAIL_USE_TLS=False`, and `EMAIL_PORT=465` on **both API and retry job**.
Keep the two services' mail settings synchronized and resync the Blueprint after
changing referenced environment variables.

The API refuses production startup without PostgreSQL, a strong secret, an
HTTPS storefront URL, an SMTP host and a non-local sender. This catches missing
configuration, not invalid provider credentials or DNS.

### Receipt and image storage

**Do not use Render's ephemeral filesystem or free web tier for uploads.**
The provided configuration requires a persistent disk. Receipts are stored
outside public media and can only be read through a staff-authenticated endpoint.
Only `/media/products/...` is public. Do not add a catch-all `/media/` route.
Receipt responses are marked private/no-store.

Product images are served from the persistent disk by Django. This is suitable
for a small, single-instance store. If scaling to multiple instances, first
replace it with public object storage for products and private authenticated
object storage for receipts; do not simply share receipt URLs publicly.

Back up **both PostgreSQL and the disk**. Test restoration. Set an owner-approved
receipt retention policy and delete expired files through a controlled maintenance
process; there is intentionally no unaudited "delete order" button.

### Existing installation upgrade

Take a database/media backup and pause checkout before upgrading. Do not deploy
the tracked development SQLite database. Migrate existing real production data
separately if it is currently in SQLite.

After deploying the schema, with old public media restored at `MEDIA_ROOT`, run:

```sh
python manage.py privatize_receipts
```

This moves only receipt files referenced by orders to private storage and
removes those copies from the public directory. It refuses conflicting or missing
files rather than reporting success. Existing public copies in a CDN/object
store or backups must also be removed/restricted manually. New receipts never
enter public storage.

The migration gives each existing order a distinct tracking token and snapshots
current product names/colors. Legacy orders do not have recoverable size
selections if the old checkout never saved them; reconcile their inventory
manually. Historical duplicate transaction references remain readable, while new
submissions cannot reuse those references. Legacy orders without an email address
cannot receive email until their contact details are corrected by the operator.

## 3. Email delivery and retries

Order receipt and payment-decision emails are recorded in a database outbox.
After a committed order/decision the API attempts delivery immediately. SMTP
failure does not roll back the order or pretend the email was sent.

The owner sees pending/failed email status and a **Retry email** button. The
Blueprint's cron job runs this every five minutes:

```sh
python manage.py send_order_emails
```

It processes at most 100 unsent emails per run and exits nonzero if any fail.
Monitor cron failures and the dashboard's unsent count. Set the same database,
sender and SMTP credentials on the cron service. It does not need access to
receipt files. For a manual setup, create the cron only after initial migrations.

Email delivery is **at least once**: a rare crash after SMTP acceptance but before
the database is updated can lead to a duplicate email. "Accepted by email server"
does not guarantee inbox delivery. Monitor bounces and test both approval and
decline emails with a real mailbox. Local console/locmem backends do not deliver.

## 4. Frontend on Vercel

Import the repository and choose `frontend` as the root, Vite as the framework,
`npm ci && npm run build` as the build command, and `dist` as the output.
Set this environment variable **before building**:

```dotenv
VITE_API_URL=https://<your-api-hostname>/api
```

The existing committed frontend environment files contain old deployment URLs;
override them with the correct Vercel environment value. `vercel.json` rewrites
client routes to the SPA so checkout, owner pages and tracking links survive
refreshes. Never put SMTP passwords, Django secrets or database URLs in Vite
variables: they are public browser code.

## 5. Owner onboarding

In the Render shell:

```sh
python manage.py createsuperuser
```

Use an international phone number (`+251...`) and a strong password. Sign in on
the **frontend** at `/admin/login`. Owner login does not require SMS.

1. **Store settings:** real account holder and transfer accounts, fee, pickup
   address, optional announcement. Checkout stays closed until configured.
2. **Products:** create categories, upload photos, set price/color/sizes and
   current sellable stock. Check Featured to show products on the home page.
3. **Promotions:** create optional discount codes and choose public visibility.
4. **Orders:** review the receipt **and your bank records**, authenticate or
   decline with a clear explanation, and handle email failures.

Pending orders reserve inventory. Rejection restores stock and coupon usage
once. Verified/rejected decisions cannot be reversed with the API. Mistakes,
refunds or a corrected transfer require owner contact and an explicitly
reconciled process; the app never promises or automatically performs refunds.
The same transaction ID cannot be used to create a replacement order.
Inventory inputs mean stock available for *new* orders, excluding reservations.

A quote is not a stock hold: availability is checked again when the receipt is
submitted. The checkout warns customers to submit promptly and contact the store
with their receipt if availability changes after transferring. The owner must
manually reconcile such transfers; this app cannot reverse bank payments.

Optional customer phone accounts need real Twilio credentials
(`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) for
registration/password reset. Guest checkout does not depend on Twilio.

## 6. Launch gate

Run `python manage.py check --deploy` with the real production environment.
Then use your own small test transfer to verify:

- Mobile and desktop product browsing, size selection, cart and current quote.
- Valid/invalid email, image type/size checks, required transaction ID.
- Confirmation page and private tracking on a fresh browser.
- Staff-only receipt access; anonymous receipt requests must be rejected.
- Authenticating sends the right email; declining sends the reason and restores
  stock once. Always check the transfer in the actual receiving account.
- Intentionally failing SMTP leaves the decision saved and the email queued;
  fixing SMTP and retrying sends it without repeating the stock action.
- Featured products, hidden products, scheduled promotion expiry, pickup/fees.
- Deep-link refreshes on Vercel and durable images/receipts after API restart.
- Backup/restore, monitoring, support contact and delivery/refund/privacy policies.

The repository includes automated checkout/catalog and PostgreSQL concurrency
tests, but production credentials, email deliverability, bank ownership, shipping
coverage and legal policies must be verified by the owner before accepting orders.

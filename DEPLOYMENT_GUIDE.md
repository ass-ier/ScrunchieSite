# Deploying AKEYA

This is the current deployment guide. Older setup/checklist documents are
historical. Target: Vercel storefront + Render Django API, PostgreSQL, persistent
file storage and SMTP email. No automatic payment gateway is used.

## Share the same local preview with the owner

Use this path to show the owner the **current local design and 12 demo products**,
not an empty shop. The bundle at `backend/products/owner_preview/` includes the
public catalog snapshot and matching product pictures. It preserves the local
names, descriptions, prices, colors, S/M/L quantities, featured flags, delivery
fee and demo announcement. The Moss product currently has 53 units; the others
have 54. There are no active promotions in the snapshot.

The owner's transparent portraits, scroll animations and other frontend assets
are already in `frontend/public/` and deploy with Vercel. The public product
records and product image uploads live separately in PostgreSQL and Render's
media disk. **Pushing the repository does not copy a local database or media
directory.** The one-time import below takes care of the bundled preview data.

No local users, admin passwords, orders, receipts, private customer details or
payment credentials are included. The bundled transfer details remain
`DEMO ONLY - DO NOT TRANSFER` / `DEMO-ACCOUNT`; this is not a store for real
payments. You must create a new owner account on Render if you want to demonstrate
the management dashboard.

### A. Push the new preview bundle and loader

Commit and push the updated repository, including the new
`load_owner_preview` command, `backend/products/owner_preview/`, the tests and
this guide. Choose the **same deployed branch** on both Vercel and Render. If you
use `main`, merge these changes into `main` first. Local files are not visible to
either provider until pushed.

For a fresh owner-preview environment, create new services rather than replacing
an existing production database. If you reuse existing services, back up their
database and uploads first. The import refuses to overwrite existing content.

### B. Create the Vercel frontend to obtain its URL

1. In Vercel choose **Add New → Project**, import `ass-ier/ScrunchieSite`, and
   select the branch from step A.
2. Set **Root Directory** to `frontend` and **Framework Preset** to **Vite**.
3. Use **Install Command** `npm ci`, **Build Command** `npm run build`, and
   **Output Directory** `dist`.
4. Under **Environment Variables**, add `VITE_API_URL` for **Production**. If you
   already know your Render URL, use `https://YOUR-API.onrender.com/api`.
   Otherwise use `https://api.invalid/api` temporarily so the first preview
   cannot accidentally call the old backend committed in `.env.production`.
5. Click **Deploy**. Copy the assigned production URL, for example
   `https://YOUR-STORE.vercel.app`. The first deployment may show catalog-loading
   errors until Render is connected; do not share it yet.

If a Vercel project already exists, update these settings instead of importing
another one. The value of `VITE_API_URL` is baked into each build; changing it
later requires a redeploy.

### C. Create Render services

The supplied Blueprint creates a paid web service with a persistent disk,
a PostgreSQL database, and a five-minute email retry cron job. Review the
estimated charges before applying it. **Do not select a free web service for
this upload-based setup**; its ephemeral files will not survive redeploys.

1. In Render choose **New → Blueprint** and connect `ass-ier/ScrunchieSite`.
2. Select the same branch as Vercel. Use the repository's root `render.yaml`.
3. Supply the requested values:

| Variable | What to enter |
| --- | --- |
| `SECRET_KEY` | A new random value of at least 50 characters; generate locally with `python3 -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `FRONTEND_URL` | The complete Vercel production URL from step B, without a trailing slash |
| `EMAIL_HOST` | Your transactional email provider's SMTP hostname |
| `EMAIL_HOST_USER` | That provider's SMTP username |
| `EMAIL_HOST_PASSWORD` | That provider's SMTP password/key |
| `DEFAULT_FROM_EMAIL` | `AKEYA <orders@your-verified-domain>` using a sender verified with that provider |

4. Review and apply the Blueprint. Wait for `akeya-api` and `akeya-db` to become
   available. Copy the API service's actual `.onrender.com` URL.
5. Check `https://YOUR-API.onrender.com/api/health/`; it should return
   `{"status":"ok"}`.

The Blueprint supplies `DEBUG=False`, Python 3.13.7, the internal PostgreSQL
connection, the API hostname, SMTP port 587/TLS, `/var/data/media`, and
`/var/data/private-media`. It mounts a persistent disk at `/var/data`.
Use a real SMTP configuration even for this hosted preview: secure production
startup currently requires it. Do not turn `DEBUG=True` to bypass that check.
If you use SMTP port 465, follow the SSL instructions later in this guide.

### D. Load the local products into Render once

Open **Render → akeya-api → Shell**, and run:

```sh
python manage.py load_owner_preview --confirm-demo
python manage.py createsuperuser
```

The first command should report **12 products and 4 categories**. It copies
the bundled photos onto the persistent media disk and inserts the catalog and
demo settings into PostgreSQL. It works with `DEBUG=False` and does not need
the frontend folder, which Render cannot access from a `backend` root directory.

When creating the superuser, enter an international phone number (`+251...`),
a username and a strong password. These credentials are for the frontend's
`/admin/login` page; do not reuse the local preview password.

**Run the import only once, in a fresh database.** Do not add it to the build or
start command. Rerunning safely refuses rather than resetting stock, prices,
owner edits, settings or orders. If you see "Refusing to overwrite", the database
already contains data—do not delete it to force the import. Use a separate
preview database, or keep/manage the existing catalog.

### E. Connect Vercel to the new API

1. Open **Vercel → Project → Settings → Environment Variables**.
2. Set Production `VITE_API_URL` to
   `https://YOUR-ACTUAL-API.onrender.com/api` (include `/api`).
3. In **Deployments**, redeploy the production deployment.
4. On Render, confirm `FRONTEND_URL` is the exact Vercel production origin you
   will share. If you change the frontend domain, update this value and resync
   the Blueprint so the retry job gets the same domain. CORS defaults to this URL.

### F. Check and share the owner preview

- Open `/products`: all 12 products should appear with photos, sizes, colors and
  the same prices/stock as the captured local snapshot.
- Open the home page: the same four featured products and owner-portrait
  transitions should appear. The Instagram/TikTok/Telegram icons are unlinked,
  just like the current local preview, until URLs are added in Store settings.
- Sign in at `/admin/login` using the new Render superuser to show management.
- Refresh `/products/demo-satin-lilac` directly to confirm Vercel deep links.
- Check in a private/incognito browser without your Vercel login. If deployment
  protection requires authentication, share the production domain and adjust
  **Settings → Deployment Protection** for the access you intend.
- Share the **Vercel production URL**, not localhost and not the Render API URL.

The hosted preview matches the public local catalog snapshot, not local browser
state: carts, login sessions, cookies and test order history are not copied.
This is a one-time snapshot, not synchronization—subsequent local edits do not
automatically change the hosted database. Tell the owner **not to transfer real
money** to the demonstration account. Real launch requires the remaining
production checks below.

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

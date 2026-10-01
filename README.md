# AKEYA scrunchie store

A React storefront and Django REST API for a scrunchie shop in Ethiopia. Customers
pay by bank/Telebirr transfer, upload a receipt screenshot and transaction ID, and
receive an email after the owner authenticates or declines their payment.

## Customer experience

- Browse categories, colors, sizes, featured products, and image galleries.
- Cart with size selection and stock limits.
- Guest checkout with required name, phone and valid email. The email field
  explains that the address is used for order and payment-decision notifications,
  not marketing.
- Server-calculated prices, coupon discounts and delivery fees, shown **before**
  transferring. Delivery or pickup, requested date and optional notes.
- JPEG/PNG transfer screenshot (up to 5 MB) and transaction ID.
- Private order tracking without an account; confirmation includes a tracking
  code and emails include a private tracking link.
- Optional phone accounts, wishlist and order history retain the existing flows.

## Owner experience

Sign in at `/admin/login` using the staff account's **phone number and password**.
The simplified owner interface has four tabs:

| Tab | Tasks |
| --- | --- |
| Orders | Review private receipts against bank records, authenticate or decline with a customer-facing reason, retry failed email, advance fulfillment |
| Products | Add/edit photography, category, description, price, color, S/M/L stock, featured status and shop visibility |
| Promotions | Create percentage/fixed discounts, expiry, minimum purchase, usage limits, public announcements and private codes |
| Store settings | Set real account numbers, account holder, pickup location, delivery fee, store announcement and social profile links |

Each color is a separate product with its own photos and stock. When sizes exist,
total stock equals the sum of size stock. Pending orders reserve inventory;
declining restores it once. Product records referenced by orders cannot be
deleted; hide them instead. Payment decisions are terminal and audited.

The Django `/admin/` interface remains available for account administration and
read-only order/product inspection. Use the owner interface for operational
changes so stock and payment rules are applied consistently.

## Local development

Requires Python 3.13 and Node.js 20+.

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-production.txt
cp backend/.env.example backend/.env  # only if you do not already have a local .env
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py createsuperuser
../.venv/bin/python manage.py runserver
```

Enter the owner's phone in international format, for example `+251...`.
In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173/admin/login`, configure **Store settings**, and add
categories/products. Checkout intentionally stays closed until an account holder
and at least one transfer account are configured. No placeholder bank details are
used. Local email defaults to the backend console; it does **not** send real mail.

## Validation

### Full sample collection and motion preview

For an illustrative, fully stocked development shop:

```sh
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py seed_demo_catalog --replace-preview
```

This creates 12 sample colorways across Satin, Organza, Velvet and Linen, with
18 units in each S/M/L size, and hides the original `satin-scrunchie` preview
product without deleting its order history. The command is disabled when
`DEBUG=False`. Rerunning does not reset existing sample stock or overwrite product
edits. `--refresh-images` updates only the sample illustrations. The replacement
option also pauses the old `PREVIEW10`/`BROWSER20` preview promotions.

Sample pricing, stock and the original procedural WebP illustrations are for
demonstration, not real merchandise. Replace them with actual inventory/photos
before launch. Assets are bundled in `frontend/public/catalog`; the corresponding
3D fabric geometry is in `frontend/src/lib/scrunchieScene.js`.

The landing page includes a lazy-loaded Three.js scrunchie with color, stretch,
twist and drag interactions. The "One little loop. So many yous." section now uses
the **owner's supplied three-look image**, cropped into ponytail, bun and wrist
portraits with transparent backgrounds, without facial, hair, body or accessory
retouching. It is not a generated
person, a photo reenactment, or a 3D reconstruction.

Scrolling moves one full-width scene through six compositions:
**"Ponytails?" → portrait → "Messy buns?" → portrait → "On your wrist?" → portrait.**
The entire composition slides, with short holds to read each question and see
each photo. Scrolling back reverses the sequence. Keyboard-accessible chapter
links jump directly to the corresponding portraits. No timers, wheel interception,
or external image services are involved.

The six responsive WebP files total under 400 KB. Their local processing record
is `frontend/public/ritual/owner-portraits.json`. The original attachment is not
served, and image metadata is omitted. All six images contain real alpha
transparency, so the section's green background shows through around the hair,
scrunchies and clothing.

To regenerate the cutouts from the supplied three-panel image, use a separate
image-processing environment (these packages are not needed in production):

```sh
python3 -m venv assets/.venv
assets/.venv/bin/pip install -r assets/requirements-images.txt
assets/.venv/bin/python assets/prepare_owner_portraits.py /path/to/triptych.png
```

The first run downloads the approximately 973 MB BiRefNet portrait model into
rembg's local model cache; set `U2NET_HOME` to choose another cache directory.
Only model weights are downloaded. Portraits are processed entirely locally on
the CPU, and no image is sent to a service. The mask changes transparency only;
the original foreground RGB pixels are preserved before WebP encoding.
`assets/owner_background_refinements.json` records reviewed inner-gap mask
refinements around the ponytail and raised hand; these are applied only when
the source image matches the recorded SHA-256 hash.

Scroll reveals and interaction feedback extend across shopping, checkout,
account and owner pages. **Pause motion** stops decorative animation; the site
also honors the device's reduced-motion preference. The owner sequence snaps
between still compositions when motion is paused, with all three portraits
still reachable. It requires no WebGL. Image failures show an explicit message
and a retry control. The separate hero scrunchie's 3D loop stops offscreen/in
hidden tabs.

### Retained Blender source (not used by the owner section)

Open **`assets/blender/akeya-ritual.blend`** in Blender (created with Blender 3.0).
This earlier stylized mannequin is preserved for editing, but it is no longer
loaded or shown by the live styling section. The earlier stock photo assets are
also retained with their credits, but are not used by the section.
The timeline has labeled markers at frame 1 (ponytail), 61 (bun) and 121 (wrist).
The camera, hair groups, forearm pose and scrunchies have editable animation
tracks. Materials, meshes and studio lights are included. Nothing in the build
opens or replaces an existing interactive Blender session.

To reproduce the original scene and assets from the procedural source:

```sh
"/Applications/Blender.app/Contents/MacOS/Blender" \
  --background --factory-startup --python assets/blender/build_ritual.py \
  -- --render-posters
.venv/bin/python assets/blender/optimize_posters.py
```

On another OS, substitute your Blender executable. **This rebuild overwrites the
generated `.blend`, GLB and stills**; save manual Blender edits under another name
before regenerating. The script starts with an empty scene only in its own
background process. Raw renders go to ignored `assets/blender/renders/`.

The retained model is `frontend/public/ritual/akeya-ritual.glb` (approximately
4.2 MB); the live owner section does not request it. The three legacy Blender
stills total about 130 KB. For manual exports, keep the `RitualCamera` camera and animation range
1–121 at 24 fps, include camera and animation export, and use glTF's +Y-up
conversion. `animation.json` records the original export metadata. Deploy only
the web assets; the `.blend` and build scripts do not need to be served.

Use **Style group** and **Color swatch** in the product editor to link real color
variants. Selecting a color loads that product's photos, price and stock; it does
not merely recolor an unrelated item.

The Instagram, TikTok and Telegram icons beneath the footer brand description
use **Store settings → Social links**. Enter a full HTTPS profile/channel URL for
each platform. Empty fields leave a muted, non-clickable icon instead of sending
visitors to a placeholder account; configured links open safely in a new tab.

### Automated checks

```sh
cd backend
../.venv/bin/python manage.py test orders products --settings=config.test_settings
../.venv/bin/python manage.py makemigrations --check --dry-run --settings=config.test_settings
cd ../frontend
npm test
npm run build
```

Tests isolate the database and mail backend from local credentials. To exercise
PostgreSQL row-lock concurrency, set `TEST_DATABASE_URL` to a disposable local
PostgreSQL database whose user can create test databases. The concurrency test is
skipped on SQLite; production requires PostgreSQL.

## Deployment

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for the authoritative production
instructions, required secrets, persistent receipt storage, SMTP, upgrades and
launch checks. `render.yaml` defines a paid API service, PostgreSQL, a persistent
media disk and a five-minute email retry job. `frontend/vercel.json` handles SPA
routes on Vercel.

The source is prepared for deployment, but no hosting resources, sender domain,
real transfer accounts or credentials are provisioned by the code. Verify email
delivery using your own SMTP account before launch. Older roadmap, feature and
setup documents in this repository are historical and may describe superseded
flows; this README and the deployment guide take precedence.

**Repository hygiene:** the previously tracked `.env`, local SQLite database and
Python bytecode are no longer versioned. This does not erase Git history. Rotate
any credentials that were ever committed and review historical data exposure
before publishing the repository. Never deploy the development database.

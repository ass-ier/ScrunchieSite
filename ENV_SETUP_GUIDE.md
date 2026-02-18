# Environment Variables Setup Guide

## How to Get Each Value

### 1. SECRET_KEY
**What it is:** A secret key for Django's cryptographic signing.

**How to generate:**
```bash
# Option 1: Using Python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Option 2: Using online generator
# Visit: https://djecrety.ir/
```

**Example:**
```
SECRET_KEY=django-insecure-8k#2m@x9p$5n&w7q!3r^t6y*u8i(o)p_a+s=d-f[g]h{j}k
```

---

### 2. DEBUG
**What it is:** Controls debug mode (shows detailed errors).

**Values:**
- `True` - For development (shows detailed errors)
- `False` - For production (hides errors from users)

**For now, use:**
```
DEBUG=True
```

---

### 3. ALLOWED_HOSTS
**What it is:** Domains allowed to access your Django app.

**For development:**
```
ALLOWED_HOSTS=localhost,127.0.0.1
```

**For production (add your domain):**
```
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com,www.yourdomain.com
```

---

### 4. Database Settings (PostgreSQL)

#### DB_NAME
**What it is:** Name of your PostgreSQL database.

**How to set up:**
```bash
# Open PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE azmud_bakehouse;

# Exit
\q
```

**Use:**
```
DB_NAME=azmud_bakehouse
```

#### DB_USER
**What it is:** PostgreSQL username.

**Default is usually:**
```
DB_USER=postgres
```

**Or your custom username if you created one.**

#### DB_PASSWORD
**What it is:** Password for your PostgreSQL user.

**This is the password you set when installing PostgreSQL.**

If you forgot it:
```bash
# On macOS with Homebrew:
# Reset password by editing pg_hba.conf to trust, then:
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';

# On Windows:
# Use pgAdmin to reset password
```

**Use:**
```
DB_PASSWORD=your_actual_postgres_password
```

#### DB_HOST & DB_PORT
**For local development:**
```
DB_HOST=localhost
DB_PORT=5432
```

---

### 5. Cloudinary Settings (Image Storage)

Cloudinary is a cloud service for storing images. You need to create a free account.

#### Step-by-Step:

**1. Sign up for Cloudinary:**
- Go to: https://cloudinary.com/users/register/free
- Create a free account (no credit card required)
- Verify your email

**2. Get your credentials:**
- After login, you'll see your Dashboard
- Look for "Account Details" or "API Keys" section
- You'll see:
  - Cloud Name
  - API Key
  - API Secret

**3. Copy the values:**

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=1234567890123456
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Example from Cloudinary Dashboard:**
```
Cloud name: dxyz123abc
API Key: 123456789012345
API Secret: abc123def456ghi789jkl012mno345p
```

---

## Complete .env File Example

Create `backend/.env` file with these values:

```bash
# Django Settings
SECRET_KEY=django-insecure-8k#2m@x9p$5n&w7q!3r^t6y*u8i(o)p_a+s=d-f[g]h{j}k
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Settings
DB_NAME=azmud_bakehouse
DB_USER=postgres
DB_PASSWORD=mypassword123
DB_HOST=localhost
DB_PORT=5432

# Cloudinary Settings (get from cloudinary.com)
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789jkl012mno345p
```

---

## Quick Setup Commands

### 1. Generate SECRET_KEY
```bash
cd backend
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2. Create PostgreSQL Database
```bash
# Start PostgreSQL (if not running)
# macOS with Homebrew:
brew services start postgresql@14

# Windows: Start from Services or pgAdmin

# Create database
psql -U postgres
# Enter your postgres password when prompted
CREATE DATABASE azmud_bakehouse;
\q
```

### 3. Test Database Connection
```bash
psql -U postgres -d azmud_bakehouse
# If successful, you'll see:
# azmud_bakehouse=#
\q
```

---

## Alternative: Using SQLite (No PostgreSQL Setup)

If you want to skip PostgreSQL setup for now, you can use SQLite:

**Edit `backend/config/settings.py`:**

Replace the DATABASES section with:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

Then you don't need DB_NAME, DB_USER, DB_PASSWORD, etc. in your .env file.

---

## Troubleshooting

### "psql: command not found"
PostgreSQL is not installed or not in PATH.

**Install PostgreSQL:**
- macOS: `brew install postgresql@14`
- Windows: Download from https://www.postgresql.org/download/
- Ubuntu: `sudo apt install postgresql postgresql-contrib`

### "FATAL: password authentication failed"
Wrong password for PostgreSQL user.

**Reset password:**
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

### "Cloudinary credentials invalid"
Double-check you copied the correct values from Cloudinary dashboard.

---

## Next Steps After Setting .env

1. **Activate virtual environment:**
   ```bash
   cd backend
   source venv/bin/activate  # macOS/Linux
   # or
   venv\Scripts\activate  # Windows
   ```

2. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

3. **Create admin user:**
   ```bash
   python manage.py createsuperuser
   ```

4. **Start server:**
   ```bash
   python manage.py runserver
   ```

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to Git
- Never share your SECRET_KEY or API secrets
- Use different credentials for production
- Set DEBUG=False in production
- The `.env` file is already in `.gitignore`

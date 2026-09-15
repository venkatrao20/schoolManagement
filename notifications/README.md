# School Notification Portal

## Local demo setup

Python 3.11 or newer is recommended.

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python seed_data.py
python app.py
```

### Windows PowerShell

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py seed_data.py
py app.py
```

Open `http://127.0.0.1:5001` in a browser. Keep `school.db` beside `app.py` to use the existing demo data. Running `seed_data.py` resets the local demo data.

Demo accounts:

- Admin: `admin@example.com` / `admin123`
- Teacher: `rahul@example.com` / `teacher123`
- Parent: `priya@example.com` / `parent123`
- Primary coordinator (classes 1-5): `primary.coordinator@example.com` / `primary123`
- Secondary coordinator (classes 6-10): `secondary.coordinator@example.com` / `secondary123`

## Environment configuration

Copy `.env.example` values into the hosting provider's environment settings. Set a unique `SECRET_KEY` before sharing a deployed URL. Set `PORT` if the hosting provider supplies one.

### Mobile push notifications

Web Push is supported for parents and other authenticated users who enable it
from the Notifications screen. Configure a VAPID key pair and these server
environment variables:

Install the dependencies and generate a key pair once:

```bash
python -m pip install -r requirements.txt
python generate_vapid_keys.py
```

Copy the three printed lines into the hosting provider's environment settings.
Keep `VAPID_PRIVATE_KEY` secret and do not commit it to the repository.

```text
VAPID_PUBLIC_KEY=<URL-safe base64 public key>
VAPID_PRIVATE_KEY=<private key accepted by pywebpush>
VAPID_SUBJECT=mailto:notifications@example.com
```

The application must be served over HTTPS in production. Browsers allow push
on `localhost` for development, but a plain HTTP deployed URL cannot register
a service worker or receive push messages. The user must grant notification
permission once on each phone/browser. Push delivery is in addition to the
existing in-app notification and does not replace it.

## Production start

The included `Procfile` starts the app with Gunicorn on hosting platforms that support it. Production deployments should install `requirements-production.txt`. The local Flask command is intended for demos and development only.

## Smoke test checklist

The automated release smoke test can be run with:

```bash
python smoke_test.py
```

1. Open the login page and sign in as the admin.
2. Check Reports and open School Summary.
3. Search the summary by student or parent name.
4. Select a single report date and verify the report updates.
5. Open Class and test Admissions, Events, Fees, Attendance, Transport, Assignments, and Marks.
6. Sign in as a parent and confirm generated notifications are visible.
7. Test the layout at desktop width and a mobile browser width.

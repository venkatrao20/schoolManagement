"""WSGI entry point for production servers (gunicorn, uWSGI, etc.).

Run with, e.g.:
    gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2

This also ensures the database schema exists and demo data is seeded the
first time the app starts in a fresh environment (e.g. a new deploy),
without ever hard-coding real school data into the source code.
"""
from app import app, init_db, seed_demo_data

with app.app_context():
    init_db()
    seed_demo_data()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

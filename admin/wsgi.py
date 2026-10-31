"""Điểm vào cho gunicorn: gunicorn -w 1 --threads 4 -b 127.0.0.1:8840 admin.wsgi:app"""
from .app import create_app
app = create_app()

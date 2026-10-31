#!/bin/sh
# Sao lưu hằng ngày dữ liệu quản trị + ảnh tải lên. Cron (root): 15 3 * * * /srv/nha-gio/site/deploy/backup.sh
set -eu
D=/srv/nha-gio/backups; mkdir -p "$D"; chmod 700 "$D"
T=$(date +%Y%m%d-%H%M)
tar -czf "$D/nha-gio-$T.tar.gz" -C /srv/nha-gio site/data site/assets/uploads var/auth.json var/audit.log 2>/dev/null || true
chmod 600 "$D/nha-gio-$T.tar.gz"
find "$D" -name 'nha-gio-*.tar.gz' -mtime +30 -delete

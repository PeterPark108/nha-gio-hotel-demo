# Triển khai lên VPS – checklist

Mục tiêu: trang công khai vẫn là **HTML tĩnh** (nginx phục vụ), thêm **app quản trị nhỏ** (Flask + gunicorn, 1 tiến trình, chỉ nghe 127.0.0.1) để chủ khách sạn tự sửa nội dung. App ghi `data/*.json` + ảnh vào `assets/uploads/`, chạy `build.py`, rồi đổi symlink sang bản phát hành mới (nguyên tử, giữ 5 bản để quay lại). VPS 2 vCPU / 4 GB là dư (app dùng ~60–120 MB RAM; build ~0,1–1 giây).

```
Trình duyệt ──HTTPS──> nginx ──┬─ /           → /srv/nha-gio/www  (symlink → releases/<thời-điểm>/)
                               └─ /<ADMIN>/   → 127.0.0.1:8840  (gunicorn, admin.wsgi:app)
```

## 0. Chọn phương án tên miền (khuyến nghị: A)

- **A – Chuyển `gio.myagentvn.com` về VPS (khuyến nghị).** Trang công khai + quản trị cùng một tên miền, bấm "Lưu & xuất bản" là web đổi ngay. Một chứng chỉ, một chỗ vận hành, cookie phiên chỉ gắn với đúng đường dẫn quản trị.
  Cách làm: dựng VPS xong (mục 1–9), kiểm tra bằng `curl --resolve`, rồi đổi bản ghi DNS (CNAME hiện trỏ GitHub Pages → bản ghi A/AAAA trỏ IP VPS; TTL 300 trước khi đổi). Sau khi DNS chạy ổn mới tắt GitHub Pages / gỡ file CNAME (do Peter quyết định).
- **B – Giữ GitHub Pages cho web công khai, thêm `admin.gio.myagentvn.com` trỏ VPS.** Khi đó mỗi lần lưu phải đẩy (git push) HTML lên GitHub → cần token ghi repo trên VPS (rủi ro lớn hơn), web cập nhật chậm 1–2 phút, phức tạp hơn. Chỉ nên dùng nếu bắt buộc giữ Pages.

## 1. Gói cần cài (Ubuntu 22.04/24.04 hoặc Debian 12)

```sh
apt update && apt install -y python3 python3-venv nginx certbot python3-certbot-nginx git ufw unattended-upgrades fail2ban
```

## 2. Người dùng và thư mục

```sh
adduser --system --group --home /srv/nha-gio nhagio
mkdir -p /srv/nha-gio/{var,releases,backups} /etc/nha-gio
git clone https://github.com/PeterPark108/nha-gio-hotel-demo.git /srv/nha-gio/site   # nhánh đã merge
python3 -m venv /srv/nha-gio/venv && /srv/nha-gio/venv/bin/pip install -r /srv/nha-gio/site/admin/requirements.txt
chown -R nhagio:nhagio /srv/nha-gio/site /srv/nha-gio/var /srv/nha-gio/releases
chown nhagio:nhagio /srv/nha-gio             # để đổi symlink www
chmod 700 /srv/nha-gio/var /srv/nha-gio/backups; chown root:root /srv/nha-gio/backups
```

## 3. File bí mật (KHÔNG bao giờ đưa vào git)

- `/etc/nha-gio/admin.env` – copy từ `deploy/admin.env.example`, điền:
  - `NHAGIO_ADMIN_PATH` và `NHAGIO_SECRET`: lấy từ file bí mật được giao riêng, hoặc tạo mới bằng `python3 -m admin.manage new-secrets`.
  - `chown root:nhagio /etc/nha-gio/admin.env && chmod 640 /etc/nha-gio/admin.env`
- Tài khoản quản trị: mật khẩu chỉ lưu dạng **hash argon2id** trong `/srv/nha-gio/var/auth.json` (chmod 600). Tạo bằng:
  ```sh
  sudo -u nhagio sh -c 'set -a; . /etc/nha-gio/admin.env; set +a; cd /srv/nha-gio/site; /srv/nha-gio/venv/bin/python -m admin.manage set-password --user peter'
  ```
  (lệnh hỏi mật khẩu ẩn; hoặc `--stdin` để đọc từ file bí mật qua pipe – không gõ mật khẩu lên dòng lệnh). Lần đăng nhập đầu sẽ bắt đổi mật khẩu.
- Phiên đăng nhập, nhật ký, bản sao lưu nằm trong `/srv/nha-gio/var` (chmod 700).

## 4. Bản phát hành đầu tiên

```sh
sudo -u nhagio sh -c 'set -a; . /etc/nha-gio/admin.env; set +a; cd /srv/nha-gio/site; /srv/nha-gio/venv/bin/python -c "from admin.config import Config; from admin import publish; print(publish.build(Config()))"'
ls -l /srv/nha-gio/www     # symlink → releases/<thời-điểm>
```
Bản phát hành chỉ chứa file công khai (HTML, CSS, JS, ảnh, robots.txt, sitemap.xml) – không có `admin/`, `data/`, `var/`, `tools/`, `tests/`, `*.py`, `*.md`.

## 5. systemd

```sh
cp /srv/nha-gio/site/deploy/nha-gio-admin.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now nha-gio-admin
systemctl status nha-gio-admin; curl -sI http://127.0.0.1:8840/   # 404 là đúng (gốc không lộ gì)
```

## 6. nginx + Let's Encrypt

1. Thêm 2 dòng `limit_req_zone` (trong `deploy/nginx-nha-gio.conf`) vào `/etc/nginx/conf.d/nha-gio-limit.conf`.
2. Tạo `/etc/nginx/snippets/nha-gio-proxy.conf` theo ghi chú cuối file mẫu.
3. Copy `deploy/nginx-nha-gio.conf` → `/etc/nginx/sites-available/nha-gio`, thay `__ADMIN_PATH__` bằng giá trị thật **trên máy chủ** (file này không quay về git), `ln -s` vào `sites-enabled`, xóa site `default`.
4. Lấy chứng chỉ (sau khi DNS đã trỏ về VPS): `certbot --nginx -d gio.myagentvn.com` (tự gia hạn bằng systemd timer).
   Trước khi đổi DNS có thể tạm dùng chứng chỉ tự ký hoặc `certbot certonly --manual --preferred-challenges dns`.
5. `nginx -t && systemctl reload nginx`.
- Caddy thay nginx cũng được (tự lo HTTPS): `reverse_proxy /<ADMIN>/* 127.0.0.1:8840` + `file_server` với `root /srv/nha-gio/www`, thêm giới hạn tốc độ bằng plugin hoặc dựa vào khóa trong app.

## 7. Tường lửa & hệ thống

```sh
ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
```
- SSH chỉ dùng khóa (`PasswordAuthentication no`, `PermitRootLogin no`), bật `unattended-upgrades`, `fail2ban` cho sshd.
- Cổng 8840 **không** mở ra ngoài (gunicorn chỉ nghe 127.0.0.1).

## 8. Sao lưu hằng đêm

```sh
echo '15 3 * * * root /srv/nha-gio/site/deploy/backup.sh' > /etc/cron.d/nha-gio-backup
```
Lưu `data/`, `assets/uploads/`, `var/auth.json`, `var/audit.log` vào `/srv/nha-gio/backups` (giữ 30 ngày, chmod 600). Nên chép thêm ra ngoài VPS (vd rclone tới Drive) định kỳ.
Ngoài ra app tự giữ 30 bản trước của mỗi file dữ liệu trong `var/backups` (khôi phục ngay trong trang quản trị).

**Khôi phục toàn bộ:** `systemctl stop nha-gio-admin` → giải nén file `.tar.gz` vào `/srv/nha-gio` → `chown -R nhagio:nhagio …` → chạy lại mục 4 → `systemctl start nha-gio-admin`.

## 9. Cập nhật code / build lại

```sh
cd /srv/nha-gio/site && sudo -u nhagio git pull --ff-only
# data/*.json và assets/uploads/ do trang quản trị ghi: nếu git báo xung đột ở data/, giữ bản trên máy chủ (git checkout --ours data/… hoặc stash rồi áp lại)
/srv/nha-gio/venv/bin/pip install -r admin/requirements.txt
systemctl restart nha-gio-admin && (chạy lại lệnh build ở mục 4, hoặc bấm "Xuất bản lại" trong trang quản trị)
```

## 10. Đổi mật khẩu / khóa phiên / đường dẫn quản trị

- Đổi mật khẩu: Peter tự đổi ở **Cài đặt → Đổi mật khẩu**; hoặc chạy `manage set-password` (mục 3). Mọi phiên cũ bị đăng xuất.
- Nghi lộ khóa phiên: tạo `NHAGIO_SECRET` mới (`manage new-secrets`), sửa `/etc/nha-gio/admin.env`, `systemctl restart nha-gio-admin` (mọi phiên mất hiệu lực).
- Đổi đường dẫn quản trị: sửa `NHAGIO_ADMIN_PATH` trong env **và** `__ADMIN_PATH__` trong cấu hình nginx, rồi restart app + reload nginx. Báo đường dẫn mới cho Peter qua kênh riêng.
- Mở khóa đăng nhập: `manage unlock`; đăng xuất mọi nơi: `manage logout-all`.

## 11. Quay lại bản trước (rollback)

- **Nội dung:** trang quản trị → Cài đặt → Sao lưu & khôi phục.
- **Bản HTML đã phát hành:** `ln -sfn /srv/nha-gio/releases/<bản-trước> /srv/nha-gio/www.new && mv -T /srv/nha-gio/www.new /srv/nha-gio/www` (lần "Xuất bản" kế tiếp sẽ ghi đè).
- **Code:** `git checkout <commit-trước>` trong `/srv/nha-gio/site`, restart app, build lại.
- **Tên miền:** nếu VPS gặp sự cố khi mới chuyển, trỏ DNS về GitHub Pages như cũ (trang tĩnh trên `main` vẫn còn nguyên).

## 12. Kiểm tra sau triển khai

- `https://gio.myagentvn.com/` hiện banner, footer, Tin tức; xem nguồn có `noindex` (khi còn demo); `/robots.txt` có `Disallow: /`.
- `https://gio.myagentvn.com/<ADMIN>/dang-nhap` mở được; `/<ADMIN>` sai thì 404; cookie có `Secure; HttpOnly; SameSite=Strict`.
- Header: `curl -sI https://…/<ADMIN>/dang-nhap` có `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`, `Strict-Transport-Security`.
- Chạy kiểm thử trên máy chủ (thư mục tạm, không đụng dữ liệu thật): `/srv/nha-gio/venv/bin/python tests/test_security.py`.

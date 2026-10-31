"""Đọc cấu hình từ biến môi trường (do systemd nạp từ file env trên máy chủ). Không có giá trị bí mật nào trong repo."""
import os


def _b(v, d):
    return d if v is None else v.strip().lower() in ('1', 'true', 'yes', 'on')


class Config:
    def __init__(self, env=None):
        e = os.environ if env is None else env
        self.admin_path = (e.get('NHAGIO_ADMIN_PATH') or '').strip('/')
        self.secret = e.get('NHAGIO_SECRET') or ''
        here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.site_root = os.path.abspath(e.get('NHAGIO_SITE_ROOT') or here)
        self.var = os.path.abspath(e.get('NHAGIO_VAR') or os.path.join(self.site_root, 'var'))
        self.web_root = e.get('NHAGIO_WEB_ROOT') or ''          # symlink nginx phục vụ (để trống khi chạy thử)
        self.releases = e.get('NHAGIO_RELEASES') or (os.path.join(os.path.dirname(os.path.abspath(self.web_root)), 'releases') if self.web_root else '')
        self.public_url = (e.get('NHAGIO_PUBLIC_URL') or '').rstrip('/')
        self.cookie_secure = _b(e.get('NHAGIO_COOKIE_SECURE'), True)
        self.trust_proxy = _b(e.get('NHAGIO_TRUST_PROXY'), False)
        self.idle = int(e.get('NHAGIO_IDLE_SECONDS') or 12 * 3600)
        self.absolute = int(e.get('NHAGIO_ABSOLUTE_SECONDS') or 7 * 24 * 3600)
        self.ip_max_fail = int(e.get('NHAGIO_IP_MAX_FAIL') or 5)
        self.ip_window = int(e.get('NHAGIO_IP_WINDOW') or 15 * 60)
        self.global_max_fail = int(e.get('NHAGIO_GLOBAL_MAX_FAIL') or 30)
        self.keep_backups = int(e.get('NHAGIO_KEEP_BACKUPS') or 30)
        self.keep_releases = int(e.get('NHAGIO_KEEP_RELEASES') or 5)
        self.allow_test_routes = _b(e.get('NHAGIO_TEST_MODE'), False)   # chỉ dùng khi chạy test tự động

    def check(self):
        import re
        errs = []
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{15,80}', self.admin_path or ''):
            errs.append('NHAGIO_ADMIN_PATH phải là chuỗi ngẫu nhiên 16–80 ký tự a-z, 0-9, dấu gạch.')
        if len(self.secret) < 32:
            errs.append('NHAGIO_SECRET phải dài ít nhất 32 ký tự ngẫu nhiên.')
        if errs:
            raise SystemExit('Cấu hình chưa đúng:\n- ' + '\n- '.join(errs))

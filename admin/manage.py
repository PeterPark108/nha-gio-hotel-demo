"""Công cụ dòng lệnh cho người quản lý máy chủ.
  python3 -m admin.manage set-password --user peter        # hỏi mật khẩu (không hiện), lưu HASH argon2id vào $NHAGIO_VAR/auth.json
  python3 -m admin.manage set-password --user peter --stdin  # đọc mật khẩu từ stdin (dùng với file chmod 600)
  python3 -m admin.manage logout-all                         # hủy mọi phiên đăng nhập
  python3 -m admin.manage unlock                             # xóa bộ đếm đăng nhập sai
  python3 -m admin.manage new-secrets                        # in ra đường dẫn quản trị + khóa phiên ngẫu nhiên để dán vào file env
"""
import sys, getpass, argparse, secrets
from .config import Config


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['set-password', 'logout-all', 'unlock', 'new-secrets'])
    ap.add_argument('--user', default='admin')
    ap.add_argument('--stdin', action='store_true')
    ap.add_argument('--no-force-change', action='store_true', help='không bắt đổi mật khẩu ở lần đăng nhập đầu')
    a = ap.parse_args(argv)
    if a.cmd == 'new-secrets':
        print('NHAGIO_ADMIN_PATH=quan-tri-' + secrets.token_hex(12))
        print('NHAGIO_SECRET=' + secrets.token_urlsafe(48))
        return
    cfg = Config()
    from .store import Auth
    au = Auth.__new__(Auth)
    cfg.secret = cfg.secret or 'x' * 32
    Auth.__init__(au, cfg)
    if a.cmd == 'set-password':
        pw = sys.stdin.readline().rstrip('\n') if a.stdin else getpass.getpass('Mật khẩu mới: ')
        if not a.stdin and pw != getpass.getpass('Nhập lại: '):
            sys.exit('Hai lần nhập không khớp.')
        au.set_password(a.user, pw, not a.no_force_change)
        au.end_all()
        au.audit('cli', a.user, 'password_set_cli')
        print('Đã lưu hash mật khẩu và đăng xuất mọi phiên.')
    elif a.cmd == 'logout-all':
        au.end_all(); print('Đã hủy mọi phiên.')
    elif a.cmd == 'unlock':
        with au._db() as c:
            c.execute('delete from fails')
        print('Đã xóa bộ đếm đăng nhập sai.')


if __name__ == '__main__':
    main()

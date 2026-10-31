"""Xử lý ảnh tải lên: kiểm tra nội dung thật, xoay theo EXIF, cắt, nén lại WebP, bỏ toàn bộ metadata."""
import io, os, secrets
from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 48_000_000          # chặn "bom giải nén"
ALLOWED = {'JPEG', 'PNG', 'WEBP'}            # không nhận SVG/GIF/HEIC
MAX_BYTES = 8 * 1024 * 1024
BANNER_D = (1920, 600)                       # 16:5 desktop
BANNER_M = (1200, 900)                       # 4:3 mobile


class BadImage(ValueError):
    pass


def load(data: bytes) -> Image.Image:
    if not data:
        raise BadImage('Chưa chọn ảnh.')
    if len(data) > MAX_BYTES:
        raise BadImage('Ảnh quá lớn (tối đa 8 MB).')
    try:
        im = Image.open(io.BytesIO(data))
        fmt = im.format
        if fmt not in ALLOWED:
            raise BadImage('Chỉ nhận ảnh JPG, PNG hoặc WebP.')
        im.load()
    except BadImage:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, SyntaxError):
        raise BadImage('Tệp không phải ảnh hợp lệ (chỉ nhận JPG, PNG, WebP).')
    if getattr(im, 'n_frames', 1) > 1:
        im.seek(0)
    im = ImageOps.exif_transpose(im)
    if im.mode not in ('RGB',):
        bg = Image.new('RGB', im.size, (255, 255, 255))
        im = im.convert('RGBA')
        bg.paste(im, mask=im.split()[3])
        im = bg
    return im


def _fit(im, size, cx=0.5, cy=0.5):
    return ImageOps.fit(im, size, Image.LANCZOS, centering=(cx, cy))


def _save(im, folder, name, q=80):
    path = os.path.join(folder, name)
    tmp = path + '.tmp'
    im.save(tmp, 'WEBP', quality=q, method=6)          # ảnh mới không mang EXIF/GPS
    os.replace(tmp, path)
    return name


def rid():
    return secrets.token_hex(8)


def make_banner(data: bytes, folder: str, cx=0.5, cy=0.5):
    """Trả về (tên file desktop, tên file mobile, cảnh báo|None)."""
    im = load(data)
    warn = None
    if im.width < 1280 or im.height < 400:
        warn = 'Ảnh hơi nhỏ, có thể bị mờ khi hiển thị trên màn hình lớn.'
    os.makedirs(folder, exist_ok=True)
    r = rid()
    d = _save(_fit(im, BANNER_D, cx, cy), folder, f'bn-{r}.webp', 80)
    m = _save(_fit(im, BANNER_M, cx, cy), folder, f'bn-{r}-m.webp', 78)
    return d, m, warn


def make_photo(data: bytes, folder: str, max_w=1600, prefix='img'):
    """Ảnh đại diện / ảnh trong bài: giữ tỉ lệ, tối đa 1600px, kèm bản 800px."""
    im = load(data)
    os.makedirs(folder, exist_ok=True)
    r = rid()
    big = im.copy(); big.thumbnail((max_w, max_w * 2), Image.LANCZOS)
    sm = im.copy(); sm.thumbnail((800, 1600), Image.LANCZOS)
    f = _save(big, folder, f'{prefix}-{r}.webp', 80)
    t = _save(sm, folder, f'{prefix}-{r}-sm.webp', 78)
    return f, t, big.size

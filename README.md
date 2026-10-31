# Nhà Gió – website khách sạn DEMO (hotel-v2)

> **Bản demo.** Nhà Gió là khách sạn giả lập. Giá, đánh giá, địa chỉ, số điện thoại đều là minh họa; không có giấy phép thật; ảnh là tranh SVG tự vẽ. Không gửi dữ liệu đi đâu (không có lệnh gọi mạng; đặt phòng chỉ lưu localStorage). Chỉ làm local – chưa đưa lên myagentvn.com, chưa push/PR.

## Cách mở
- Nhanh: nhấp đúp `index.html` (chạy được qua file://).
- Hoặc: `python3 -m http.server 8000` trong thư mục này rồi mở http://localhost:8000/
- Sửa nội dung: chỉnh `build.py` rồi chạy `python3 build.py` (sinh lại toàn bộ .html, `sitemap.xml`, `robots.txt`).

## Bố cục (ít phá nhất)
- Site khách sạn mới ở gốc (`index.html` + các trang `.html`, `phong/`).
- **Bản cũ giữ nguyên**: `css/app.css`, `js/*.js` không bị xóa; SPA homestay v1 (kể cả trang quản lý) mở ở `homestay-v1/index.html` (và `homestay-v1/index.html#/quan-ly`). Trạng thái gốc được tag `v1-homestay-demo` trên nhánh `main`.
- Site mới dùng lại `js/data.js` (dữ liệu phòng) và `js/art.js` (tranh SVG) của bản cũ.

| Trang | File |
|---|---|
| Trang chủ (hero + thanh đặt phòng, phòng nổi bật, tiện ích, ưu đãi, đánh giá mẫu, vị trí) | `index.html` |
| Loại phòng (lọc loại/số khách, sắp xếp) | `phong/index.html` |
| Chi tiết phòng ×7 (gallery + lightbox, tiện nghi, lịch 7 trạng thái, khung đặt phòng sticky + tạm tính) | `phong/<slug>.html` |
| Tiện ích & dịch vụ | `tien-ich.html` |
| Thư viện ảnh (lọc + lightbox bàn phím) | `thu-vien-anh.html` |
| Ưu đãi | `uu-dai.html` |
| Đặt phòng (form + kiểm tra hợp lệ + tạm tính + màn xác nhận, lưu `localStorage['nhagio_hotel_bookings']`) | `dat-phong.html` |
| Vị trí & liên hệ (bản đồ SVG, form không gửi) | `lien-he.html` |
| Đánh giá mẫu | `danh-gia.html` |
| FAQ (accordion) | `faq.html` |
| Chính sách (hủy, nhận/trả, trẻ em, thú cưng, riêng tư) | `chinh-sach.html` |
| 404 | `404.html` |

Tạm tính = giá/đêm (minh họa) × số đêm + phí dọn phòng (minh họa) + phí dịch vụ 5%. Ngày "đã kín" là dữ liệu minh họa tạo cố định trong `assets/site.js`.

## Tệp
`assets/site.css` (token theo design-spec.md), `assets/site.js` (menu, lịch, lọc, form, lightbox, FAQ), `assets/favicon.svg`, `assets/og.svg`, `build.py`, `tools/check_links.py`, `tools/contrast.py`, `tools/shoot.py` (Playwright: ảnh + lỗi console + thử tương tác), `screenshots/hotel-v2/`.

## SEO & truy cập
- Mỗi trang có `<title>`, meta description, canonical **placeholder** (`https://example.invalid/nha-gio`), Open Graph, JSON-LD `Hotel` ghi rõ demo (không có rating), `HotelRoom`, `FAQPage`.
- **`robots.txt` chặn toàn bộ và mọi trang có `noindex,nofollow`** vì đang là demo – gỡ khi lên web thật và thay tên miền trong `build.py`.
- `lang="vi"`, skip-link, nav có `aria-current`, menu mobile `aria-expanded` + Esc, label cho mọi ô, lỗi gắn `aria-describedby`, focus ring, `prefers-reduced-motion`, vùng chạm ≥44px, responsive 360–1440px.

## Kiểm tra đã chạy
`python3 tools/check_links.py` (0 lỗi) · `python3 tools/contrast.py` (mọi cặp chữ ≥4.5:1) · `python3 tools/shoot.py` (0 lỗi console, 0 tràn ngang ở 360/390/1440).
Ghi chú: `--color-border-strong` trong spec `#a8917c` thực tế chỉ 2.997:1 trên trắng → đổi thành `#a38b76` (3.22:1) ở cả `assets/site.css` và `css/app.css`.

## Còn lại / cần Peter
- Nội dung thật: tên, địa chỉ, SĐT, giá, ảnh chụp, chính sách, giấy phép – thay toàn bộ placeholder.
- Đặt phòng thật cần backend/cổng thanh toán (chưa có). Ô ngày dùng `input type=date` của trình duyệt.
- Đưa lên web: phải qua PR và chờ Peter gõ đúng "Duyệt PR #xx". Chưa mở PR nào.

---

# (Bản cũ) README homestay v1
# Nhà Gió Homestay – web app DEMO (dữ liệu mẫu)

Bản demo đặt phòng homestay kiểu Airbnb cho một homestay **giả lập** ở Quy Nhơn (Bình Định).
HTML/CSS/JS thuần, không backend, không CDN, không thư viện ngoài. Chạy offline bằng cách mở `index.html` trực tiếp (file://).
**Mọi dữ liệu là mẫu; không có thanh toán thật; không gửi email/SMS; không đưa lên máy chủ nào.**

## Cách xem thử
1. Mở `index.html` bằng Chrome/Edge/Firefox (nhấp đúp là được).
2. Khách: Trang chủ → tìm theo ngày/số khách → chọn phòng → chọn ngày trên lịch → **Đặt phòng** → điền form → **Xác nhận** → nhận mã.
3. Chủ nhà: bấm **🔑 Quản lý (chủ nhà)** (vai trò demo, không mật khẩu) → đặt phòng vừa tạo hiện ngay ở mục *Chờ xác nhận*.
4. Nút **Khôi phục dữ liệu mẫu** trên banner sẽ xóa dữ liệu bạn tạo và nạp lại dữ liệu mẫu.

## Trang (hash-router)
| Đường dẫn | Nội dung |
|---|---|
| `#/` | Trang chủ: hero + ô tìm kiếm, danh mục nhanh, phòng nổi bật, vị trí (bản đồ SVG), tiện ích, đánh giá |
| `#/phong` | Danh sách: lọc giá / số khách / loại phòng / danh mục / tiện nghi / ngày trống, sắp xếp, yêu thích, trạng thái rỗng |
| `#/phong/:id` | Chi tiết: carousel + ảnh nhỏ, mô tả, tiện nghi, nội quy, đánh giá, bản đồ, khung đặt phòng có lịch tự vẽ (ngày kín bị khóa), số khách, tính giá |
| `#/dat-phong/:id?ci=&co=&g=` | Form khách (kiểm tra hợp lệ), tóm tắt giá |
| `#/thanh-cong/:ma` | Màn hình thành công + mã đặt phòng |
| `#/yeu-thich` | Phòng đã lưu yêu thích |
| `#/quan-ly` | Tổng quan: doanh thu, lấp đầy, đặt mới, khách sắp đến, biểu đồ SVG, việc cần xử lý |
| `#/quan-ly/dat-phong` | Danh sách đặt phòng, lọc 5 trạng thái, tìm kiếm, đổi trạng thái |
| `#/quan-ly/lich` | Lịch phòng theo tháng (dạng Gantt) |
| `#/quan-ly/phong` | Sửa giá, phí dọn, tình trạng (Hoạt động/Tạm ngưng), thêm phòng |

## Tính giá
`giá/đêm × số đêm + phí dọn dẹp + phí dịch vụ 5%` (làm tròn nghìn). Tối đa 30 đêm/lần đặt.

## Dữ liệu
- 7 phòng, ~25 đặt phòng, ~25 đánh giá – tạo bằng bộ sinh số ngẫu nhiên cố định, ngày tính quanh ngày hiện tại.
- Lưu localStorage: `nhagio_db_v1` (phòng, đặt phòng, đánh giá), `nhagio_fav` (yêu thích).
- Tên khách, SĐT, email (`@vidu.test`), địa chỉ, hotline đều là giả.

## Ảnh
Tất cả ảnh phòng/phong cảnh là **tranh minh họa SVG tự vẽ bằng code** (`js/art.js`), không dùng ảnh chụp, ảnh người thật hay ảnh có bản quyền. Biểu tượng tiện nghi dùng emoji hệ thống.

## Cấu trúc
`index.html`, `css/app.css`, `js/data.js` (dữ liệu & lưu trữ), `js/art.js` (ảnh SVG), `js/app.js` (router & trang khách), `js/admin.js` (trang quản lý), `screenshots/`.

## Hạn chế
- Chỉ là demo phía trình duyệt: dữ liệu nằm trong localStorage của từng trình duyệt, không đồng bộ giữa máy; không đăng nhập thật, không thanh toán, không gửi xác nhận.
- Ô chọn ngày ở trang chủ/danh sách dùng `input type=date` của trình duyệt (định dạng hiển thị theo ngôn ngữ máy); lịch tự vẽ nằm ở trang chi tiết.
- Bản đồ là hình minh họa, không theo tỉ lệ; không có bản đồ thật.
- Chưa có kéo-thả trên lịch quản lý, chưa có giá theo mùa/cuối tuần, chưa có đa ngôn ngữ.

## v2 – áp design-spec.md
- **Token** trong `:root` (`--color-*`, `--fs-*`, `--sp-*`, `--radius-*`, `--shadow-*`, `--focus-ring`, `--header-h`); alias cũ (`--acc`, `--ink`…) vẫn giữ cho giai đoạn chuyển. Lớp ghi đè v2 nằm cuối `css/app.css`.
- Nút chính `#b5472c` (hover `#9a3a22`), link/eyebrow `#b5472c`, viền ô nhập `--color-border-strong #a8917c`, focus ring cho mọi control.
- Toast có viền + shadow, tự ẩn sau 3s (tôn trọng `prefers-reduced-motion`), căn giữa trên mobile, nằm trên thanh đặt phòng khi có.
- Lịch: 7 trạng thái tách biệt (trống, hover/focus, hôm nay, đã chọn, trong khoảng, đã qua, đã kín), ô 40px, không khe – dải chọn liền; khung đặt phòng 380px (440px ở ≥1100px), 1 tháng.
- Thẻ phòng flex column, tiêu đề 1 dòng, giá thẳng đáy, hover (chỉ thiết bị có chuột) + focus bàn phím.
- Quản lý: sidebar 232px ở ≥1100px (tab ngang khi nhỏ hơn, có mờ dần báo cuộn), ô bảng 12px 16px, cột tiền căn phải, badge trạng thái có chấm, nút "Lưu" chỉ chuyển màu chính khi hàng có thay đổi; bảng mobile thành thẻ.
- Ảnh chụp mới: `screenshots/v2-*.png`.

## Chuyển động & intro "gió" (hotel-v2)
- Token: `--dur-1..4` (150/250/400/700ms), `--ease-out: cubic-bezier(.22,1,.36,1)` trong `assets/site.css`. Chỉ animate `transform`/`opacity` (riêng FAQ mở/đóng dùng WAAPI chiều cao, vòng focus dùng box-shadow ngắn).
- Reveal khi cuộn: IntersectionObserver trong `assets/site.js`, chỉ bật khi `<html>` có class `.js` (đặt bằng script nhỏ trong `<head>`). Không có JS → nội dung luôn hiện; phần tử đang trong màn hình lúc tải không bị ẩn.
- Hover/focus: thẻ phòng nhấc + ảnh zoom 1.04, ảnh thư viện zoom, nút nhấn scale .97, gạch chân menu desktop; hover chỉ trong `@media (hover:hover)`.
- Chuyển trang: `@view-transition { navigation: auto; }` (Chrome/Edge 126+), trình duyệt khác chỉ fade-in nhẹ. Header đứng yên (`view-transition-name: site-header`).
- Lightbox fade/scale + trượt ảnh, Esc vẫn đóng; tạm tính đếm số; lịch chọn ngày có hiệu ứng; header đổ bóng khi cuộn; menu mobile trượt/mờ; toast vào/ra.
- `prefers-reduced-motion: reduce`: tắt mọi chuyển động, không intro, không view transition, reveal hiện ngay.
- Intro (chỉ `index.html`, ~2,5 s, lần đầu mỗi phiên): `assets/intro.js` + CSS `.intro*`. Nút "Bỏ qua" được focus đầu tiên, Esc hoặc bấm bất kỳ đâu để bỏ qua. Cờ `sessionStorage.nhagio_intro_seen`.
  **Xem lại intro:** mở tab mới (phiên mới) hoặc chạy trong Console: `sessionStorage.removeItem('nhagio_intro_seen'); location.reload()`.
- Ảnh có thêm bản `-md.jpg` (960px) trong srcset để mobile tải nhẹ hơn; ảnh hero được preload.
- Kiểm tra: `python3 tools/check_links.py`, `tools/shoot.py`, `tools/flow.py` (2 tool này chạy với reduced-motion để chụp tĩnh), `tools/motion.py` (khung intro, hover/reveal, video `screenshots/hotel-v2/motion-demo.mp4`).

## Trang quản trị (nhánh admin-v1)

Trang công khai được sinh từ `data/site.json`, `data/banners.json`, `data/posts.json` bằng `python3 build.py`.
Thư mục `admin/` là app quản trị (Flask) để chủ khách sạn tự đổi banner, chân trang, đăng tin – chạy trên VPS, đường dẫn và khóa bí mật nằm trong file env của máy chủ (mẫu: `deploy/admin.env.example`).

- Hướng dẫn sử dụng: [ADMIN.md](ADMIN.md)
- Triển khai: [DEPLOY-VPS.md](DEPLOY-VPS.md)
- Kiểm thử: `python3 tests/test_security.py` (bảo mật, không cần mạng), `tests/e2e_admin.py` + `tests/e2e_public.py` (Playwright)
- Chạy thử trên máy: `NHAGIO_ADMIN_PATH=quan-tri-thu-nghiem-local NHAGIO_SECRET=<32+ ký tự ngẫu nhiên> NHAGIO_COOKIE_SECURE=1 python3 -m admin.app` rồi mở `http://localhost:8840/quan-tri-thu-nghiem-local/dang-nhap` (tạo tài khoản thử bằng `python3 -m admin.manage set-password`).

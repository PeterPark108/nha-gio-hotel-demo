# Trang quản trị Nhà Gió – hướng dẫn sử dụng

Trang quản trị giúp bạn tự đổi **ảnh banner**, **thông tin chân trang** (địa chỉ, điện thoại, mạng xã hội) và **đăng tin tức** mà không cần sửa code. Dùng được trên điện thoại lẫn máy tính.

> Bản này vẫn ở **chế độ demo**: trang web có dòng "Bản demo" và chặn Google lập chỉ mục. Chỉ tắt khi mọi thông tin đã là thật (xem mục 6).

## 1. Đăng nhập

- Địa chỉ: `https://<tên-miền>/<đường-dẫn-quản-trị>/dang-nhap`
  Đường dẫn quản trị là một chuỗi ngẫu nhiên, **không** có trong repo này. Người quản lý máy chủ sẽ gửi riêng cho bạn cùng tên đăng nhập và mật khẩu ban đầu.
- Lần đăng nhập đầu tiên, hệ thống bắt **đổi mật khẩu**. Dùng mật khẩu dài (ít nhất 12 ký tự), không dùng lại mật khẩu ở nơi khác. Nên lưu trong trình quản lý mật khẩu.
- Nhập sai 5 lần trong 15 phút: địa chỉ mạng của bạn bị tạm khóa 15 phút. Nếu cần mở ngay, nhờ người quản lý máy chủ chạy lệnh mở khóa (mục 8).
- Phiên đăng nhập tự hết sau **12 giờ không dùng**, và tối đa **7 ngày**. Dùng máy lạ thì nhớ bấm **Cài đặt → Đăng xuất**.
- Quên mật khẩu: không có chức năng "quên mật khẩu" qua email (để an toàn). Nhờ người quản lý máy chủ đặt lại.

## 2. Đổi ảnh banner (trang chủ)

1. Vào **Banner**.
2. Bấm **Thêm ảnh banner** → chọn ảnh trong thư viện hoặc chụp bằng điện thoại (JPG, PNG, WebP; tối đa 8 MB).
   Ảnh được tự cắt giữa: 16:5 cho máy tính, 4:3 cho điện thoại. Nên chọn ảnh ngang, chủ thể ở giữa, **không có chữ trên ảnh**.
3. Điền **Mô tả ảnh** (bắt buộc; ví dụ "Hồ bơi nhìn ra biển lúc hoàng hôn").
4. Dùng **↑ Lên / ↓ Xuống** để đổi thứ tự, **Xóa** để bỏ ảnh (có hỏi lại).
5. Bấm **Lưu & xuất bản**. Trang web cập nhật sau vài giây.

Nên có 3–4 ảnh (tối đa 6). Tiêu đề và nút "Đặt phòng" nằm ngay dưới banner, không đè lên ảnh.

## 3. Sửa thông tin chân trang

Vào **Chân trang**, sửa tên, địa chỉ, điện thoại, email, các liên kết Facebook / Zalo / Instagram / TikTok / YouTube (bỏ trống thì không hiện; liên kết phải bắt đầu bằng `https://`) và dòng bản quyền. Bấm **Lưu & xuất bản**. Thông tin hiện ở cuối mọi trang.

## 4. Đăng tin tức

1. Vào **Tin tức → Viết bài mới**.
2. Điền **Tiêu đề**, **Mô tả ngắn** (hiện ở danh sách tin và khi chia sẻ lên Facebook/Zalo), chọn **Ảnh đại diện** và điền mô tả ảnh.
3. Viết nội dung. Thanh công cụ có: Tiêu đề lớn (H2), Tiêu đề nhỏ (H3), **In đậm**, *In nghiêng*, danh sách, liên kết, chèn ảnh. Khung **Xem trước** bên cạnh (trên điện thoại: bên dưới) cập nhật ngay khi gõ.
4. Bấm:
   - **Lưu nháp**: lưu lại, chưa hiện trên web.
   - **Xem trước**: kéo tới khung xem trước.
   - **Xuất bản**: bài hiện ở `/tin-tuc/<đường-dẫn>/` và trong trang Tin tức.
5. Bài đã đăng: sửa xong bấm **Cập nhật bài đã đăng**; muốn ẩn đi thì **Gỡ xuống (về nháp)**; muốn bỏ hẳn thì **Xóa** ở danh sách bài.

Nếu bạn rời trang khi còn thay đổi chưa lưu (dòng **● Chưa lưu** ở góc trên), hệ thống sẽ hỏi lại.

## 5. Sao lưu & khôi phục

- Mỗi lần lưu, bản trước đó được giữ tự động (30 bản gần nhất cho mỗi mục: Chân trang & cài đặt, Banner, Tin tức).
- Lỡ tay xóa/sửa sai: vào **Cài đặt → Sao lưu & khôi phục**, chọn thời điểm, bấm **Khôi phục**. Dữ liệu hiện tại cũng được sao lưu trước khi khôi phục, nên luôn có thể quay lại.
- Máy chủ còn sao lưu toàn bộ dữ liệu + ảnh mỗi đêm (xem DEPLOY-VPS.md).
- **Cài đặt → Nhật ký gần đây** cho biết ai đã đăng nhập, lưu, xuất bản lúc nào (không bao giờ ghi mật khẩu).

## 6. Chế độ demo

**Cài đặt → Chế độ demo** (mặc định **Bật**). Khi bật: trang web hiện dòng "Bản demo", có thẻ `noindex` và `robots.txt` chặn Google. Chỉ tắt khi tên, địa chỉ, giá, ảnh… đều là thật. Tắt sẽ có hộp hỏi lại.

## 7. Mẹo dùng trên điện thoại

- Thanh mục ở **cuối màn hình**: Tổng quan, Banner, Chân trang, Tin tức, Cài đặt.
- Nút **Lưu** luôn nằm ở cuối màn hình, không cần cuộn.
- Có thể "Thêm vào màn hình chính" để mở nhanh (vẫn cần đăng nhập).

## 8. Dành cho người quản lý máy chủ

Chạy trên máy chủ, trong `/srv/nha-gio/site`, với người dùng `nhagio` và file env:

```sh
sudo -u nhagio sh -c 'set -a; . /etc/nha-gio/admin.env; set +a; cd /srv/nha-gio/site; /srv/nha-gio/venv/bin/python -m admin.manage set-password --user <tên>'   # đặt lại mật khẩu (hỏi ẩn), bắt đổi ở lần đăng nhập sau
...manage unlock        # mở khóa đăng nhập
...manage logout-all    # đăng xuất mọi thiết bị
```

Chi tiết cài đặt, sao lưu, khôi phục toàn bộ, đổi mật khẩu/khóa: **DEPLOY-VPS.md**.

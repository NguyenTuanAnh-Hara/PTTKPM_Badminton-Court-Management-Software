# Hệ thống quản lý sân cầu lông

Đồ án Phân tích thiết kế phần mềm – Nguyễn Tuấn Anh, Trường CNTT Phenikaa.

- `backend/`: Node.js 22 + Express 5 + Prisma 5 + MySQL 8 (API `/api/v1`, Bộ hẹn giờ node-cron, dữ liệu mẫu)
- `frontend/`: React 19 + Vite + Ant Design 5 (giao diện cho khách, lễ tân, huấn luyện viên, quản lý)

## 1. Cài đặt môi trường

1. **Node.js 22** (bản LTS): <https://nodejs.org>. Kiểm tra: `node -v`.
2. **MySQL 8**: cài MySQL Community Server (hoặc XAMPP/Laragon có MySQL 8). Tạo sẵn một CSDL rỗng, ví dụ:

   ```sql
   CREATE DATABASE san_cau_long CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

## 2. Chạy backend (cổng 3000)

```bat
cd backend
npm install
copy .env.example .env
```

Mở `backend\.env`, sửa `DATABASE_URL` cho đúng tài khoản MySQL, ví dụ
`mysql://root:matkhau@localhost:3306/san_cau_long`. Các biến khác giữ mặc định là chạy được:

| Biến | Ý nghĩa |
|---|---|
| `VNPAY_MODE=mock` | Giả lập cổng VNPAY (không cần tài khoản sandbox). Đổi `sandbox` và điền `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` để dùng VNPAY Sandbox thật |
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | Để trống thì nội dung email/OTP được in ra cửa sổ backend |
| Các tham số (*) | Thời gian giữ chỗ, số ngày đặt trước… đổi được không cần sửa mã (NFR-13) |

Tạo bảng, nạp dữ liệu mẫu rồi chạy:

```bat
npm run db:setup
npm run dev
```

> `npm run db:setup` **xóa sạch** CSDL rồi tạo lại. Lần sau chỉ cần `npm run dev`.
> Kiểm thử quy tắc nghiệp vụ: `npm run test:rules`.

## 3. Chạy frontend (cổng 5173)

Mở cửa sổ dòng lệnh thứ hai:

```bat
cd frontend
npm install
npm run dev
```

Mở <http://localhost:5173>. Vite tự chuyển các yêu cầu `/api` sang backend ở cổng 3000.

## 4. Tài khoản mẫu (mật khẩu chung `MatKhau123`)

| Vai trò | Số điện thoại | Email |
|---|---|---|
| Quản lý | 0900000001 | quanly@sancaulong.vn |
| Lễ tân | 0900000002 | letan@sancaulong.vn |
| Lễ tân 2 | 0900000003 | |
| Huấn luyện viên | 0900000004 | hlv@sancaulong.vn |
| Huấn luyện viên 2 | 0900000005 | |
| Khách hạng Vàng (500 điểm, gói 10 giờ) | 0911111111 | khach@sancaulong.vn |
| Khách | 0922222222 | |
| Khách | 0933333333 | |

Ở trang đăng nhập có bảng “Tài khoản dùng thử”, bấm vào một dòng để điền sẵn.

Mã giảm giá mẫu: `GIAM20`, `CHAOBANMOI`.

## 5. Kịch bản dùng thử nhanh

1. **Khách** (0911111111): Đặt sân → chọn ô trống trên lưới → *Đặt sân & giữ chỗ* → trang thanh toán: nhập `GIAM20`, dùng điểm, chọn gói giờ → *Thanh toán qua VNPAY* → trang giả lập → *Thanh toán thành công* → xem hóa đơn.
2. Trong *Lịch đặt của tôi* → *Chi tiết*: thêm dịch vụ, đặt HLV, đổi lịch, hủy (hiện số tiền dự kiến hoàn).
3. **Lễ tân** (0900000002): *Vận hành sân* → tra mã đơn → *Check-in*; giao/nhận thiết bị trong chi tiết đơn; *Sự cố* một sân → chuyển sân / hủy và hoàn tiền; *Lịch sân / đặt hộ* cho khách gọi điện hoặc khách vãng lai, thu tiền tại quầy.
4. **HLV** (0900000004): *Lịch dạy* → thêm / xóa lịch rảnh.
5. **Quản lý** (0900000001): *Báo cáo thống kê* (doanh thu theo nguồn, bản đồ nhiệt lấp đầy, xuất Excel), bảng giá, ưu đãi, tài khoản, khiếu nại, nhật ký.

## 6. Màn hình – Use case – API (phục vụ mục 4.4)

| Màn hình (đường dẫn) | Vai trò | Use case | API chính |
|---|---|---|---|
| Đăng nhập `/dang-nhap`, Đăng ký `/dang-ky`, Quên mật khẩu `/quen-mat-khau` | Khách vãng lai, mọi người dùng | UC01.1, UC01.2 | `POST /auth/dang-ky`, `/auth/dang-nhap`, `/auth/quen-mat-khau`, `/auth/dat-lai-mat-khau`, `GET /auth/toi` |
| Đặt sân `/` (lưới lịch sân) | Khách vãng lai, Khách hàng | UC02.1, UC02.2 | `GET /lich-san?ngay`, `GET /san`, `POST /don-dat-san` |
| Thanh toán `/thanh-toan/:maDon` | Khách hàng | UC03.1 | `GET /don-dat-san/:maDon`, `POST /thanh-toan/tinh-tien`, `POST /thanh-toan` |
| Giả lập VNPAY `/thanh-toan/gia-lap`, Kết quả `/thanh-toan/ket-qua` | Khách hàng | UC03.1 (Cổng thanh toán) | `GET /thanh-toan/gia-lap`, `GET /thanh-toan/vnpay-return` |
| Lịch đặt của tôi `/don-cua-toi` + drawer chi tiết đơn | Khách hàng | UC02.3, UC02.4, UC02.5, UC04.1, UC04.2, UC04.4, UC08.1 | `GET /don-dat-san`, `POST /don-dat-san/:ma/huy`, `/doi-lich`, `/dich-vu`, `GET /don-dat-san/:ma/hlv`, `POST /lich-hoc`, `POST /don-dat-san/:ma/danh-gia` |
| Thành viên & gói giờ `/uu-dai` | Khách hàng | UC01.4, UC03.2 | `GET /goi-thanh-vien`, `POST /goi-thanh-vien/:id/dang-ky`, `GET /goi-gio-choi/loai`, `POST /goi-gio-choi/mua` |
| Tài khoản `/ca-nhan` | Mọi người dùng | UC01.3 | `GET/PUT /tai-khoan/toi`, `PUT /tai-khoan/toi/mat-khau`, `GET /tai-khoan/toi/goi-gio` |
| Hóa đơn `/hoa-don/:ma` | Khách hàng, Lễ tân | FR-23 | `GET /hoa-don/:ma` |
| Vận hành sân `/le-tan/van-hanh` | Lễ tân | UC05.1, UC05.2, UC05.3, UC05.4 | `GET /van-hanh/tinh-trang-san`, `/van-hanh/tra-cuu`, `POST /van-hanh/check-in`, `/thiet-bi/giao`, `/thiet-bi/nhan`, `/su-co`, `/su-co/xu-ly-don`, `/su-co/:id/khac-phuc` |
| Lịch sân / đặt hộ `/le-tan/lich-san` | Lễ tân | UC02.2, UC03.1 (A1), UC04.3 | `GET /van-hanh/khach`, `POST /don-dat-san`, `POST /thanh-toan/tai-quay` |
| Quản lý đơn `/le-tan/don`, `/quan-ly/don` | Lễ tân, Quản lý (chỉ xem) | UC02.3, UC02.4 | `GET /don-dat-san?q&trangThai&tuNgay&denNgay` |
| Bán gói tại quầy `/le-tan/ban-goi` | Lễ tân | UC03.2 (A1), UC01.4 | `POST /thanh-toan/tai-quay/ban-goi` |
| Lịch dạy `/hlv/lich-day` | HLV | UC04.5 | `GET /hlv/toi/lich`, `POST /hlv/toi/lich-ranh`, `DELETE /hlv/toi/lich-ranh/:id` |
| Quản lý sân `/quan-ly/san` | Quản lý | UC06.1 | `GET/POST/PUT /quan-tri/san`, `GET /quan-tri/danh-gia-san` |
| Bảng giá `/quan-ly/bang-gia` | Quản lý | UC06.2 | `GET/PUT /quan-tri/bang-gia`, `POST/DELETE /quan-tri/ngay-le`, `GET /quan-tri/tham-so` |
| Danh mục dịch vụ `/quan-ly/dich-vu` | Quản lý | UC06.3 | `/quan-tri/dich-vu` (+ `/nhap-kho`) |
| Ưu đãi `/quan-ly/uu-dai` | Quản lý | UC06.4 | `/quan-tri/uu-dai` (mã giảm giá, hạng, gói giờ) |
| Tài khoản `/quan-ly/tai-khoan` | Quản lý | UC06.5 | `/quan-tri/tai-khoan` (+ `/trang-thai`, `/khong-den`) |
| Báo cáo thống kê `/quan-ly/bao-cao` | Quản lý | UC07.1 | `GET /bao-cao/doanh-thu`, `/lap-day`, `/giao-dich`, `/xuat` |
| Khiếu nại `/quan-ly/khieu-nai` | Quản lý | UC08.2 | `GET /quan-tri/khieu-nai`, `GET/PUT /quan-tri/khieu-nai/:id` |
| Nhật ký thao tác `/quan-ly/nhat-ky` | Quản lý | NFR-08 | `GET /quan-tri/nhat-ky` |

## 7. Cấu trúc frontend

```
frontend/src
├─ api/            client.js (axios, cookie phiên), index.js (hàm gọi từng API)
├─ context/        AuthContext (người dùng đăng nhập), GioDatSanContext (ô đang chọn)
├─ layouts/        MainLayout (menu theo 4 vai trò)
├─ components/     LuoiLichSan, BangTinhTien, ChonUuDai, DongHoGiuCho, TrangThaiDon,
│                  ChiTietDon (+ don/: ThuTaiQuay, HuyDon, DoiLich, DichVu, Hlv, DanhGia, NhanThietBi),
│                  SuCoModal, BieuDoDoanhThu
├─ pages/auth      DangNhap, DangKy, QuenMatKhau
├─ pages/khach     DatSan, LichDatCuaToi, ThanhToan, KetQuaThanhToan, GiaLapVnpay, CaNhan, UuDai, HoaDon
├─ pages/leTan     VanHanhSan, QuanLyDon, BanGoiTaiQuay
├─ pages/hlv       LichDay
└─ pages/quanLy    San, BangGia, DichVu, UuDaiQuanLy, TaiKhoan, BaoCao, KhieuNai, NhatKy
```

## 8. Lỗi thường gặp

- **`Không kết nối được máy chủ`** trên giao diện: backend chưa chạy hoặc lỗi; xem cửa sổ `npm run dev` của backend.
- **`P1001` / `Can't reach database server`**: MySQL chưa bật hoặc `DATABASE_URL` sai.
- **Thanh toán VNPAY Sandbox chạy trên localhost**: VNPAY không gọi được IPN về máy cá nhân; hệ thống vẫn ghi nhận kết quả khi trình duyệt quay về trang `/thanh-toan/ket-qua`.

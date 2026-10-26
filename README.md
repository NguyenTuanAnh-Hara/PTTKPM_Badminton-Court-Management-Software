# Hệ thống quản lý sân cầu lông

Đồ án học phần **Phân tích và thiết kế phần mềm** – Trường Công nghệ Thông tin Phenikaa, Đại học Phenikaa.
Ứng dụng web quản lý toàn bộ hoạt động của một sân cầu lông: đặt sân trực tuyến, thanh toán VNPAY, ưu đãi thành viên,
dịch vụ đi kèm, đặt huấn luyện viên, vận hành tại quầy, quản trị và báo cáo thống kê.

| | |
|---|---|
| Giảng viên hướng dẫn | TS. Nguyễn Thị Vân |
| Sinh viên thực hiện | Nguyễn Tuấn Anh (23010575), Lê Anh Duy (23010710), Nguyễn Văn Tiến (23010565), Lê Quang Đạt (23010201) |
| Lớp tín chỉ | Phân tích và thiết kế phần mềm-1-1-26 (N02), K17 |
| Báo cáo đầy đủ | [`tai_lieu/PTTKPM - Quản lý sân cầu lông.docx`](tai_lieu/) (5 chương, 71 hình, 88 bảng) |

---

## Mục lục

1. [Tính năng](#1-tính-năng)
2. [Ảnh giao diện](#2-ảnh-giao-diện)
3. [Công nghệ](#3-công-nghệ)
4. [Kiến trúc](#4-kiến-trúc)
5. [Cấu trúc thư mục](#5-cấu-trúc-thư-mục)
6. [Cài đặt và chạy](#6-cài-đặt-và-chạy)
7. [Tài khoản và dữ liệu mẫu](#7-tài-khoản-và-dữ-liệu-mẫu)
8. [Kịch bản dùng thử](#8-kịch-bản-dùng-thử)
9. [Quy tắc nghiệp vụ chính](#9-quy-tắc-nghiệp-vụ-chính)
10. [Vòng đời đơn đặt sân](#10-vòng-đời-đơn-đặt-sân)
11. [API](#11-api)
12. [Cơ sở dữ liệu](#12-cơ-sở-dữ-liệu)
13. [Thanh toán VNPAY](#13-thanh-toán-vnpay)
14. [Bộ hẹn giờ](#14-bộ-hẹn-giờ)
15. [Kiểm thử](#15-kiểm-thử)
16. [Màn hình – Use case – API](#16-màn-hình--use-case--api)
17. [Lỗi thường gặp](#17-lỗi-thường-gặp)
18. [Hạn chế và hướng phát triển](#18-hạn-chế-và-hướng-phát-triển)

---

## 1. Tính năng

Hệ thống phục vụ 4 vai trò người dùng, cùng 3 tác nhân phụ: Bộ hẹn giờ, Cổng thanh toán VNPAY, Dịch vụ Email/SMS.
Có 8 phân hệ, 29 use case chính và 46 yêu cầu chức năng (FR-01 → FR-46).

| Vai trò | Chức năng chính |
|---|---|
| **Khách vãng lai** | Xem lịch sân trống theo ngày, xem bảng giá, hạng thành viên, gói giờ; đăng ký tài khoản |
| **Khách hàng** | Đặt 1 – 4 khung liên tiếp trên một hoặc nhiều sân, đặt định kỳ hằng tuần 4 – 12 buổi; thanh toán VNPAY kèm mã giảm giá, điểm thưởng, gói giờ / thẻ trả trước; xem lịch sử đơn; hủy (hiện trước số tiền được hoàn), đổi lịch; thuê thiết bị, đặt đồ uống, đặt huấn luyện viên; mua hạng thành viên, gói giờ; đánh giá sau buổi chơi, gửi khiếu nại; xem và in hóa đơn |
| **Nhân viên lễ tân** | Màn hình vận hành sân theo thời gian thực; check-in theo mã đơn / số điện thoại; đặt hộ khách gọi điện hoặc khách vãng lai; thu tiền mặt / chuyển khoản tại quầy; giao – nhận thiết bị kèm tiền cọc; ghi nhận dịch vụ tại quầy; ghi nhận sự cố sân, chuyển sân hoặc hủy và hoàn tiền cho các đơn bị ảnh hưởng; bán gói tại quầy |
| **Huấn luyện viên** | Xem lịch dạy theo tuần; khai báo, xóa lịch rảnh (xóa khung đã có học viên = báo nghỉ, tự hoàn học phí) |
| **Quản lý** | Báo cáo doanh thu theo nguồn, tỷ lệ lấp đầy (bản đồ nhiệt), 5 khung cao điểm, xuất Excel; quản lý sân, bảng giá theo loại ngày và ngày lễ, danh mục dịch vụ và nhập kho, mã giảm giá, hạng thành viên, gói giờ; tạo tài khoản nhân viên, phân quyền, khóa / mở khóa; xử lý khiếu nại; tra cứu nhật ký thao tác |
| **Bộ hẹn giờ** (tự động) | Hủy đơn quá hạn giữ chỗ; ghi nhận khách không đến và khóa đặt trực tuyến khi vi phạm 3 lần; hoàn thành buổi chơi và cộng điểm; gửi lại thông báo lỗi |

Điểm kỹ thuật đáng chú ý:

- **Không đặt trùng lịch, kể cả khi nhiều người bấm cùng lúc.** Có hai lớp chặn: kiểm tra ở lớp nghiệp vụ, và ràng buộc
  `UNIQUE(san_id, ngay_choi, khung_gio_id, con_hieu_luc)` trong MySQL. Kiểm thử ST-11 gửi 6 yêu cầu đồng thời và chỉ 1 yêu cầu thành công.
- **Thanh toán lũy đẳng.** IPN VNPAY gửi lại nhiều lần thì tiền vẫn chỉ được ghi một lần. Kết quả có chữ ký sai hoặc bị sửa số tiền đều bị từ chối.
- **Không mất tiền của khách trong các tình huống bất thường.** Thanh toán về muộn sau khi hết giữ chỗ, đơn bị hủy giữa lúc đang thanh toán,
  sân gặp sự cố: trong mọi trường hợp tiền được tự hoàn về đúng kênh đã trả (VNPAY, gói giờ, điểm thưởng, tiền mặt).
- **Tham số nghiệp vụ cấu hình được.** Thời gian giữ chỗ, số ngày đặt trước, mức hoàn tiền… đổi qua `.env`, không cần sửa mã.
- **Mã lỗi thống nhất.** Mọi lỗi trả về dạng `{ code, message, details, timestamp }`, mã lỗi gắn với quy tắc nghiệp vụ bị vi phạm.

## 2. Ảnh giao diện

| Đặt sân – lưới lịch sân | Thanh toán với ưu đãi |
|---|---|
| ![Đặt sân](tai_lieu/anh/giao_dien/Hinh_4.13_dat_san.png) | ![Thanh toán](tai_lieu/anh/giao_dien/Hinh_4.14_thanh_toan.png) |
| **Vận hành sân (lễ tân)** | **Báo cáo thống kê (quản lý)** |
| ![Vận hành sân](tai_lieu/anh/giao_dien/Hinh_4.27_van_hanh_san.png) | ![Báo cáo](tai_lieu/anh/giao_dien/Hinh_4.33_bao_cao.png) |

Toàn bộ 30 ảnh màn hình nằm trong [`tai_lieu/anh/giao_dien`](tai_lieu/anh/giao_dien).

## 3. Công nghệ

| Thành phần | Công nghệ (phiên bản đã kiểm thử) |
|---|---|
| Backend | Node.js 22 LTS, Express 5.3, Prisma ORM 5.22, express-session 1.19 + express-mysql-session 3.0, bcrypt 5.1, express-validator 7.3, node-cron 3.0, nodemailer 6.10, exceljs 4.4 |
| Cơ sở dữ liệu | MySQL 8.0 (InnoDB, utf8mb4) |
| Frontend | React 19.3, Vite 6.4, Ant Design 5.29, react-router-dom 6.30, axios 1.20, dayjs 1.11, recharts 2.15 |
| Thanh toán | VNPAY (chế độ giả lập và Sandbox), chữ ký HMAC-SHA512 |
| Kiểm thử | Trình chạy kiểm thử có sẵn của Node.js (`node:test`, `node:assert`) |
| Mô hình hóa | draw.io, PlantUML |

Đăng nhập dùng **phiên lưu trong MySQL** và cookie HttpOnly `scl.sid`, không dùng JWT.

## 4. Kiến trúc

Hệ thống chia thành 3 lớp logic, chạy trên 3 tầng vật lý: trình duyệt → máy chủ Node.js → MySQL.

```
┌──────────────────────── Trình duyệt ────────────────────────┐
│ React SPA: pages → components → api (axios, cookie phiên)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP JSON  /api/v1/*
┌──────────────────────────────▼──────────────────────────────┐
│ LỚP TRÌNH BÀY (Service Interface)                           │
│   routes → middlewares (phiên, phân quyền, kiểm tra dữ liệu)│
│          → controllers (7 controller theo phân hệ)          │
├─────────────────────────────────────────────────────────────┤
│ LỚP NGHIỆP VỤ                                               │
│   services   (Business Workflows: DatSanService, ThanhToan…)│
│   rules      (Business Components: GiaCalculator,           │
│               HoanTienPolicy, DiemThuongPolicy, TrangThaiDon)│
│   jobs       (Bộ hẹn giờ – node-cron)                       │
├─────────────────────────────────────────────────────────────┤
│ LỚP TRUY CẬP DỮ LIỆU                                        │
│   repositories + Prisma Client   │  agents (Service Agents) │
│                                  │  VnpayGateway, Email,    │
│                                  │  NotificationSender      │
└──────────────┬───────────────────┴────────────┬─────────────┘
               │                                │ HTTPS
        ┌──────▼──────┐                 ┌───────▼────────┐
        │  MySQL 8    │                 │ VNPAY, SMTP    │
        └─────────────┘                 └────────────────┘
```

Quy tắc giao tiếp giữa các lớp:
- Mỗi lớp chỉ gọi lớp ngay dưới nó.
- Controller không chứa quy tắc nghiệp vụ.
- Giao diện không tự tính tiền mà luôn lấy kết quả từ backend.

Sơ đồ chi tiết (kiến trúc, gói, lớp, triển khai, tuần tự, trạng thái) nằm trong [`tai_lieu/so_do`](tai_lieu/so_do), có kèm tệp nguồn draw.io / PlantUML.

## 5. Cấu trúc thư mục

```
PTTKPM/
├─ README.md
├─ .gitignore
├─ backend/                      API Node.js (cổng 3000)
│  ├─ server.js                  điểm khởi động: nạp .env, mở cổng, chạy Bộ hẹn giờ
│  ├─ package.json
│  ├─ .env.example               mẫu cấu hình (sao chép thành .env)
│  ├─ prisma/
│  │  ├─ schema.prisma           26 bảng nghiệp vụ + bảng sessions
│  │  ├─ check_constraints.sql   các ràng buộc CHECK
│  │  └─ seed.js                 dữ liệu mẫu
│  ├─ src/
│  │  ├─ app.js                  tạo ứng dụng Express: phiên đăng nhập, định tuyến, xử lý lỗi
│  │  ├─ routes/index.js         khai báo 86 API /api/v1
│  │  ├─ middlewares/            auth.js (phiên, phân quyền), kiemTraDuLieu.js, xuLyLoi.js
│  │  ├─ validators/             luật express-validator
│  │  ├─ controllers/            Auth/TaiKhoan, DatSan, ThanhToan, DichVu, VanHanh, QuanTri, BaoCao
│  │  ├─ services/               nghiệp vụ theo phân hệ + donTinhToan, hoanTienService, nhatKyService
│  │  │  └─ rules/               giaCalculator, hoanTienPolicy, diemThuongPolicy, trangThaiDon
│  │  ├─ repositories/           truy vấn dùng chung (đơn, chi tiết đặt sân, thanh toán, khung giờ)
│  │  ├─ agents/                 paymentGateway, vnpayGateway, emailSender, notificationSender
│  │  ├─ jobs/lichTuDong.js      Bộ hẹn giờ
│  │  ├─ config/                 prisma.js, thamSo.js (tham số nghiệp vụ)
│  │  └─ utils/                  thoiGian, tien, maSo, errors
│  └─ test/
│     ├─ unit/                   21 bài kiểm thử đơn vị
│     └─ api/                    30 kịch bản kiểm thử hệ thống
├─ frontend/                     Giao diện React (cổng 5173)
│  ├─ index.html, vite.config.js (proxy /api → 3000), package.json
│  └─ src/
│     ├─ main.jsx, App.jsx       khởi tạo Ant Design tiếng Việt; định tuyến, phân quyền theo vai trò
│     ├─ api/                    client.js (axios), index.js (hàm gọi từng API)
│     ├─ context/                AuthContext, GioDatSanContext
│     ├─ layouts/MainLayout.jsx  khung trang, menu theo 4 vai trò
│     ├─ components/             LuoiLichSan, BangTinhTien, ChonUuDai, DongHoGiuCho, TrangThaiDon,
│     │                          ChiTietDon, SuCoModal, BieuDoDoanhThu
│     │  └─ don/                 hộp thoại thao tác đơn: thu tại quầy, hủy, đổi lịch, dịch vụ, HLV, đánh giá, nhận thiết bị
│     ├─ pages/
│     │  ├─ auth/                DangNhap, DangKy, QuenMatKhau
│     │  ├─ khach/               DatSan, LichDatCuaToi, ThanhToan, KetQuaThanhToan, GiaLapVnpay, CaNhan, UuDai, HoaDon
│     │  ├─ leTan/               VanHanhSan, QuanLyDon, BanGoiTaiQuay
│     │  ├─ hlv/                 LichDay
│     │  └─ quanLy/              San, BangGia, DichVu, UuDaiQuanLy, TaiKhoan, BaoCao, KhieuNai, NhatKy
│     ├─ utils/format.js         định dạng ngày, tiền, nhãn trạng thái
│     └─ styles.css
└─ tai_lieu/
   ├─ PTTKPM - Quản lý sân cầu lông.docx   báo cáo đồ án
   ├─ anh/giao_dien/             30 ảnh màn hình (Hình 4.10 – 4.39)
   ├─ anh/kiem_thu/              kết quả chạy kiểm thử (Hình 5.1, 5.2)
   └─ so_do/
      ├─ chuong_4/               kiến trúc, gói, lớp chi tiết, triển khai (.drawio + .png)
      └─ muc_4_5/                biểu đồ tuần tự, trạng thái mức thiết kế (.puml + .png)
```

## 6. Cài đặt và chạy

### 6.1. Yêu cầu

- **Node.js 22 LTS**, tải ở <https://nodejs.org>. Kiểm tra bằng `node -v`.
- **MySQL 8**: MySQL Community Server, hoặc XAMPP / Laragon có MySQL 8.
- Windows, macOS hoặc Linux. Các lệnh dưới đây viết cho PowerShell / cmd của Windows; trên macOS/Linux đổi `copy` thành `cp`.

### 6.2. Tạo cơ sở dữ liệu

```sql
CREATE DATABASE san_cau_long CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6.3. Backend (cửa sổ dòng lệnh thứ nhất)

```bat
cd backend
npm install
copy .env.example .env
```

Mở `backend\.env` và sửa `DATABASE_URL` cho đúng tài khoản MySQL của máy, ví dụ
`mysql://root:MatKhauMySQL@localhost:3306/san_cau_long`. Sau đó tạo bảng, nạp dữ liệu mẫu và chạy:

```bat
npm run db:setup
npm run dev
```

Khi thấy dòng `Backend đang chạy tại http://localhost:3000/api/v1` là backend đã chạy.

> ⚠️ `npm run db:setup` **xóa sạch** CSDL rồi tạo lại từ đầu. Chỉ chạy lần đầu, hoặc khi muốn đưa dữ liệu về trạng thái mẫu.
> Những lần sau chỉ cần `npm run dev`.

### 6.4. Frontend (cửa sổ dòng lệnh thứ hai)

```bat
cd frontend
npm install
npm run dev
```

Mở <http://localhost:5173>. Vite tự chuyển các yêu cầu `/api` sang backend ở cổng 3000, nên không cần cấu hình CORS.

### 6.5. Các lệnh npm

| Thư mục | Lệnh | Tác dụng |
|---|---|---|
| backend | `npm run dev` | Chạy backend với nodemon (tự khởi động lại khi sửa mã) |
| backend | `npm start` | Chạy backend không theo dõi thay đổi |
| backend | `npm run db:setup` | Xóa CSDL, tạo lại 27 bảng, thêm ràng buộc CHECK, nạp dữ liệu mẫu |
| backend | `npm run db:push` / `npm run db:seed` | Chỉ đồng bộ lược đồ / chỉ nạp dữ liệu mẫu |
| backend | `npm run db:studio` | Mở Prisma Studio để xem dữ liệu |
| backend | `npm run test:rules` | Kiểm thử đơn vị (không cần CSDL) |
| backend | `npm run test:api` | Kiểm thử hệ thống (cần backend đang chạy) |
| frontend | `npm run dev` | Chạy giao diện ở cổng 5173 |
| frontend | `npm run build` / `npm run preview` | Đóng gói bản chạy thật vào `dist/` / xem thử bản đóng gói |

### 6.6. Biến cấu hình (`backend/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | — | Chuỗi kết nối MySQL (bắt buộc) |
| `PORT` | `3000` | Cổng backend |
| `FRONTEND_URL` | `http://localhost:5173` | Địa chỉ giao diện, dùng làm URL trả về của VNPAY |
| `SESSION_SECRET` | — | Chuỗi bí mật ký cookie phiên; đổi thành chuỗi ngẫu nhiên dài |
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | trống | Gmail và mật khẩu ứng dụng. Để trống thì email / OTP được in ra cửa sổ backend |
| `VNPAY_MODE` | `mock` | `mock`: giả lập cổng (không cần tài khoản); `sandbox`: cổng thử nghiệm thật |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` | giả lập | Thông tin merchant VNPAY Sandbox |
| `TAT_BO_HEN_GIO` | trống | Đặt `1` để tắt Bộ hẹn giờ (khi gỡ lỗi) |
| `GIU_CHO_PHUT`, `GIU_CHO_LE_TAN_PHUT` | `10`, `30` | Thời gian giữ chỗ (QT-04) |
| `SO_NGAY_DAT_TRUOC`, `SO_KHUNG_LIEN_TIEP_TOI_DA`, `SO_DON_CHO_TOI_DA` | `7`, `4`, `2` | QT-01 → QT-03 |
| `PHAN_TRAM_HOAN_SAN`, `SO_LAN_DOI_LICH_TOI_DA` | `50`, `1` | QT-11, QT-13 |
| `PHUT_CHECK_IN_TRUOC`, `PHUT_CHECK_IN_SAU`, `SO_LAN_NO_SHOW_KHOA`, `SO_NGAY_DEM_NO_SHOW` | `15`, `15`, `3`, `30` | QT-16 → QT-18 |
| `GIO_CAO_DIEM_TU`, `GIO_CAO_DIEM_DEN`, `HE_SO_TRU_GIO_CAO_DIEM` | `17`, `22`, `1.5` | QT-23 |

Tệp `.env` chứa mật khẩu nên **không** được đưa lên GitHub (đã khai báo trong `.gitignore`). Chỉ `.env.example` được đưa lên.

## 7. Tài khoản và dữ liệu mẫu

Mọi tài khoản mẫu dùng chung mật khẩu **`MatKhau123`**. Đăng nhập được bằng số điện thoại hoặc email.
Trang đăng nhập có bảng "Tài khoản dùng thử"; bấm vào một dòng để điền sẵn.

| Vai trò | Số điện thoại | Email | Ghi chú |
|---|---|---|---|
| Quản lý | 0900000001 | quanly@sancaulong.vn | |
| Lễ tân | 0900000002 | letan@sancaulong.vn | |
| Lễ tân 2 | 0900000003 | | |
| Huấn luyện viên | 0900000004 | hlv@sancaulong.vn | Có lịch rảnh 7 ngày tới |
| Huấn luyện viên 2 | 0900000005 | | |
| Khách hàng hạng Vàng | 0911111111 | khach@sancaulong.vn | 500 điểm, gói 10 giờ chơi |
| Khách hàng hạng Bạc | 0922222222 | mai@sancaulong.vn | 120 điểm |
| Khách hàng chưa có hạng | 0933333333 | long@sancaulong.vn | Dùng trong kiểm thử hệ thống |

Dữ liệu mẫu gồm:
- **Sân và khung giờ:** 18 khung giờ 05:00 – 23:00; 8 sân (Sân 7, 8 là loại cao cấp).
- **Bảng giá:**

  | Loại ngày | Giờ thường | Cao điểm 17:00 – 22:00 |
  |---|---|---|
  | Ngày thường | 80.000 đ | 120.000 đ |
  | Cuối tuần | 100.000 đ | 150.000 đ |
  | Ngày lễ | 120.000 đ | 180.000 đ |

- **Ngày lễ:** các ngày lễ năm 2026.
- **Hạng thành viên:** Bạc / Vàng / Kim Cương, giảm 5 / 10 / 15% tiền sân, hệ số tích điểm 1,0 / 1,5 / 2,0.
- **Ưu đãi khác:** 3 loại gói giờ; mã giảm giá `GIAM20` (20%, tối đa 50.000 đ) và `CHAOBANMOI` (10%, tối đa 30.000 đ).
- **Dịch vụ:** 8 dịch vụ (vợt, cầu, nước uống…).
- **Lịch sử:** khoảng 100 đơn đã chơi trong 21 ngày qua, để báo cáo có số liệu.

## 8. Kịch bản dùng thử

1. **Khách hàng** (0911111111):
   - **Đặt sân:** vào Đặt sân → bấm các ô trắng trên lưới → *Đặt sân & giữ chỗ* (đồng hồ đếm ngược 10 phút).
   - **Thanh toán:** nhập `GIAM20`, dùng điểm hoặc gói giờ, bảng tính tiền tự cập nhật → *Thanh toán qua VNPAY*.
   - **Cổng giả lập:** chọn *Thanh toán thành công* → xem kết quả, mở hóa đơn.
2. **Lịch đặt của tôi** → *Chi tiết*:
   - thêm dịch vụ, đặt huấn luyện viên, đổi lịch;
   - hủy đơn: hộp thoại hiện trước số tiền dự kiến được hoàn.
3. **Lễ tân** (0900000002):
   - *Vận hành sân*: tra mã đơn → *Check-in*; giao / nhận thiết bị;
   - báo *Sự cố* một sân → chuyển các đơn bị ảnh hưởng sang sân khác hoặc hủy và hoàn tiền;
   - *Lịch sân / đặt hộ*: đặt cho khách gọi điện, khách vãng lai, thu tiền tại quầy.
4. **Huấn luyện viên** (0900000004): *Lịch dạy* → thêm hoặc xóa lịch rảnh.
5. **Quản lý** (0900000001):
   - *Báo cáo thống kê*: doanh thu theo nguồn, bản đồ nhiệt lấp đầy, xuất Excel;
   - sửa bảng giá, ngày lễ, ưu đãi;
   - khóa / mở khóa tài khoản, xử lý khiếu nại, xem nhật ký thao tác.

Mã màu trên lưới lịch sân:

| Màu ô | Trạng thái |
|---|---|
| Trắng | Còn trống |
| Xanh lá đậm | Đang chọn |
| Vàng nhạt | Đang được giữ chỗ |
| Đỏ nhạt | Đã đặt |
| Xanh dương nhạt | Lịch của bạn |
| Sọc cam | Sân bảo trì |
| Gạch chéo mờ | Đã qua giờ đặt |

## 9. Quy tắc nghiệp vụ chính

Đặc tả đầy đủ 29 quy tắc (QT-01 → QT-29) nằm ở mục 3.2.5 của báo cáo. Quy tắc được cài đặt trong `backend/src/services` và `services/rules`.

| Mã | Quy tắc |
|---|---|
| QT-01 | Mỗi sân đặt 1 – 4 khung 60 phút **liên tiếp**, trong khoảng 05:00 – 23:00 |
| QT-02 | Khách đặt trực tuyến trong **7 ngày tính cả hôm nay**; khung phải bắt đầu sau ít nhất 30 phút. Lễ tân đặt trước tối đa 30 ngày |
| QT-03 | Mỗi khách tối đa **2 đơn chờ thanh toán** |
| QT-04 | Giữ chỗ **10 phút** (đơn trực tuyến), **30 phút** (lễ tân giữ cho khách gọi điện). Quá hạn thì đơn chuyển "Hết hạn" |
| QT-05 | Đặt định kỳ hằng tuần **4 – 12 buổi**, cùng sân, cùng khung; mỗi buổi sau thanh toán trước giờ chơi 24 giờ |
| QT-06 | Một (sân, ngày, khung) chỉ thuộc một đơn còn hiệu lực |
| QT-07, 08 | Giá theo loại ngày (Ngày lễ > Cuối tuần > Ngày thường) và khung giờ |
| QT-10 | Thứ tự áp dụng ưu đãi: giảm theo hạng (chỉ trên tiền sân) → mã giảm giá (có mức trần) → điểm thưởng → gói giờ / thẻ trả trước → làm tròn xuống nghìn đồng |
| QT-11 | Hủy trước ≥ 24 giờ: hoàn 100%; từ 2 đến dưới 24 giờ: hoàn 50% tiền sân; dưới 2 giờ: không được hủy |
| QT-12 | Hoàn về **đúng kênh đã trả**: VNPAY, gói giờ, thẻ trả trước, điểm, tiền mặt |
| QT-13 | Đổi lịch tối đa 1 lần, trước giờ chơi ≥ 2 giờ; đắt hơn thì trả thêm, rẻ hơn thì được hoàn phần chênh lệch |
| QT-15, 27 | Hủy do phía sân (sự cố, HLV nghỉ) luôn hoàn 100%. Khách bị chuyển sân được từ chối trong 30 phút và hoàn 100% |
| QT-16, 17 | Check-in trong khoảng ±15 phút quanh giờ bắt đầu. Quá 15 phút chưa check-in thì ghi nhận "Không đến" |
| QT-18 | Không đến 3 lần trong 30 ngày thì bị khóa đặt trực tuyến, đến khi quản lý mở khóa |
| QT-21, 22 | Tích 10 điểm mỗi giờ chơi × hệ số hạng. 1 điểm = 100 đ, dùng theo bội số 10, tối đa 50% số tiền còn lại |
| QT-23 | Gói giờ: khung thường trừ 1 giờ; khung cao điểm, cuối tuần, ngày lễ trừ 1,5 giờ |
| QT-28, 29 | Doanh thu = thu − hoàn, không tính phần trả bằng gói giờ / điểm. Lấp đầy = khung đã bán ÷ khung khả dụng |

## 10. Vòng đời đơn đặt sân

```mermaid
stateDiagram-v2
    [*] --> CHO_THANH_TOAN : đặt sân (QT-01 → QT-06)
    CHO_THANH_TOAN --> DA_XAC_NHAN : thanh toán thành công
    CHO_THANH_TOAN --> HET_HAN : quá hạn giữ chỗ (Bộ hẹn giờ)
    CHO_THANH_TOAN --> DA_HUY : khách / lễ tân hủy
    HET_HAN --> DA_XAC_NHAN : thanh toán về muộn, khung còn trống
    DA_XAC_NHAN --> DANG_SU_DUNG : check-in (±15 phút)
    DA_XAC_NHAN --> DA_HUY : hủy (QT-11) / sân sự cố (QT-15)
    DA_XAC_NHAN --> KHONG_DEN : quá 15 phút chưa check-in
    DANG_SU_DUNG --> DA_HOAN_THANH : qua giờ kết thúc, cộng điểm
    DA_HOAN_THANH --> [*]
    DA_HUY --> [*]
    HET_HAN --> [*]
    KHONG_DEN --> [*]
```

Các chuyển trạng thái hợp lệ được khai báo ở `backend/src/services/rules/trangThaiDon.js`. Mọi chuyển trạng thái khác đều bị từ chối với mã lỗi `CHUYEN_TRANG_THAI_KHONG_HOP_LE`.

## 11. API

Tiền tố là `/api/v1`, dữ liệu dạng JSON. Đăng nhập dùng cookie phiên `scl.sid`.
Toàn bộ 86 API được khai báo ở [`backend/src/routes/index.js`](backend/src/routes/index.js), đặc tả ở Bảng 4.19 của báo cáo.

| Nhóm | API tiêu biểu |
|---|---|
| Xác thực, tài khoản | `POST /auth/dang-ky`, `/auth/dang-nhap`, `/auth/dang-xuat`, `/auth/quen-mat-khau`, `/auth/dat-lai-mat-khau`; `GET /auth/toi`; `GET/PUT /tai-khoan/toi`, `PUT /tai-khoan/toi/mat-khau` |
| Thành viên, gói giờ | `GET /goi-thanh-vien`, `POST /goi-thanh-vien/{id}/dang-ky`, `GET /goi-gio-choi/loai`, `POST /goi-gio-choi/mua`, `GET /tai-khoan/toi/goi-gio` |
| Lịch sân, đặt sân | `GET /san`, `GET /lich-san?ngay=`; `POST /don-dat-san`; `GET /don-dat-san`, `GET /don-dat-san/{maDon}`; `POST /don-dat-san/{maDon}/huy`, `/doi-lich` |
| Thanh toán | `POST /thanh-toan/tinh-tien`, `POST /thanh-toan`, `POST /thanh-toan/tai-quay`, `/tai-quay/ban-goi`; `GET /thanh-toan/vnpay-ipn`, `/vnpay-return`, `/gia-lap`; `GET /hoa-don/{ma}` |
| Dịch vụ, HLV | `GET /dich-vu`; `POST/DELETE /don-dat-san/{maDon}/dich-vu`; `GET /hlv`, `/hlv/{id}/lich-ranh`, `/don-dat-san/{maDon}/hlv`; `POST /lich-hoc`; `GET /hlv/toi/lich`, `POST/DELETE /hlv/toi/lich-ranh` |
| Vận hành sân | `GET /van-hanh/tinh-trang-san`, `/tra-cuu`, `/khach`; `POST /van-hanh/check-in`, `/thiet-bi/giao`, `/thiet-bi/nhan`, `/su-co`, `/su-co/xu-ly-don`, `/su-co/{id}/khac-phuc` |
| Quản trị | `/quan-tri/san`, `/bang-gia`, `/ngay-le`, `/dich-vu`, `/uu-dai/*`, `/tai-khoan`, `/khieu-nai`, `/nhat-ky`, `/tham-so`, `/danh-gia-san` |
| Báo cáo | `GET /bao-cao/doanh-thu`, `/lap-day`, `/giao-dich`, `/xuat` (tệp .xlsx) |
| Phản hồi | `POST /don-dat-san/{maDon}/danh-gia` |

Ví dụ tạo đơn đặt sân:

```http
POST /api/v1/don-dat-san
Content-Type: application/json

{ "ngayChoi": "2026-10-30", "danhSach": [ { "sanId": 3, "khungGioId": 13 }, { "sanId": 3, "khungGioId": 14 } ] }
```

Mọi lỗi trả về cùng một cấu trúc:

```json
{ "code": "TRUNG_LICH", "message": "Sân 3, khung 17:00–18:00 ngày 30/10/2026 vừa có người đặt",
  "details": [ { "sanId": 3, "khungGioId": 13 } ], "timestamp": "2026-10-26T15:00:00.000Z" }
```

| HTTP | Ý nghĩa | Mã lỗi tiêu biểu |
|---|---|---|
| 400 | Sai định dạng dữ liệu | `DU_LIEU_KHONG_HOP_LE` |
| 401 | Chưa đăng nhập, sai thông tin đăng nhập | `CHUA_DANG_NHAP`, `SAI_THONG_TIN_DANG_NHAP` |
| 403 | Không có quyền | `KHONG_DU_QUYEN`, `KHONG_PHAI_CHU_DON`, `KHOA_DAT_TRUC_TUYEN` |
| 404 | Không tìm thấy | `KHONG_TIM_THAY_*` |
| 409 | Xung đột dữ liệu | `TRUNG_LICH`, `CHUYEN_TRANG_THAI_KHONG_HOP_LE`, `DON_HET_HAN_GIU_CHO` |
| 422 | Vi phạm quy tắc nghiệp vụ | `SAI_SO_KHUNG`, `NGOAI_PHAM_VI_NGAY`, `VUOT_GIOI_HAN_DON_CHO`, `KHONG_DUOC_HUY`, `MA_GIAM_GIA_KHONG_HOP_LE`… |

Danh sách đầy đủ mã lỗi nằm ở Bảng 4.23 của báo cáo.

## 12. Cơ sở dữ liệu

CSDL có 26 bảng nghiệp vụ, đạt dạng chuẩn 3, cộng bảng `sessions` lưu phiên đăng nhập. Lược đồ nằm trong
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Tên bảng và cột dùng snake_case.

| Nhóm | Bảng |
|---|---|
| Người dùng | `nguoi_dung`, `khach_hang`, `nhan_vien_le_tan`, `huan_luyen_vien`, `lich_ranh_hlv` |
| Ưu đãi | `goi_thanh_vien`, `loai_goi_gio`, `goi_gio_choi`, `ma_giam_gia` |
| Sân và giá | `san`, `khung_gio`, `khung_gia`, `ngay_le` |
| Đặt sân | `lich_dinh_ky`, `don_dat_san`, `chi_tiet_dat_san` |
| Dịch vụ, HLV | `dich_vu`, `chi_tiet_dich_vu`, `buoi_hoc` |
| Thanh toán | `thanh_toan`, `hoa_don` |
| Phản hồi, vận hành | `danh_gia`, `khieu_nai`, `su_co` |
| Hệ thống | `thong_bao`, `nhat_ky_thao_tac`, `sessions` |

Các ràng buộc quan trọng:
- `UNIQUE(san_id, ngay_choi, khung_gio_id, con_hieu_luc)` chống đặt trùng. Cột `con_hieu_luc` nhận giá trị NULL khi đơn hủy hoặc hết hạn, nên khung đó đặt lại được.
- `UNIQUE(ma_giao_dich_cong)`: mỗi giao dịch của cổng thanh toán chỉ được ghi một lần.
- Khóa ngoại `ON DELETE RESTRICT`. Sân, dịch vụ, tài khoản không bị xóa mà chuyển sang trạng thái ngừng.
- Các ràng buộc CHECK (số tiền ≥ 0, đúng đối tượng của khoản thu…) nằm trong `prisma/check_constraints.sql`.

## 13. Thanh toán VNPAY

- **Chế độ giả lập (`VNPAY_MODE=mock`, mặc định).** Nút thanh toán dẫn tới trang `/thanh-toan/gia-lap` của frontend, có hai nút *Thành công* / *Thất bại*.
  Backend tạo bộ tham số kết quả có chữ ký HMAC-SHA512 giống hệt VNPAY, nên luồng xử lý giống như khi dùng cổng thật.
- **Chế độ Sandbox (`VNPAY_MODE=sandbox`).** Đăng ký merchant thử nghiệm ở <https://sandbox.vnpayment.vn>, rồi điền `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` vào `.env`.
  Khi chạy trên localhost, VNPAY không gọi được IPN về máy cá nhân. Hệ thống vẫn ghi nhận kết quả nhờ trang `/thanh-toan/ket-qua` gọi `GET /thanh-toan/vnpay-return`;
  API này xác minh chữ ký và chạy cùng trình tự với IPN.
- **Trình tự xử lý kết quả** (Bảng 4.22 của báo cáo):
  1. Xác minh chữ ký.
  2. Tìm giao dịch.
  3. Đối chiếu số tiền.
  4. Kiểm tra giao dịch đã xử lý chưa, để bảo đảm lũy đẳng.
  5. Ghi nhận kết quả trong transaction.
  6. Nếu kết quả về sau khi giao dịch đã bị đóng thì tự hoàn 100%.
  7. Xác nhận đơn và tạo hóa đơn.
  8. Gửi thông báo cho khách.

## 14. Bộ hẹn giờ

Bộ hẹn giờ được khởi động cùng backend (`src/jobs/lichTuDong.js`), chạy theo múi giờ Asia/Ho_Chi_Minh.

| Chu kỳ | Tác vụ |
|---|---|
| Mỗi phút | Hủy đơn quá hạn giữ chỗ, trả lại khung (UC02.6) |
| Mỗi 5 phút | Ghi nhận "Không đến" và khóa đặt trực tuyến khi đủ 3 lần (UC01.6); hoàn thành buổi chơi và cộng điểm (UC01.5) |
| Mỗi 2 phút | Gửi lại các thông báo bị lỗi, tối đa 5 lần (NFR-12) |
| 00:05 hằng ngày | Rà soát lại điều kiện khóa tài khoản (QT-18) |

## 15. Kiểm thử

```bat
cd backend
npm run test:rules     :: 21 bài kiểm thử đơn vị – không cần CSDL
npm run test:api       :: 30 kịch bản kiểm thử hệ thống – cần backend đang chạy (npm run dev)
```

- **Kiểm thử đơn vị** (`test/unit`) kiểm tra giá trị biên của các quy tắc tính giá, ưu đãi, hoàn tiền, điểm thưởng, chuyển trạng thái đơn,
  và kiểm tra chữ ký VNPAY.
- **Kiểm thử hệ thống** (`test/api`) gọi API thật như một trình duyệt (có giữ cookie phiên). Các kịch bản gồm:
  - đăng ký, đăng nhập, phân quyền;
  - đặt sân và các trường hợp vi phạm QT-01 → QT-06;
  - 6 yêu cầu đặt trùng gửi đồng thời;
  - thanh toán VNPAY và IPN gửi lại, kết quả bị giả mạo;
  - hủy và hoàn tiền;
  - lễ tân đặt hộ, thu tại quầy, check-in, sự cố sân, chuyển sân;
  - báo cáo, xuất Excel;
  - 100 yêu cầu đồng thời.

  Bộ kiểm thử tự tạo khách mới, tự tìm khung trống và tự hủy các đơn đã tạo, nên chạy lặp lại được nhiều lần.
  Để kết quả ổn định nhất, nên chạy `npm run db:setup` trước.

Kết quả lần chạy gần nhất (Windows, Node.js 22, MySQL 8):
- **21/21** bài kiểm thử đơn vị đạt; **30/30** kịch bản kiểm thử hệ thống đạt.
- Xem lịch sân khi 100 yêu cầu đến cùng lúc: trung bình 137 ms, lớn nhất 160 ms.
- Đặt sân: 21 ms; tạo giao dịch thanh toán: 17 ms.

## 16. Màn hình – Use case – API

| Màn hình (đường dẫn) | Vai trò | Use case | API chính |
|---|---|---|---|
| Đăng nhập `/dang-nhap`, Đăng ký `/dang-ky`, Quên mật khẩu `/quen-mat-khau` | Mọi người dùng | UC01.1, UC01.2 | `POST /auth/dang-ky`, `/auth/dang-nhap`, `/auth/quen-mat-khau`, `/auth/dat-lai-mat-khau` |
| Đặt sân `/` | Khách vãng lai, Khách hàng | UC02.1, UC02.2 | `GET /lich-san`, `POST /don-dat-san` |
| Thanh toán `/thanh-toan/:maDon` | Khách hàng | UC03.1 | `POST /thanh-toan/tinh-tien`, `POST /thanh-toan` |
| Giả lập VNPAY `/thanh-toan/gia-lap`, Kết quả `/thanh-toan/ket-qua` | Khách hàng | UC03.1 | `GET /thanh-toan/gia-lap`, `/vnpay-return` |
| Lịch đặt của tôi `/don-cua-toi` (+ drawer chi tiết đơn) | Khách hàng | UC02.3 – UC02.5, UC04.1, UC04.2, UC04.4, UC08.1 | `GET /don-dat-san`, `POST …/huy`, `…/doi-lich`, `…/dich-vu`, `/lich-hoc`, `…/danh-gia` |
| Thành viên & gói giờ `/uu-dai` | Khách vãng lai, Khách hàng | UC01.4, UC03.2 | `/goi-thanh-vien`, `/goi-gio-choi` |
| Tài khoản `/ca-nhan` | Mọi người dùng | UC01.3 | `/tai-khoan/toi` |
| Hóa đơn `/hoa-don/:ma` | Khách hàng, Lễ tân | FR-23 | `GET /hoa-don/:ma` |
| Vận hành sân `/le-tan/van-hanh` | Lễ tân | UC05.1 – UC05.4, UC04.3 | `/van-hanh/*` |
| Lịch sân / đặt hộ `/le-tan/lich-san` | Lễ tân | UC02.2, UC03.1 | `GET /van-hanh/khach`, `POST /don-dat-san`, `/thanh-toan/tai-quay` |
| Quản lý đơn `/le-tan/don`, `/quan-ly/don` | Lễ tân, Quản lý | UC02.3, UC02.4 | `GET /don-dat-san?q=` |
| Bán gói tại quầy `/le-tan/ban-goi` | Lễ tân | UC01.4, UC03.2 | `POST /thanh-toan/tai-quay/ban-goi` |
| Lịch dạy `/hlv/lich-day` | HLV | UC04.5 | `/hlv/toi/lich`, `/hlv/toi/lich-ranh` |
| Sân, Bảng giá, Dịch vụ, Ưu đãi, Tài khoản `/quan-ly/*` | Quản lý | UC06.1 – UC06.5 | `/quan-tri/*` |
| Báo cáo thống kê `/quan-ly/bao-cao` | Quản lý | UC07.1 | `/bao-cao/*` |
| Khiếu nại `/quan-ly/khieu-nai`, Nhật ký `/quan-ly/nhat-ky` | Quản lý | UC08.2, NFR-08 | `/quan-tri/khieu-nai`, `/quan-tri/nhat-ky` |

## 17. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `npm error ENOENT … package.json` | Đang đứng sai thư mục. Phải `cd backend` hoặc `cd frontend` trước khi chạy lệnh npm |
| `P1000: Authentication failed` | Sai tài khoản hoặc mật khẩu MySQL trong `DATABASE_URL` |
| `P1001: Can't reach database server` | MySQL chưa bật, hoặc sai cổng / tên CSDL |
| Giao diện báo "Không kết nối được máy chủ" | Backend chưa chạy hoặc đang lỗi; xem cửa sổ `npm run dev` của backend |
| `EADDRINUSE: address already in use :::3000` | Đang có một backend khác chạy. Đóng cửa sổ cũ, hoặc đổi `PORT` trong `.env` |
| Đăng nhập xong vẫn bị đưa về trang chưa đăng nhập | Xóa cookie của `localhost` rồi đăng nhập lại; kiểm tra bảng `sessions` có được tạo không |
| Không nhận được email OTP | `EMAIL_USER` để trống thì mã OTP được in ra cửa sổ backend |
| `npm run test:api` báo "Không còn khung trống" | Chạy `npm run db:setup` để đưa dữ liệu về trạng thái mẫu |
| VNPAY Sandbox không gọi IPN | Bình thường khi chạy trên localhost; kết quả vẫn được ghi nhận qua trang kết quả |

## 18. Hạn chế và hướng phát triển

**Hạn chế hiện tại** (tương ứng Bảng 5.5 và 5.9 của báo cáo):
- Kênh SMS mới ở mức giả lập; chưa phát hành hóa đơn điện tử theo quy định; báo cáo chỉ xuất Excel, chưa xuất PDF.
- Lịch định kỳ mới hỗ trợ hằng tuần.
- Lưới lịch tự làm mới định kỳ (60 giây với khách, 30 giây với lễ tân), chưa đẩy thay đổi tức thời.
- Chưa triển khai lên máy chủ thật (Docker, Nginx, HTTPS) và chưa có sao lưu tự động.

**Hướng phát triển:**
- Tích hợp nhà cung cấp SMS và hóa đơn điện tử; thêm ví MoMo, ZaloPay qua giao diện `PaymentGateway`.
- Cập nhật lịch theo thời gian thực bằng WebSocket hoặc SSE.
- Ứng dụng di động dùng chung API hiện có.
- Triển khai lên VPS có sao lưu hằng ngày; mở rộng cho chuỗi nhiều cơ sở.

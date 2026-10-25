// Luật kiểm tra định dạng dữ liệu đầu vào (express-validator). Quy tắc nghiệp vụ được kiểm tra ở services.
import { body, param, query } from 'express-validator';

const HO_TEN = /^[\p{L} ]{2,100}$/u;
const SDT = /^0\d{9}$/;
const MAT_KHAU = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const GIO = /^\d{2}:\d{2}$/;

const matKhau = (ten) => body(ten).matches(MAT_KHAU).withMessage('Mật khẩu tối thiểu 8 ký tự, có cả chữ và số');
const ngay = (ten, vi = body) => vi(ten).matches(NGAY).withMessage('Ngày có dạng YYYY-MM-DD');
const gio = (ten) => body(ten).matches(GIO).withMessage('Giờ có dạng HH:MM');

export const luat = {
  dangKy: [
    body('hoTen').trim().matches(HO_TEN).withMessage('Họ tên 2–100 ký tự, chỉ gồm chữ và khoảng trắng'),
    body('soDienThoai').trim().matches(SDT).withMessage('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'),
    body('email').trim().isEmail().withMessage('Email không đúng định dạng'),
    matKhau('matKhau'),
    body('xacNhanMatKhau').custom((v, { req }) => v === req.body.matKhau).withMessage('Xác nhận mật khẩu không khớp'),
  ],
  dangNhap: [
    body('dinhDanh').trim().notEmpty().withMessage('Nhập số điện thoại hoặc email'),
    body('matKhau').notEmpty().withMessage('Nhập mật khẩu'),
  ],
  quenMatKhau: [body('dinhDanh').trim().notEmpty().withMessage('Nhập số điện thoại hoặc email')],
  datLaiMatKhau: [body('otp').matches(/^\d{6}$/).withMessage('Mã OTP gồm 6 chữ số'), matKhau('matKhauMoi')],
  capNhatThongTin: [
    body('hoTen').optional().trim().matches(HO_TEN).withMessage('Họ tên 2–100 ký tự, chỉ gồm chữ và khoảng trắng'),
    body('email').optional().trim().isEmail().withMessage('Email không đúng định dạng'),
  ],
  doiMatKhau: [body('matKhauCu').notEmpty().withMessage('Nhập mật khẩu hiện tại'), matKhau('matKhauMoi')],
  lichSan: [ngay('ngay', query)],
  datSan: [
    ngay('ngayChoi'),
    body('danhSach').isArray({ min: 1 }).withMessage('Chọn ít nhất một khung giờ'),
    body('danhSach.*.sanId').isInt({ min: 1 }).withMessage('Sân không hợp lệ'),
    body('danhSach.*.khungGioId').isInt({ min: 1, max: 18 }).withMessage('Khung giờ không hợp lệ'),
    body('dinhKy.soBuoi').optional().isInt({ min: 1 }).withMessage('Số buổi không hợp lệ'),
    body('sdtKhach').optional({ values: 'falsy' }).matches(SDT).withMessage('Số điện thoại khách gồm 10 chữ số'),
    body('hoTenKhach').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 100 }).withMessage('Họ tên khách 2–100 ký tự'),
  ],
  maDon: [param('maDon').trim().isLength({ min: 4, max: 20 }).withMessage('Mã đơn không hợp lệ')],
  huyDon: [body('lyDo').optional().isLength({ max: 255 }).withMessage('Lý do tối đa 255 ký tự')],
  doiLich: [ngay('ngayChoi'), body('danhSach').isArray({ min: 1 }).withMessage('Chọn lịch mới')],
  thanhToan: [
    body('maDon').trim().notEmpty().withMessage('Thiếu mã đơn'),
    body('maGiamGia').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Mã giảm giá tối đa 20 ký tự'),
    body('soDiem').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Số điểm không hợp lệ'),
    body('goiGioChoiId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Gói giờ không hợp lệ'),
  ],
  thuTaiQuay: [body('phuongThuc').isIn(['TIEN_MAT', 'CHUYEN_KHOAN']).withMessage('Phương thức là tiền mặt hoặc chuyển khoản')],
  themDichVu: [
    body('items').isArray({ min: 1 }).withMessage('Chọn ít nhất một dịch vụ'),
    body('items.*.dichVuId').isInt({ min: 1 }),
    body('items.*.soLuong').isInt({ min: 1 }).withMessage('Số lượng phải ≥ 1'),
  ],
  lichHoc: [body('maDon').notEmpty(), body('hlvId').isInt({ min: 1 }), ngay('ngay'), gio('gioBatDau'), gio('gioKetThuc')],
  lichRanh: [ngay('ngay'), gio('gioBatDau'), gio('gioKetThuc')],
  danhGia: [
    body('soSao').isInt({ min: 1, max: 5 }).withMessage('Số sao từ 1 đến 5'),
    body('noiDung').optional().isLength({ max: 1000 }).withMessage('Nhận xét tối đa 1.000 ký tự'),
  ],
  suCo: [body('sanId').isInt({ min: 1 }), body('moTa').trim().isLength({ min: 1, max: 255 }).withMessage('Mô tả bắt buộc, tối đa 255 ký tự')],
  san: [body('tenSan').trim().isLength({ min: 1, max: 50 }).withMessage('Tên sân bắt buộc, tối đa 50 ký tự')],
  bangGia: [body('loaiNgay').isIn(['NGAY_THUONG', 'CUOI_TUAN', 'NGAY_LE']), ngay('apDungTu'), body('dsKhung').isArray({ min: 1 })],
  ngayLe: [ngay('ngay'), body('tenNgayLe').trim().isLength({ min: 1, max: 100 })],
  dichVu: [
    body('tenDichVu').trim().isLength({ min: 1, max: 100 }).withMessage('Tên dịch vụ bắt buộc'),
    body('loai').isIn(['THIET_BI', 'DO_UONG', 'DICH_VU_KHAC']),
    body('donGia').isInt({ min: 1 }).withMessage('Đơn giá > 0'),
    body('soLuongTon').isInt({ min: 0 }).withMessage('Số lượng tồn ≥ 0'),
    body('tienCoc').optional().isInt({ min: 0 }).withMessage('Tiền cọc ≥ 0'),
  ],
  maGiamGia: [
    body('ma').trim().matches(/^[A-Z0-9]{4,20}$/).withMessage('Mã 4–20 ký tự chữ hoa và số'),
    body('phanTramGiam').isInt({ min: 1, max: 100 }).withMessage('Phần trăm giảm 1–100'),
    body('soLuotToiDa').isInt({ min: 1 }).withMessage('Số lượt ≥ 1'),
    ngay('ngayBatDau'), ngay('ngayKetThuc'),
  ],
  hang: [
    body('tenGoi').trim().isLength({ min: 1, max: 50 }),
    body('phi').isInt({ min: 0 }), body('phanTramGiam').isInt({ min: 0, max: 100 }), body('heSoTichDiem').isFloat({ min: 0, max: 9.99 }),
  ],
  loaiGoiGio: [
    body('tenGoi').trim().isLength({ min: 1, max: 100 }), body('loai').isIn(['GOI_GIO', 'THE_TRA_TRUOC']),
    body('giaBan').isInt({ min: 1 }), body('thoiHanNgay').isInt({ min: 1 }),
  ],
  taoTaiKhoan: [
    body('hoTen').trim().matches(HO_TEN).withMessage('Họ tên 2–100 ký tự, chỉ gồm chữ và khoảng trắng'),
    body('soDienThoai').trim().matches(SDT).withMessage('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'),
    body('email').trim().isEmail().withMessage('Email không đúng định dạng'),
    body('vaiTro').isIn(['LE_TAN', 'HLV', 'QUAN_LY']).withMessage('Vai trò không hợp lệ'),
  ],
  trangThaiTaiKhoan: [body('trangThai').isIn(['HOAT_DONG', 'KHOA', 'KHOA_DAT_TRUC_TUYEN']), body('lyDo').trim().notEmpty().withMessage('Nhập lý do')],
  xuLyKhieuNai: [body('noiDungXuLy').trim().isLength({ min: 1, max: 2000 }).withMessage('Nội dung giải quyết bắt buộc, tối đa 2.000 ký tự')],
  khoangNgay: [ngay('tuNgay', query), ngay('denNgay', query)],
};

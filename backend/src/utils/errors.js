// Lỗi nghiệp vụ có mã cố định (Bảng 4.23); middleware xuLyLoi chuyển thành phản hồi ApiError
export class NghiepVuError extends Error {
  constructor(code, message, status = 422, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const loi = {
  duLieu: (message, details) => new NghiepVuError('DU_LIEU_KHONG_HOP_LE', message, 400, details),
  chuaDangNhap: (message = 'Bạn cần đăng nhập để thực hiện chức năng này') => new NghiepVuError('CHUA_DANG_NHAP', message, 401),
  khongDuQuyen: (message = 'Bạn không có quyền thực hiện chức năng này') => new NghiepVuError('KHONG_DU_QUYEN', message, 403),
  khongPhaiChuDon: () => new NghiepVuError('KHONG_PHAI_CHU_DON', 'Đơn này không thuộc tài khoản của bạn', 403),
  khoaDatTrucTuyen: () =>
    new NghiepVuError('KHOA_DAT_TRUC_TUYEN', 'Tài khoản đang bị khóa đặt sân trực tuyến do không đến nhiều lần. Vui lòng đặt trực tiếp tại quầy hoặc liên hệ quản lý.', 403),
  khongTimThay: (doiTuong, code = 'KHONG_TIM_THAY') => new NghiepVuError(code, `Không tìm thấy ${doiTuong}`, 404),
  trungLich: (message, details) => new NghiepVuError('TRUNG_LICH', message, 409, details),
  xungDot: (code, message, details) => new NghiepVuError(code, message, 409, details),
  viPham: (code, message, details) => new NghiepVuError(code, message, 422, details),
};

// PaymentGateway – “interface” của cổng thanh toán (Hình 4.8).
// JavaScript không có từ khóa interface nên dùng lớp cơ sở chỉ khai báo phương thức.
export class PaymentGateway {
  /** @returns {string} URL chuyển khách sang trang thanh toán */
  // eslint-disable-next-line no-unused-vars
  taoUrlThanhToan(thanhToan, { noiDung, ip, hetHanLuc }) {
    throw new Error('Chưa cài đặt');
  }

  /** @returns {boolean} chữ ký của kết quả trả về có hợp lệ không */
  // eslint-disable-next-line no-unused-vars
  xacMinhChuKy(params) {
    throw new Error('Chưa cài đặt');
  }

  /** @returns {Promise<{ thanhCong: boolean, maGiaoDich?: string, ghiChu?: string }>} */
  // eslint-disable-next-line no-unused-vars
  async hoanTien(thanhToanGoc, soTien) {
    throw new Error('Chưa cài đặt');
  }
}

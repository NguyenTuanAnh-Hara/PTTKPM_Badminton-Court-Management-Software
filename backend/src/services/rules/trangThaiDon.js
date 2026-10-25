// Bảng 3.5i – các chuyển trạng thái hợp lệ của đơn đặt sân
export const CHUYEN_HOP_LE = {
  CHO_THANH_TOAN: ['DA_XAC_NHAN', 'HET_HAN', 'DA_HUY'],
  DA_XAC_NHAN: ['DANG_SU_DUNG', 'DA_HUY', 'KHONG_DEN'],
  DANG_SU_DUNG: ['DA_HOAN_THANH'],
  DA_HOAN_THANH: [],
  DA_HUY: [],
  HET_HAN: ['DA_XAC_NHAN'], // E1 của UC02.6: kết quả thanh toán về muộn, khung còn trống thì khôi phục đơn
  KHONG_DEN: [],
};

export const TEN_TRANG_THAI = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  DA_XAC_NHAN: 'Đã xác nhận',
  DANG_SU_DUNG: 'Đang sử dụng',
  DA_HOAN_THANH: 'Đã hoàn thành',
  DA_HUY: 'Đã hủy',
  HET_HAN: 'Hết hạn',
  KHONG_DEN: 'Không đến',
};

/** Các trạng thái mà đơn còn giữ sân */
export const TRANG_THAI_CON_HIEU_LUC = ['CHO_THANH_TOAN', 'DA_XAC_NHAN', 'DANG_SU_DUNG'];

/** Các trạng thái được tính là “đã bán” khi tính tỷ lệ lấp đầy (QT-29) */
export const TRANG_THAI_DA_BAN = ['DA_XAC_NHAN', 'DANG_SU_DUNG', 'DA_HOAN_THANH', 'KHONG_DEN'];

export const choPhepChuyen = (cu, moi) => (CHUYEN_HOP_LE[cu] ?? []).includes(moi);

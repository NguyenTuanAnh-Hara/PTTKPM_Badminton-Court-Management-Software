import dayjs from 'dayjs';

export const tien = (v) => `${Math.round(Number(v) || 0).toLocaleString('vi-VN')} đ`;
export const ngayVN = (s) => (s ? dayjs(s).format('DD/MM/YYYY') : '');
export const ngayGio = (s) => (s ? dayjs(s).format('HH:mm DD/MM/YYYY') : '');
export const gio = (s) => (s ? dayjs(s).format('HH:mm') : '');
export const homNay = () => dayjs().format('YYYY-MM-DD');

export const TRANG_THAI_DON = {
  CHO_THANH_TOAN: { ten: 'Chờ thanh toán', mau: 'gold' },
  DA_XAC_NHAN: { ten: 'Đã xác nhận', mau: 'green' },
  DANG_SU_DUNG: { ten: 'Đang sử dụng', mau: 'blue' },
  DA_HOAN_THANH: { ten: 'Đã hoàn thành', mau: 'cyan' },
  DA_HUY: { ten: 'Đã hủy', mau: 'default' },
  HET_HAN: { ten: 'Hết hạn', mau: 'default' },
  KHONG_DEN: { ten: 'Không đến', mau: 'red' },
};

export const PHUONG_THUC = {
  VNPAY: 'VNPAY', TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', GOI_GIO: 'Gói giờ / thẻ', DIEM_THUONG: 'Điểm thưởng',
};
export const LOAI_DICH_VU = { THIET_BI: 'Thiết bị', DO_UONG: 'Đồ uống', DICH_VU_KHAC: 'Dịch vụ khác' };
export const VAI_TRO = { KHACH_HANG: 'Khách hàng', LE_TAN: 'Lễ tân', HLV: 'Huấn luyện viên', QUAN_LY: 'Quản lý' };
export const LOAI_NGAY = { NGAY_THUONG: 'Ngày thường', CUOI_TUAN: 'Cuối tuần', NGAY_LE: 'Ngày lễ' };
export const TRANG_THAI_TK = { HOAT_DONG: 'Hoạt động', KHOA_DAT_TRUC_TUYEN: 'Khóa đặt trực tuyến', KHOA: 'Đã khóa' };
export const TRANG_THAI_SAN = { HOAT_DONG: 'Hoạt động', BAO_TRI: 'Bảo trì', NGUNG_SU_DUNG: 'Ngừng sử dụng' };
export const TRANG_THAI_DICH_VU = { DA_DAT: 'Đã đặt', DA_GIAO: 'Đã giao', DA_TRA: 'Đã trả' };
export const TRANG_THAI_GIAO_DICH = { CHO_XU_LY: 'Chờ xử lý', THANH_CONG: 'Thành công', THAT_BAI: 'Thất bại' };
export const MUC_DICH = { DAT_SAN: 'Đặt sân', GOI_THANH_VIEN: 'Phí thành viên', MUA_GOI_GIO: 'Mua gói giờ' };
export const THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** Các giờ chẵn 05:00 → 23:00 cho Select */
export const GIO_CHAN = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);

/** Gom chi tiết sân của đơn thành dòng ngắn: "Sân 1 · 17:00–19:00" (các khung liên tiếp được nối) */
export function moTaKhung(chiTiet = []) {
  const theoSan = new Map();
  for (const c of chiTiet) {
    const k = `${c.ngayChoi}|${c.tenSan}`;
    if (!theoSan.has(k)) theoSan.set(k, []);
    theoSan.get(k).push(c);
  }
  const dong = [];
  for (const [k, ds] of theoSan) {
    ds.sort((a, b) => a.gioBatDau.localeCompare(b.gioBatDau));
    const doan = [];
    for (const c of ds) {
      const cuoi = doan[doan.length - 1];
      if (cuoi && cuoi.den === c.gioBatDau) cuoi.den = c.gioKetThuc;
      else doan.push({ tu: c.gioBatDau, den: c.gioKetThuc });
    }
    dong.push(`${k.split('|')[1]} · ${doan.map((d) => `${d.tu}–${d.den}`).join(', ')}`);
  }
  return dong;
}

/** Ngày chơi của đơn (khung đầu tiên) */
export const ngayChoiCuaDon = (don) => don?.chiTiet?.[0]?.ngayChoi ?? null;

/** Thông báo lỗi API thành chuỗi dễ đọc (gồm chi tiết lỗi kiểm tra dữ liệu nếu có) */
export function chuoiLoi(e) {
  if (Array.isArray(e?.details) && e.details.length > 1 && e.details[0]?.loi) {
    return [...new Set(e.details.map((d) => d.loi))].join('; ');
  }
  return e?.message || 'Có lỗi xảy ra';
}

// DiemThuongPolicy – cài đặt QT-20, QT-21
import thamSo from '../../config/thamSo.js';
import { congNgay } from '../../utils/thoiGian.js';

/** QT-21: điểm = số giờ chơi × 10 × hệ số hạng (chưa có hạng: 1,0) */
export const diemTichLuy = (soGio, heSo = 1) => Math.round(soGio * thamSo.DIEM_MOI_GIO * heSo);

/** Hạng còn hiệu lực vào ngày đang xét */
export const hangConHieuLuc = (khach, ngay) =>
  Boolean(khach?.goiThanhVienId && khach.hanThanhVien && khach.hanThanhVien >= ngay);

/**
 * QT-20: hạn mới khi mua / gia hạn / nâng hạng.
 * @param hienTai { goiThanhVienId, hanThanhVien:'YYYY-MM-DD'|null }
 */
export function hanThanhVienMoi(hienTai, goiMoi, homNay) {
  const thoiHan = goiMoi.thoiHanNgay || thamSo.THOI_HAN_THANH_VIEN_NGAY;
  const conHan = hangConHieuLuc(hienTai, homNay);
  if (conHan && hienTai.goiThanhVienId === goiMoi.id) {
    return { loai: 'GIA_HAN', hanMoi: congNgay(hienTai.hanThanhVien, thoiHan) };
  }
  return { loai: conHan ? 'NANG_HANG' : 'MUA_MOI', hanMoi: congNgay(homNay, thoiHan) };
}

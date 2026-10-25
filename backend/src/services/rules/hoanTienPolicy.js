// HoanTienPolicy – cài đặt QT-11 → QT-15
import thamSo from '../../config/thamSo.js';

/**
 * Tỷ lệ hoàn theo thời gian còn lại đến giờ chơi (QT-11) hoặc khi hủy do phía sân (QT-15)
 * @returns {{ duocHuy: boolean, tyLeSan: number, tyLeKhac: number, lyDo?: string }}
 */
export function tyLeHoan(soGioConLai, doPhiaSan = false) {
  if (doPhiaSan) return { duocHuy: true, tyLeSan: 1, tyLeKhac: 1 };
  if (soGioConLai >= thamSo.GIO_HOAN_TOAN_BO) return { duocHuy: true, tyLeSan: 1, tyLeKhac: 1 };
  if (soGioConLai >= thamSo.GIO_HUY_TOI_THIEU) {
    return { duocHuy: true, tyLeSan: thamSo.PHAN_TRAM_HOAN_SAN / 100, tyLeKhac: 1 };
  }
  return { duocHuy: false, tyLeSan: 0, tyLeKhac: 0, lyDo: `Chỉ được hủy trước giờ chơi ít nhất ${thamSo.GIO_HUY_TOI_THIEU} giờ` };
}

/**
 * Phần trăm số tiền đã trả được hoàn lại, quy về tỷ lệ trên tạm tính của đơn
 * (tiền sân hoàn theo tyLeSan, dịch vụ chưa giao và học phí HLV hoàn theo tyLeKhac; dịch vụ đã giao không hoàn).
 */
export function heSoHoan({ tienSan, tienDichVuChuaGiao = 0, tienDichVuDaGiao = 0, hocPhi = 0 }, tyLe) {
  const tamTinh = tienSan + tienDichVuChuaGiao + tienDichVuDaGiao + hocPhi;
  if (tamTinh <= 0) return 0;
  const f = (tyLe.tyLeSan * tienSan + tyLe.tyLeKhac * (tienDichVuChuaGiao + hocPhi)) / tamTinh;
  return Math.min(1, Math.max(0, f));
}

/**
 * QT-12: chia số tiền hoàn về đúng kênh đã thanh toán.
 * @param kenh [{ phuongThuc, soTien, goiGioChoiId }] – số tiền thực thu theo từng kênh (đã trừ các lần hoàn trước)
 * @param f hệ số hoàn 0…1
 */
export function phanBoHoan(kenh, f) {
  return kenh
    .map((k) => ({ ...k, soTienHoan: f >= 1 ? k.soTien : Math.floor(k.soTien * f) }))
    .filter((k) => k.soTienHoan > 0);
}

import { Prisma } from '@prisma/client';
import { NghiepVuError } from '../utils/errors.js';

// Chuyển mọi lỗi thành cấu trúc ApiError thống nhất { code, message, details, timestamp }
// eslint-disable-next-line no-unused-vars
export function xuLyLoi(err, req, res, next) {
  const tra = (status, code, message, details) =>
    res.status(status).json({ code, message, details, timestamp: new Date().toISOString() });

  if (err instanceof NghiepVuError) return tra(err.status, err.code, err.message, err.details);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = String(err.meta?.target ?? '');
      if (target.includes('uq_khong_trung_lich') || target.includes('khung_gio_id')) {
        return tra(409, 'TRUNG_LICH', 'Khung giờ vừa được người khác đặt, vui lòng chọn khung khác');
      }
      return tra(409, 'DU_LIEU_DA_TON_TAI', 'Dữ liệu đã tồn tại', { truong: target });
    }
    if (err.code === 'P2025') return tra(404, 'KHONG_TIM_THAY', 'Không tìm thấy dữ liệu');
    if (err.code === 'P2003') return tra(409, 'DANG_DUOC_SU_DUNG', 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa');
  }
  if (err?.type === 'entity.parse.failed') return tra(400, 'DU_LIEU_KHONG_HOP_LE', 'Dữ liệu gửi lên không phải JSON hợp lệ');

  console.error(err);
  return tra(500, 'LOI_HE_THONG', 'Hệ thống gặp lỗi, vui lòng thử lại sau');
}

// ThanhToanRepository – truy vấn bảng thanh_toan
import prisma from '../config/prisma.js';

export const thanhToanRepository = {
  existsByMaGiaoDichCong: async (ma, db = prisma) => (await db.thanhToan.count({ where: { maGiaoDichCong: ma } })) > 0,

  findById: (id, db = prisma) => db.thanhToan.findUnique({ where: { id }, include: { donDatSan: true, hoaDon: true } }),

  findByDonDatSan: (donDatSanId, db = prisma) => db.thanhToan.findMany({ where: { donDatSanId }, orderBy: { thoiGian: 'asc' } }),

  /** Giao dịch thành công trong khoảng thời gian – dùng cho báo cáo doanh thu (QT-28) */
  findThanhCongTrongKhoang: (tu, den, db = prisma) =>
    db.thanhToan.findMany({
      where: { trangThai: 'THANH_CONG', thoiGian: { gte: tu, lt: den } },
      include: {
        donDatSan: { include: { chiTiet: true, chiTietDichVu: { include: { dichVu: true } }, buoiHoc: true } },
      },
      orderBy: { thoiGian: 'asc' },
    }),
};

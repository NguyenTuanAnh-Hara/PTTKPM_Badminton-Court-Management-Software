// ChiTietDatSanRepository – truy vấn bảng chi_tiet_dat_san
import prisma from '../config/prisma.js';
import { sangNgayDb } from '../utils/thoiGian.js';

export const chiTietDatSanRepository = {
  /** Các chi tiết còn giữ sân của một ngày (hiển thị lưới lịch sân) */
  findByNgayChoi: (ngay, db = prisma) =>
    db.chiTietDatSan.findMany({
      where: { ngayChoi: sangNgayDb(ngay), conHieuLuc: 1 },
      include: {
        donDatSan: {
          select: {
            id: true, maDon: true, trangThai: true, khachHangId: true, hoTenKhach: true, sdtKhach: true,
            khachHang: { select: { nguoiDung: { select: { hoTen: true, soDienThoai: true } } } },
          },
        },
      },
    }),

  /** Các (sân, ngày, khung) trong danh sách đã bị chi tiết khác còn hiệu lực chiếm (QT-06) */
  timTrung: (ngay, dsSanKhung, boQuaDonId = null, db = prisma) =>
    db.chiTietDatSan.findMany({
      where: {
        ngayChoi: sangNgayDb(ngay),
        conHieuLuc: 1,
        OR: dsSanKhung.map((x) => ({ sanId: x.sanId, khungGioId: x.khungGioId })),
        ...(boQuaDonId ? { donDatSanId: { not: boQuaDonId } } : {}),
      },
      include: { san: true, khungGio: true },
    }),

  findBySanTuNgay: (sanId, tuNgay, denNgay, db = prisma) =>
    db.chiTietDatSan.findMany({
      where: { sanId, conHieuLuc: 1, ngayChoi: { gte: sangNgayDb(tuNgay), lte: sangNgayDb(denNgay) } },
      include: { khungGio: true, donDatSan: true },
    }),
};

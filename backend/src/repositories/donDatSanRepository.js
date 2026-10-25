// DonDatSanRepository – truy vấn bảng don_dat_san (Hình 4.8)
import prisma from '../config/prisma.js';

export const INCLUDE_DON = {
  chiTiet: { include: { san: true, khungGio: true }, orderBy: [{ ngayChoi: 'asc' }, { khungGioId: 'asc' }] },
  chiTietDichVu: { include: { dichVu: true }, orderBy: { id: 'asc' } },
  buoiHoc: { include: { hlv: { include: { nguoiDung: { select: { hoTen: true } } } } }, orderBy: { id: 'asc' } },
  thanhToan: { include: { hoaDon: true }, orderBy: { thoiGian: 'asc' } },
  khachHang: {
    include: { nguoiDung: { select: { id: true, hoTen: true, soDienThoai: true, email: true, trangThai: true } }, goiThanhVien: true },
  },
  maGiamGia: true,
  danhGia: { include: { khieuNai: true } },
};

export const donDatSanRepository = {
  findByMaDon: (maDon, db = prisma) => db.donDatSan.findUnique({ where: { maDon }, include: INCLUDE_DON }),

  findById: (id, db = prisma) => db.donDatSan.findUnique({ where: { id }, include: INCLUDE_DON }),

  /** Đơn chờ thanh toán đã quá hạn giữ chỗ – dùng chỉ mục (trang_thai, han_giu_cho) */
  findQuaHanGiuCho: (now, db = prisma) =>
    db.donDatSan.findMany({ where: { trangThai: 'CHO_THANH_TOAN', hanGiuCho: { lt: now } }, include: INCLUDE_DON }),

  /** Đơn đã xác nhận có ngày chơi từ hôm nay trở về trước (để xét no-show) */
  findChuaCheckIn: (denNgayDb, db = prisma) =>
    db.donDatSan.findMany({
      where: { trangThai: 'DA_XAC_NHAN', chiTiet: { some: { ngayChoi: { lte: denNgayDb } } } },
      include: INCLUDE_DON,
    }),

  findDangSuDung: (db = prisma) => db.donDatSan.findMany({ where: { trangThai: 'DANG_SU_DUNG' }, include: INCLUDE_DON }),

  /** Số đơn đặt lẻ đang chờ thanh toán của khách (QT-03) */
  demDangCho: (khachHangId, db = prisma) =>
    db.donDatSan.count({ where: { khachHangId, trangThai: 'CHO_THANH_TOAN', lichDinhKyId: null } }),
};

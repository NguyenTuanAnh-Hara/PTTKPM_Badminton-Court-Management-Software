import prisma from '../config/prisma.js';

/** Ghi nhật ký thao tác quan trọng (NFR-08) */
export function ghiNhatKy(nguoiDungId, hanhDong, doiTuong, doiTuongId, noiDung = null, db = prisma) {
  if (!nguoiDungId) return Promise.resolve();
  return db.nhatKyThaoTac.create({
    data: {
      nguoiDungId,
      hanhDong,
      doiTuong,
      doiTuongId: Number(doiTuongId) || 0,
      noiDung: noiDung === null ? null : typeof noiDung === 'string' ? noiDung : JSON.stringify(noiDung),
    },
  });
}

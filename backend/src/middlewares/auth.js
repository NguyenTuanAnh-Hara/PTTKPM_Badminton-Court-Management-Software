import prisma from '../config/prisma.js';
import { loi } from '../utils/errors.js';

/**
 * Đọc người dùng của phiên từ CSDL ở mỗi yêu cầu, để việc khóa tài khoản
 * hoặc đổi vai trò có hiệu lực ngay (UC06.5). Không bắt buộc đăng nhập.
 */
export async function docNguoiDung(req, res, next) {
  const id = req.session?.userId;
  if (!id) return next();
  const u = await prisma.nguoiDung.findUnique({
    where: { id },
    select: { id: true, hoTen: true, email: true, soDienThoai: true, vaiTro: true, trangThai: true },
  });
  if (!u || u.trangThai === 'KHOA') {
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    if (u) return next(loi.khongDuQuyen('Tài khoản của bạn đã bị khóa'));
    return next();
  }
  req.user = u;
  next();
}

/** Bắt buộc đã đăng nhập */
export function yeuCauDangNhap(req, res, next) {
  if (!req.user) return next(loi.chuaDangNhap());
  next();
}

/** Chỉ cho các vai trò được liệt kê (NFR-06) */
export const phanQuyen = (...vaiTro) => (req, res, next) => {
  if (!req.user) return next(loi.chuaDangNhap());
  if (!vaiTro.includes(req.user.vaiTro)) return next(loi.khongDuQuyen());
  next();
};

// AuthService – phân hệ UC01 Tài khoản & Thành viên
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { notificationSender } from '../agents/notificationSender.js';
import { thongTinKhach } from './donTinhToan.js';
import { goiCuaToi } from './thanhToanService.js';
import { taoOtp } from '../utils/maSo.js';
import { chuoiNgay, congNgay, homNay, sangNgayDb, congPhut, bayGio } from '../utils/thoiGian.js';
import { soTien } from '../utils/tien.js';
import { loi, NghiepVuError } from '../utils/errors.js';

const SO_VONG_BAM = 10;
export const TRANG_MAC_DINH = { KHACH_HANG: '/', LE_TAN: '/le-tan/van-hanh', HLV: '/hlv/lich-day', QUAN_LY: '/quan-ly/bao-cao' };

export const bamMatKhau = (mk) => bcrypt.hash(mk, SO_VONG_BAM);

const thongTinCongKhai = (u) => ({
  id: u.id,
  hoTen: u.hoTen,
  email: u.email,
  soDienThoai: u.soDienThoai,
  vaiTro: u.vaiTro,
  trangThai: u.trangThai,
  trangMacDinh: TRANG_MAC_DINH[u.vaiTro],
});

/** Hủy mọi phiên đăng nhập của người dùng (trừ phiên đang dùng) – bảng sessions do express-mysql-session tạo */
export async function huyMoiPhien(nguoiDungId, giuPhienId = '') {
  try {
    await prisma.$executeRaw`DELETE FROM sessions WHERE data REGEXP ${`"userId":${Number(nguoiDungId)}[,}]`} AND session_id <> ${giuPhienId}`;
  } catch (e) {
    console.warn('Không xóa được phiên cũ:', e.message);
  }
}

/** UC01.1 – Đăng ký tài khoản khách hàng */
export async function dangKy({ hoTen, soDienThoai, email, matKhau }) {
  const trungSdt = await prisma.nguoiDung.findUnique({ where: { soDienThoai } });
  if (trungSdt) throw loi.xungDot('SDT_DA_TON_TAI', 'Số điện thoại đã được đăng ký');
  const trungEmail = await prisma.nguoiDung.findUnique({ where: { email: email.toLowerCase() } });
  if (trungEmail) throw loi.xungDot('EMAIL_DA_TON_TAI', 'Email đã được đăng ký');
  const u = await prisma.nguoiDung.create({
    data: {
      hoTen: hoTen.trim(),
      soDienThoai,
      email: email.toLowerCase(),
      matKhauHash: await bamMatKhau(matKhau),
      vaiTro: 'KHACH_HANG',
      khachHang: { create: {} },
    },
  });
  notificationSender.guiNguoiDung(u.id, `Chào ${u.hoTen}, tài khoản của bạn đã được tạo thành công. Chúc bạn có những giờ chơi vui vẻ!`);
  return thongTinCongKhai(u);
}

/** UC01.2 – Đăng nhập bằng SĐT hoặc email */
export async function dangNhap(req, { dinhDanh, matKhau }) {
  const s = String(dinhDanh).trim().toLowerCase();
  const u = await prisma.nguoiDung.findFirst({ where: { OR: [{ soDienThoai: s }, { email: s }] } });
  if (!u || !(await bcrypt.compare(matKhau, u.matKhauHash))) {
    throw new NghiepVuError('SAI_THONG_TIN_DANG_NHAP', 'Số điện thoại / email hoặc mật khẩu không đúng', 401);
  }
  if (u.trangThai === 'KHOA') throw loi.khongDuQuyen('Tài khoản đã bị khóa, vui lòng liên hệ quản lý');
  // regenerate() thay req.session bằng một phiên MỚI (chống session fixation),
  // nên phải ghi userId vào req.session sau khi regenerate, không dùng biến phiên cũ
  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.userId = u.id;
  await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
  return thongTinCongKhai(u);
}

export function dangXuat(session) {
  return new Promise((resolve) => session.destroy(() => resolve()));
}

/** UC01.2 – A1: quên mật khẩu, gửi OTP 6 chữ số hiệu lực 5 phút */
export async function quenMatKhau(session, { dinhDanh }) {
  const s = String(dinhDanh).trim().toLowerCase();
  const u = await prisma.nguoiDung.findFirst({ where: { OR: [{ soDienThoai: s }, { email: s }] } });
  if (u && u.trangThai !== 'KHOA') {
    const otp = taoOtp();
    session.otp = { userId: u.id, hash: await bcrypt.hash(otp, SO_VONG_BAM), hetHan: congPhut(bayGio(), 5).getTime(), soLanSai: 0 };
    await notificationSender.gui({ nguoiNhanId: u.id, diaChi: u.email, noiDung: `Mã OTP đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong 5 phút.` });
  }
  // Không cho biết tài khoản có tồn tại hay không
  return { daGui: true };
}

export async function datLaiMatKhau(session, { otp, matKhauMoi }) {
  const o = session.otp;
  if (!o || o.hetHan < Date.now()) throw loi.viPham('OTP_KHONG_HOP_LE', 'Mã OTP đã hết hạn, vui lòng yêu cầu mã mới');
  if (!(await bcrypt.compare(String(otp), o.hash))) {
    o.soLanSai += 1;
    if (o.soLanSai >= 5) delete session.otp;
    throw loi.viPham('OTP_KHONG_HOP_LE', 'Mã OTP không đúng');
  }
  delete session.otp;
  await prisma.nguoiDung.update({ where: { id: o.userId }, data: { matKhauHash: await bamMatKhau(matKhauMoi) } });
  await huyMoiPhien(o.userId);
  return { thanhCong: true };
}

/** UC01.3 – thông tin cá nhân */
export async function layThongTinToi(user) {
  const kq = { ...thongTinCongKhai(user) };
  if (user.vaiTro === 'KHACH_HANG') {
    const kh = await thongTinKhach(user.id);
    const tu = sangNgayDb(congNgay(homNay(), -thamSo.SO_NGAY_DEM_NO_SHOW));
    const noShow30 = await prisma.donDatSan.count({
      where: { khachHangId: user.id, trangThai: 'KHONG_DEN', chiTiet: { some: { ngayChoi: { gte: tu } } } },
    });
    kq.khachHang = {
      hang: kh.conHang ? { id: kh.goiThanhVien.id, tenGoi: kh.goiThanhVien.tenGoi, phanTramGiam: kh.goiThanhVien.phanTramGiam, heSoTichDiem: Number(kh.goiThanhVien.heSoTichDiem) } : null,
      hanThanhVien: kh.hanThanhVien,
      diemThuong: kh.diemThuong,
      soLanNoShow: kh.soLanNoShow,
      soLanNoShow30Ngay: noShow30,
      goiGio: await goiCuaToi(user),
    };
  }
  if (user.vaiTro === 'HLV') {
    const h = await prisma.huanLuyenVien.findUnique({ where: { nguoiDungId: user.id } });
    kq.hlv = { chuyenMon: h?.chuyenMon ?? null, hocPhiGio: soTien(h?.hocPhiGio) };
  }
  return kq;
}

export async function capNhatThongTin(user, { hoTen, email }) {
  const data = {};
  if (hoTen) data.hoTen = hoTen.trim();
  if (email && email.toLowerCase() !== user.email) {
    const trung = await prisma.nguoiDung.findUnique({ where: { email: email.toLowerCase() } });
    if (trung) throw loi.xungDot('EMAIL_DA_TON_TAI', 'Email đã được dùng cho tài khoản khác');
    data.email = email.toLowerCase();
  }
  const u = await prisma.nguoiDung.update({ where: { id: user.id }, data });
  return thongTinCongKhai(u);
}

export async function doiMatKhau(user, phienHienTai, { matKhauCu, matKhauMoi }) {
  const u = await prisma.nguoiDung.findUnique({ where: { id: user.id } });
  if (!(await bcrypt.compare(matKhauCu, u.matKhauHash))) throw loi.viPham('SAI_MAT_KHAU', 'Mật khẩu hiện tại không đúng');
  await prisma.nguoiDung.update({ where: { id: user.id }, data: { matKhauHash: await bamMatKhau(matKhauMoi) } });
  await huyMoiPhien(user.id, phienHienTai);
  return { thanhCong: true };
}

/** UC01.4 – danh sách hạng thành viên đang mở bán */
export async function dsGoiThanhVien(user) {
  const ds = await prisma.goiThanhVien.findMany({ where: { trangThai: 'DANG_BAN' }, orderBy: { phi: 'asc' } });
  const kh = user?.vaiTro === 'KHACH_HANG' ? await thongTinKhach(user.id) : null;
  return ds.map((g) => ({
    id: g.id,
    tenGoi: g.tenGoi,
    phi: soTien(g.phi),
    thoiHanNgay: g.thoiHanNgay,
    phanTramGiam: g.phanTramGiam,
    heSoTichDiem: Number(g.heSoTichDiem),
    laHangHienTai: Boolean(kh?.conHang && kh.goiThanhVienId === g.id),
    hanHienTai: kh?.conHang && kh.goiThanhVienId === g.id ? chuoiNgay(kh.hanThanhVien) : null,
  }));
}

/** UC03.2 – danh sách loại gói giờ / thẻ trả trước */
export async function dsLoaiGoiGio() {
  const ds = await prisma.loaiGoiGio.findMany({ orderBy: { giaBan: 'asc' } });
  return ds.map((l) => ({
    id: l.id,
    tenGoi: l.tenGoi,
    loai: l.loai,
    soGio: l.soGio === null ? null : Number(l.soGio),
    menhGia: l.menhGia === null ? null : soTien(l.menhGia),
    giaBan: soTien(l.giaBan),
    thoiHanNgay: l.thoiHanNgay,
  }));
}

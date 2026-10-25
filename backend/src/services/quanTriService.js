// QuanTriService – phân hệ UC06 Quản trị hệ thống (quản lý)
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { notificationSender } from '../agents/notificationSender.js';
import { bamMatKhau, huyMoiPhien } from './authService.js';
import { ghiNhatKy } from './nhatKyService.js';
import { TRANG_THAI_CON_HIEU_LUC } from './rules/trangThaiDon.js';
import { chuoiGio, chuoiNgay, congNgay, homNay, laNgayHopLe, phutCua, sangGioDb, sangNgayDb } from '../utils/thoiGian.js';
import { taoMatKhauTam } from '../utils/maSo.js';
import { soTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

// ---------------------------------------------------------------- UC06.1 Quản lý sân

export async function dsSan() {
  const ds = await prisma.san.findMany({ orderBy: { id: 'asc' } });
  return ds;
}

export async function taoSan(ql, { tenSan, loaiSan, moTa }) {
  const s = await prisma.san.create({ data: { tenSan: tenSan.trim(), loaiSan: loaiSan || null, moTa: moTa || null, trangThai: 'HOAT_DONG' } });
  await ghiNhatKy(ql.id, 'THEM_SAN', 'san', s.id, s);
  return s;
}

export async function capNhatSan(ql, id, { tenSan, loaiSan, moTa, trangThai }) {
  const cu = await prisma.san.findUnique({ where: { id: Number(id) } });
  if (!cu) throw loi.khongTimThay('sân');
  if (trangThai === 'NGUNG_SU_DUNG' && cu.trangThai !== 'NGUNG_SU_DUNG') {
    // A1: liệt kê lịch tương lai, phải xử lý trước khi ngừng sử dụng
    const conLich = await prisma.chiTietDatSan.findMany({
      where: { sanId: cu.id, conHieuLuc: 1, ngayChoi: { gte: sangNgayDb(homNay()) }, donDatSan: { trangThai: { in: TRANG_THAI_CON_HIEU_LUC } } },
      include: { donDatSan: { select: { maDon: true } } },
    });
    if (conLich.length) {
      throw loi.xungDot('SAN_CON_LICH', `Sân còn ${conLich.length} khung đã đặt trong tương lai. Hãy ghi nhận sự cố cho sân để chuyển / hủy các lịch này trước.`,
        [...new Set(conLich.map((c) => c.donDatSan.maDon))]);
    }
  }
  const s = await prisma.san.update({
    where: { id: cu.id },
    data: {
      ...(tenSan ? { tenSan: tenSan.trim() } : {}),
      ...(loaiSan !== undefined ? { loaiSan: loaiSan || null } : {}),
      ...(moTa !== undefined ? { moTa: moTa || null } : {}),
      ...(trangThai ? { trangThai } : {}),
    },
  });
  await ghiNhatKy(ql.id, 'SUA_SAN', 'san', s.id, { truoc: cu, sau: s });
  return s;
}

// ---------------------------------------------------------------- UC06.2 Quản lý bảng giá

export async function bangGiaHienHanh() {
  const hn = sangNgayDb(homNay());
  const ds = await prisma.khungGia.findMany({
    where: { OR: [{ apDungDen: null }, { apDungDen: { gte: hn } }] },
    orderBy: [{ loaiNgay: 'asc' }, { apDungTu: 'asc' }, { gioBatDau: 'asc' }],
  });
  const ngayLe = await prisma.ngayLe.findMany({ where: { ngay: { gte: sangNgayDb(congNgay(homNay(), -30)) } }, orderBy: { ngay: 'asc' } });
  return {
    khungGia: ds.map((k) => ({
      id: k.id, loaiNgay: k.loaiNgay, gioBatDau: chuoiGio(k.gioBatDau), gioKetThuc: chuoiGio(k.gioKetThuc),
      donGia: soTien(k.donGia), apDungTu: chuoiNgay(k.apDungTu), apDungDen: chuoiNgay(k.apDungDen),
    })),
    ngayLe: ngayLe.map((n) => ({ id: n.id, ngay: chuoiNgay(n.ngay), tenNgayLe: n.tenNgayLe })),
  };
}

/**
 * Lưu bảng giá mới cho một loại ngày, áp dụng từ ngày apDungTu (bước 3–4 của UC06.2).
 * dsKhung: [{ gioBatDau:'05:00', gioKetThuc:'17:00', donGia }] phải phủ kín 05:00 – 23:00, không chồng lấn (QT-08).
 */
export async function luuBangGia(ql, { loaiNgay, apDungTu, dsKhung }) {
  if (!['NGAY_THUONG', 'CUOI_TUAN', 'NGAY_LE'].includes(loaiNgay)) throw loi.duLieu('Loại ngày không hợp lệ');
  if (!laNgayHopLe(apDungTu) || apDungTu < homNay()) throw loi.duLieu('Ngày áp dụng không được trước hôm nay');
  const ds = [...(dsKhung ?? [])].sort((a, b) => phutCua(a.gioBatDau) - phutCua(b.gioBatDau));
  let mocTruoc = thamSo.GIO_MO_CUA * 60;
  for (const k of ds) {
    const bd = phutCua(k.gioBatDau);
    const kt = phutCua(k.gioKetThuc);
    if (bd % 60 || kt % 60) throw loi.duLieu('Khung giá cấu hình theo giờ chẵn');
    if (bd !== mocTruoc) throw loi.viPham('BANG_GIA_KHONG_HOP_LE', `Các khung giá phải nối liền, không chồng lấn (lỗi tại ${k.gioBatDau})`);
    if (kt <= bd) throw loi.duLieu('Giờ kết thúc phải sau giờ bắt đầu');
    const g = Number(k.donGia);
    if (!Number.isInteger(g) || g <= 0 || g % 1000) throw loi.duLieu('Đơn giá là số nguyên dương, bội số 1.000 đ');
    mocTruoc = kt;
  }
  if (mocTruoc !== thamSo.GIO_DONG_CUA * 60) throw loi.viPham('BANG_GIA_KHONG_HOP_LE', 'Bảng giá phải phủ kín 05:00 – 23:00 (QT-08)');

  await prisma.$transaction(async (tx) => {
    const cu = await tx.khungGia.findMany({
      where: { loaiNgay, OR: [{ apDungDen: null }, { apDungDen: { gte: sangNgayDb(apDungTu) } }] },
      include: { _count: { select: { chiTiet: true } } },
    });
    for (const k of cu) {
      if (chuoiNgay(k.apDungTu) >= apDungTu) {
        if (k._count.chiTiet) throw loi.xungDot('BANG_GIA_DA_DUNG', 'Phiên bản giá tương lai đã được dùng cho đơn đặt, không thể thay');
        await tx.khungGia.delete({ where: { id: k.id } });
      } else {
        await tx.khungGia.update({ where: { id: k.id }, data: { apDungDen: sangNgayDb(congNgay(apDungTu, -1)) } });
      }
    }
    await tx.khungGia.createMany({
      data: ds.map((k) => ({
        loaiNgay, gioBatDau: sangGioDb(k.gioBatDau), gioKetThuc: sangGioDb(k.gioKetThuc), donGia: Number(k.donGia),
        apDungTu: sangNgayDb(apDungTu), apDungDen: null,
      })),
    });
    await ghiNhatKy(ql.id, 'DOI_GIA', 'khung_gia', 0, { loaiNgay, apDungTu, dsKhung: ds }, tx);
  });
  return bangGiaHienHanh();
}

export async function themNgayLe(ql, { ngay, tenNgayLe }) {
  if (!laNgayHopLe(ngay)) throw loi.duLieu('Ngày không hợp lệ');
  const n = await prisma.ngayLe.create({ data: { ngay: sangNgayDb(ngay), tenNgayLe } });
  await ghiNhatKy(ql.id, 'THEM_NGAY_LE', 'ngay_le', n.id, { ngay, tenNgayLe });
  return { id: n.id, ngay, tenNgayLe };
}

export async function xoaNgayLe(ql, id) {
  await prisma.ngayLe.delete({ where: { id: Number(id) } });
  await ghiNhatKy(ql.id, 'XOA_NGAY_LE', 'ngay_le', id);
  return { daXoa: true };
}

// ---------------------------------------------------------------- UC06.3 Danh mục dịch vụ

export async function dsDichVuQuanTri() {
  const ds = await prisma.dichVu.findMany({ include: { _count: { select: { chiTiet: true } } }, orderBy: [{ loai: 'asc' }, { id: 'asc' }] });
  return ds.map((d) => ({
    id: d.id, tenDichVu: d.tenDichVu, loai: d.loai, donGia: soTien(d.donGia), soLuongTon: d.soLuongTon,
    tienCoc: soTien(d.tienCoc), trangThai: d.trangThai, daDung: d._count.chiTiet > 0,
  }));
}

const duLieuDichVu = ({ tenDichVu, loai, donGia, soLuongTon, tienCoc, trangThai }) => ({
  ...(tenDichVu !== undefined ? { tenDichVu: tenDichVu.trim() } : {}),
  ...(loai !== undefined ? { loai } : {}),
  ...(donGia !== undefined ? { donGia: Number(donGia) } : {}),
  ...(soLuongTon !== undefined ? { soLuongTon: Number(soLuongTon) } : {}),
  ...(tienCoc !== undefined ? { tienCoc: loai && loai !== 'THIET_BI' ? 0 : Number(tienCoc) || 0 } : {}),
  ...(trangThai !== undefined ? { trangThai } : {}),
});

export async function taoDichVu(ql, body) {
  const d = await prisma.dichVu.create({ data: { trangThai: 'DANG_BAN', tienCoc: 0, ...duLieuDichVu(body) } });
  await ghiNhatKy(ql.id, 'THEM_DICH_VU', 'dich_vu', d.id, body);
  return d;
}

export async function capNhatDichVu(ql, id, body) {
  const d = await prisma.dichVu.update({ where: { id: Number(id) }, data: duLieuDichVu(body) });
  await ghiNhatKy(ql.id, 'SUA_DICH_VU', 'dich_vu', d.id, body);
  return d;
}

/** A2: nhập kho */
export async function nhapKho(ql, id, soLuong) {
  const n = Number(soLuong);
  if (!Number.isInteger(n) || n <= 0) throw loi.duLieu('Số lượng nhập là số nguyên dương');
  const d = await prisma.dichVu.update({ where: { id: Number(id) }, data: { soLuongTon: { increment: n } } });
  await ghiNhatKy(ql.id, 'NHAP_KHO', 'dich_vu', d.id, { soLuong: n });
  return d;
}

/** A1: đã từng dùng thì chỉ ngừng kinh doanh, chưa từng dùng thì xóa hẳn */
export async function xoaDichVu(ql, id) {
  const daDung = await prisma.chiTietDichVu.count({ where: { dichVuId: Number(id) } });
  if (daDung) {
    await prisma.dichVu.update({ where: { id: Number(id) }, data: { trangThai: 'NGUNG' } });
    await ghiNhatKy(ql.id, 'NGUNG_DICH_VU', 'dich_vu', id);
    return { ketQua: 'NGUNG_KINH_DOANH' };
  }
  await prisma.dichVu.delete({ where: { id: Number(id) } });
  await ghiNhatKy(ql.id, 'XOA_DICH_VU', 'dich_vu', id);
  return { ketQua: 'DA_XOA' };
}

// ---------------------------------------------------------------- UC06.4 Quản lý ưu đãi

export async function dsUuDai() {
  const [ma, hang, goiGio] = await Promise.all([
    prisma.maGiamGia.findMany({ orderBy: { id: 'desc' } }),
    prisma.goiThanhVien.findMany({ include: { _count: { select: { khachHang: true } } }, orderBy: { phi: 'asc' } }),
    prisma.loaiGoiGio.findMany({ include: { _count: { select: { goiDaBan: true } } }, orderBy: { giaBan: 'asc' } }),
  ]);
  const hn = homNay();
  return {
    maGiamGia: ma.map((m) => ({
      id: m.id, ma: m.ma, phanTramGiam: m.phanTramGiam, giamToiDa: m.giamToiDa === null ? null : soTien(m.giamToiDa),
      soLuotToiDa: m.soLuotToiDa, soLuotDaDung: m.soLuotDaDung, ngayBatDau: chuoiNgay(m.ngayBatDau), ngayKetThuc: chuoiNgay(m.ngayKetThuc),
      conHieuLuc: chuoiNgay(m.ngayBatDau) <= hn && chuoiNgay(m.ngayKetThuc) >= hn && m.soLuotDaDung < m.soLuotToiDa,
    })),
    hangThanhVien: hang.map((g) => ({
      id: g.id, tenGoi: g.tenGoi, phi: soTien(g.phi), thoiHanNgay: g.thoiHanNgay, phanTramGiam: g.phanTramGiam,
      heSoTichDiem: Number(g.heSoTichDiem), trangThai: g.trangThai, soKhach: g._count.khachHang,
    })),
    loaiGoiGio: goiGio.map((l) => ({
      id: l.id, tenGoi: l.tenGoi, loai: l.loai, soGio: l.soGio === null ? null : Number(l.soGio),
      menhGia: l.menhGia === null ? null : soTien(l.menhGia), giaBan: soTien(l.giaBan), thoiHanNgay: l.thoiHanNgay, daBan: l._count.goiDaBan,
    })),
  };
}

export async function luuMaGiamGia(ql, id, { ma, phanTramGiam, giamToiDa, soLuotToiDa, ngayBatDau, ngayKetThuc }) {
  if (!/^[A-Z0-9]{4,20}$/.test(ma ?? '')) throw loi.duLieu('Mã gồm 4–20 ký tự chữ hoa và số');
  if (ngayBatDau > ngayKetThuc) throw loi.duLieu('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  const data = {
    ma, phanTramGiam: Number(phanTramGiam), giamToiDa: giamToiDa === null || giamToiDa === '' || giamToiDa === undefined ? null : Number(giamToiDa),
    soLuotToiDa: Number(soLuotToiDa), ngayBatDau: sangNgayDb(ngayBatDau), ngayKetThuc: sangNgayDb(ngayKetThuc),
  };
  const m = id ? await prisma.maGiamGia.update({ where: { id: Number(id) }, data }) : await prisma.maGiamGia.create({ data });
  await ghiNhatKy(ql.id, id ? 'SUA_MA_GIAM_GIA' : 'THEM_MA_GIAM_GIA', 'ma_giam_gia', m.id, { ma });
  return m;
}

/** A1: ngừng phát hành mã – kết thúc hiệu lực từ hôm qua */
export async function ngungMaGiamGia(ql, id) {
  const m = await prisma.maGiamGia.update({ where: { id: Number(id) }, data: { ngayKetThuc: sangNgayDb(congNgay(homNay(), -1)) } });
  await ghiNhatKy(ql.id, 'NGUNG_MA_GIAM_GIA', 'ma_giam_gia', m.id);
  return m;
}

export async function luuHangThanhVien(ql, id, { tenGoi, phi, thoiHanNgay, phanTramGiam, heSoTichDiem, trangThai }) {
  const data = {
    tenGoi, phi: Number(phi), thoiHanNgay: Number(thoiHanNgay) || thamSo.THOI_HAN_THANH_VIEN_NGAY, phanTramGiam: Number(phanTramGiam),
    heSoTichDiem: Number(heSoTichDiem), trangThai: trangThai ?? 'DANG_BAN',
  };
  const g = id ? await prisma.goiThanhVien.update({ where: { id: Number(id) }, data }) : await prisma.goiThanhVien.create({ data });
  await ghiNhatKy(ql.id, id ? 'SUA_HANG' : 'THEM_HANG', 'goi_thanh_vien', g.id, data);
  return g;
}

export async function luuLoaiGoiGio(ql, id, { tenGoi, loai, soGio, menhGia, giaBan, thoiHanNgay }) {
  if (loai === 'GOI_GIO' && !(Number(soGio) > 0)) throw loi.duLieu('Gói giờ cần số giờ > 0');
  if (loai === 'THE_TRA_TRUOC' && !(Number(menhGia) > 0)) throw loi.duLieu('Thẻ trả trước cần mệnh giá > 0');
  const data = {
    tenGoi, loai, soGio: loai === 'GOI_GIO' ? Number(soGio) : null, menhGia: loai === 'THE_TRA_TRUOC' ? Number(menhGia) : null,
    giaBan: Number(giaBan), thoiHanNgay: Number(thoiHanNgay),
  };
  const l = id ? await prisma.loaiGoiGio.update({ where: { id: Number(id) }, data }) : await prisma.loaiGoiGio.create({ data });
  await ghiNhatKy(ql.id, id ? 'SUA_GOI_GIO' : 'THEM_GOI_GIO', 'loai_goi_gio', l.id, data);
  return l;
}

// ---------------------------------------------------------------- UC06.5 Quản lý tài khoản

export async function dsTaiKhoan({ q, vaiTro, trangThai } = {}) {
  const where = {};
  if (vaiTro) where.vaiTro = vaiTro;
  if (trangThai) where.trangThai = trangThai;
  if (q) where.OR = [{ hoTen: { contains: q } }, { soDienThoai: { contains: q } }, { email: { contains: q } }];
  const ds = await prisma.nguoiDung.findMany({
    where,
    include: { khachHang: { include: { goiThanhVien: true } }, hlv: true, leTan: true },
    orderBy: { id: 'desc' },
    take: 200,
  });
  return ds.map((u) => ({
    id: u.id, hoTen: u.hoTen, soDienThoai: u.soDienThoai, email: u.email, vaiTro: u.vaiTro, trangThai: u.trangThai, ngayTao: u.ngayTao,
    diemThuong: u.khachHang?.diemThuong ?? null, soLanNoShow: u.khachHang?.soLanNoShow ?? null,
    hang: u.khachHang?.goiThanhVien?.tenGoi ?? null, hanThanhVien: chuoiNgay(u.khachHang?.hanThanhVien),
    chuyenMon: u.hlv?.chuyenMon ?? null, hocPhiGio: u.hlv ? soTien(u.hlv.hocPhiGio) : null, caLamViec: u.leTan?.caLamViec ?? null,
  }));
}

/** Bảo đảm có bản ghi ở bảng con tương ứng vai trò (khach_hang / nhan_vien_le_tan / huan_luyen_vien) */
async function damBaoBangCon(tx, id, vaiTro, { chuyenMon, hocPhiGio, caLamViec } = {}) {
  if (vaiTro === 'KHACH_HANG') await tx.khachHang.upsert({ where: { nguoiDungId: id }, create: { nguoiDungId: id }, update: {} });
  if (vaiTro === 'LE_TAN') {
    await tx.nhanVienLeTan.upsert({ where: { nguoiDungId: id }, create: { nguoiDungId: id, caLamViec: caLamViec || null }, update: { ...(caLamViec !== undefined ? { caLamViec } : {}) } });
  }
  if (vaiTro === 'HLV') {
    await tx.huanLuyenVien.upsert({
      where: { nguoiDungId: id },
      create: { nguoiDungId: id, chuyenMon: chuyenMon || null, hocPhiGio: Number(hocPhiGio) || 0 },
      update: { ...(chuyenMon !== undefined ? { chuyenMon } : {}), ...(hocPhiGio !== undefined ? { hocPhiGio: Number(hocPhiGio) } : {}) },
    });
  }
}

/** Tạo tài khoản nhân viên / HLV với mật khẩu tạm, gửi qua email */
export async function taoTaiKhoan(ql, { hoTen, soDienThoai, email, vaiTro, chuyenMon, hocPhiGio, caLamViec }) {
  if (!['LE_TAN', 'HLV', 'QUAN_LY', 'KHACH_HANG'].includes(vaiTro)) throw loi.duLieu('Vai trò không hợp lệ');
  if (await prisma.nguoiDung.findFirst({ where: { OR: [{ soDienThoai }, { email: email.toLowerCase() }] } })) {
    throw loi.xungDot('DU_LIEU_DA_TON_TAI', 'Số điện thoại hoặc email đã được dùng');
  }
  const matKhauTam = taoMatKhauTam();
  const u = await prisma.$transaction(async (tx) => {
    const x = await tx.nguoiDung.create({
      data: { hoTen, soDienThoai, email: email.toLowerCase(), vaiTro, matKhauHash: await bamMatKhau(matKhauTam) },
    });
    await damBaoBangCon(tx, x.id, vaiTro, { chuyenMon, hocPhiGio, caLamViec });
    await ghiNhatKy(ql.id, 'TAO_TAI_KHOAN', 'nguoi_dung', x.id, { vaiTro }, tx);
    return x;
  });
  notificationSender.guiNguoiDung(u.id, `Tài khoản của bạn đã được tạo. Đăng nhập bằng ${u.soDienThoai} hoặc ${u.email}, mật khẩu tạm: ${matKhauTam}. Hãy đổi mật khẩu ở lần đăng nhập đầu tiên.`);
  return { id: u.id, matKhauTam };
}

export async function capNhatTaiKhoan(ql, id, { hoTen, email, vaiTro, chuyenMon, hocPhiGio, caLamViec }) {
  const cu = await prisma.nguoiDung.findUnique({ where: { id: Number(id) } });
  if (!cu) throw loi.khongTimThay('tài khoản');
  const u = await prisma.$transaction(async (tx) => {
    const x = await tx.nguoiDung.update({
      where: { id: cu.id },
      data: { ...(hoTen ? { hoTen } : {}), ...(email ? { email: email.toLowerCase() } : {}), ...(vaiTro ? { vaiTro } : {}) },
    });
    await damBaoBangCon(tx, x.id, x.vaiTro, { chuyenMon, hocPhiGio, caLamViec });
    await ghiNhatKy(ql.id, vaiTro && vaiTro !== cu.vaiTro ? 'PHAN_QUYEN' : 'SUA_TAI_KHOAN', 'nguoi_dung', x.id, { truoc: { vaiTro: cu.vaiTro }, sau: { vaiTro: x.vaiTro } }, tx);
    return x;
  });
  return { id: u.id };
}

/** Khóa / mở khóa có lý do; khóa thì hủy mọi phiên của tài khoản */
export async function doiTrangThaiTaiKhoan(ql, id, { trangThai, lyDo }) {
  if (!lyDo) throw loi.duLieu('Nhập lý do khóa / mở khóa');
  if (!['HOAT_DONG', 'KHOA', 'KHOA_DAT_TRUC_TUYEN'].includes(trangThai)) throw loi.duLieu('Trạng thái không hợp lệ');
  if (Number(id) === ql.id) throw loi.viPham('KHONG_TU_KHOA', 'Không thể tự khóa tài khoản của mình');
  const u = await prisma.nguoiDung.update({ where: { id: Number(id) }, data: { trangThai } });
  if (trangThai === 'KHOA') await huyMoiPhien(u.id);
  await ghiNhatKy(ql.id, trangThai === 'HOAT_DONG' ? 'MO_KHOA' : 'KHOA_TAI_KHOAN', 'nguoi_dung', u.id, { trangThai, lyDo });
  notificationSender.guiNguoiDung(u.id, trangThai === 'HOAT_DONG' ? 'Tài khoản của bạn đã được mở khóa.' : `Tài khoản của bạn đã bị khóa. Lý do: ${lyDo}`);
  return { id: u.id, trangThai };
}

/** A1 – căn cứ mở khóa: các đơn “Không đến” của khách */
export async function donKhongDenCuaKhach(id) {
  const ds = await prisma.donDatSan.findMany({
    where: { khachHangId: Number(id), trangThai: 'KHONG_DEN' },
    include: { chiTiet: { include: { san: true, khungGio: true } } },
    orderBy: { ngayTao: 'desc' },
  });
  return ds.map((d) => ({
    maDon: d.maDon,
    ngayChoi: chuoiNgay(d.chiTiet[0]?.ngayChoi),
    khung: d.chiTiet.map((c) => `${c.san.tenSan} ${chuoiGio(c.khungGio.gioBatDau)}`).join(', '),
  }));
}

// ---------------------------------------------------------------- Nhật ký thao tác (NFR-08), tham số

export async function dsNhatKy({ hanhDong, trang = 0 } = {}) {
  const ds = await prisma.nhatKyThaoTac.findMany({
    where: hanhDong ? { hanhDong } : {},
    include: { nguoiDung: { select: { hoTen: true, vaiTro: true } } },
    orderBy: { thoiGian: 'desc' },
    skip: Number(trang) * 50,
    take: 50,
  });
  return ds.map((n) => ({ ...n, nguoiThucHien: n.nguoiDung.hoTen, vaiTro: n.nguoiDung.vaiTro, nguoiDung: undefined }));
}

export const xemThamSo = () => thamSo;

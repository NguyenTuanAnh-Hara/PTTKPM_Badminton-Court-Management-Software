// DichVuService – phân hệ UC04 Dịch vụ đi kèm (thiết bị, đồ uống, huấn luyện viên)
import prisma from '../config/prisma.js';
import { donDatSanRepository } from '../repositories/donDatSanRepository.js';
import { notificationSender } from '../agents/notificationSender.js';
import { kiemTraQuyenDon } from './datSanService.js';
import { capNhatTongTien, chiTietTinhTien, sangDTO, khoangThoiGian } from './donTinhToan.js';
import { hoanPhanDuThua, hoanTienDon } from './hoanTienService.js';
import { ghiNhatKy } from './nhatKyService.js';
import { TRANG_THAI_CON_HIEU_LUC } from './rules/trangThaiDon.js';
import {
  bayGio, chuoiGio, chuoiNgay, congNgay, homNay, laNgayHopLe, sangGioDb, sangNgayDb, thoiDiem, phutCua, hienThiNgay,
} from '../utils/thoiGian.js';
import { soTien, dinhDangTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

// ---------------------------------------------------------------- Danh mục, tồn kho (QT-24)

/** Số lượng đã được đặt nhưng chưa giao của từng dịch vụ trong một ngày */
async function soLuongDaDatChuaGiao(ngay, db = prisma) {
  const where = { trangThai: 'DA_DAT', donDatSan: { trangThai: { in: TRANG_THAI_CON_HIEU_LUC } } };
  if (ngay) where.donDatSan.chiTiet = { some: { ngayChoi: sangNgayDb(ngay) } };
  const ds = await db.chiTietDichVu.groupBy({ by: ['dichVuId'], where, _sum: { soLuong: true } });
  return new Map(ds.map((x) => [x.dichVuId, x._sum.soLuong ?? 0]));
}

export async function layDanhMuc({ loai, ngay } = {}) {
  const ds = await prisma.dichVu.findMany({
    where: { trangThai: 'DANG_BAN', ...(loai ? { loai: { in: String(loai).split(',') } } : {}) },
    orderBy: [{ loai: 'asc' }, { tenDichVu: 'asc' }],
  });
  const daDat = await soLuongDaDatChuaGiao(ngay && laNgayHopLe(ngay) ? ngay : null);
  return ds.map((d) => ({
    id: d.id,
    tenDichVu: d.tenDichVu,
    loai: d.loai,
    donGia: soTien(d.donGia),
    tienCoc: soTien(d.tienCoc),
    soLuongTon: d.soLuongTon,
    soLuongCoTheDat: Math.max(0, d.soLuongTon - (daDat.get(d.id) ?? 0)),
  }));
}

// ---------------------------------------------------------------- UC04.1, UC04.2, UC04.3

/**
 * Thêm dịch vụ vào đơn. Khách: chi tiết “Đã đặt” (giao khi check-in).
 * Lễ tân ghi nhận tại quầy (UC04.3): chi tiết “Đã giao”, trừ tồn kho ngay.
 * items: [{ dichVuId, soLuong }]
 */
export async function themVaoDon(user, maDon, items) {
  const laLeTan = user.vaiTro === 'LE_TAN' || user.vaiTro === 'QUAN_LY';
  if (!Array.isArray(items) || !items.length) throw loi.duLieu('Chọn ít nhất một dịch vụ');
  const kq = await prisma.$transaction(async (tx) => {
    const don = await donDatSanRepository.findByMaDon(maDon, tx);
    kiemTraQuyenDon(user, don);
    const hopLe = laLeTan ? ['CHO_THANH_TOAN', 'DA_XAC_NHAN', 'DANG_SU_DUNG'] : ['CHO_THANH_TOAN', 'DA_XAC_NHAN'];
    if (!hopLe.includes(don.trangThai)) throw loi.viPham('KHONG_THEM_DICH_VU', 'Đơn ở trạng thái này không thêm được dịch vụ (QT-24)');
    const { batDau, ketThuc } = khoangThoiGian(don);
    if (!laLeTan && batDau <= bayGio()) throw loi.viPham('KHONG_THEM_DICH_VU', 'Buổi chơi đã bắt đầu, vui lòng gọi dịch vụ tại quầy');
    if (laLeTan && ketThuc <= bayGio()) throw loi.viPham('KHONG_THEM_DICH_VU', 'Buổi chơi đã kết thúc');
    const ngay = chuoiNgay(chiTietTinhTien(don)[0].ngayChoi);
    const daDat = await soLuongDaDatChuaGiao(ngay, tx);
    for (const it of items) {
      const soLuong = Number(it.soLuong);
      if (!Number.isInteger(soLuong) || soLuong < 1) throw loi.duLieu('Số lượng phải là số nguyên ≥ 1');
      const dv = await tx.dichVu.findUnique({ where: { id: Number(it.dichVuId) } });
      if (!dv || dv.trangThai !== 'DANG_BAN') throw loi.khongTimThay('dịch vụ đang kinh doanh');
      const coThe = dv.soLuongTon - (daDat.get(dv.id) ?? 0);
      if (soLuong > coThe) {
        throw loi.viPham('HET_THIET_BI', `${dv.tenDichVu} chỉ còn ${Math.max(0, coThe)} có thể đặt (QT-24)`);
      }
      daDat.set(dv.id, (daDat.get(dv.id) ?? 0) + soLuong);
      const giaoNgay = laLeTan;
      await tx.chiTietDichVu.create({
        data: {
          donDatSanId: don.id, dichVuId: dv.id, soLuong, donGia: dv.donGia,
          tienCoc: giaoNgay && dv.loai === 'THIET_BI' ? soTien(dv.tienCoc) * soLuong : 0,
          trangThai: giaoNgay ? 'DA_GIAO' : 'DA_DAT',
          nhanVienGhiNhanId: user.vaiTro === 'LE_TAN' ? user.id : null,
        },
      });
      if (giaoNgay) await tx.dichVu.update({ where: { id: dv.id }, data: { soLuongTon: { decrement: soLuong } } });
    }
    await capNhatTongTien(don.id, tx);
    return donDatSanRepository.findById(don.id, tx);
  });
  return sangDTO(kq, { xemNoiBo: laLeTan });
}

/** UC04.1 – A1: bỏ dịch vụ chưa giao trước giờ chơi, hoàn phần đã trả (QT-12) */
export async function xoaKhoiDon(user, maDon, chiTietId) {
  const kq = await prisma.$transaction(async (tx) => {
    const don = await donDatSanRepository.findByMaDon(maDon, tx);
    kiemTraQuyenDon(user, don);
    const ct = don.chiTietDichVu.find((x) => x.id === Number(chiTietId));
    if (!ct) throw loi.khongTimThay('dịch vụ trong đơn');
    if (ct.trangThai !== 'DA_DAT') throw loi.viPham('KHONG_XOA_DICH_VU', 'Dịch vụ đã giao, không thể bỏ');
    if (user.vaiTro === 'KHACH_HANG' && khoangThoiGian(don).batDau <= bayGio()) {
      throw loi.viPham('KHONG_XOA_DICH_VU', 'Chỉ bỏ dịch vụ trước giờ chơi');
    }
    await tx.chiTietDichVu.delete({ where: { id: ct.id } });
    const tongMoi = await capNhatTongTien(don.id, tx);
    const hoan = await hoanPhanDuThua(tx, don, tongMoi, { nhanVienId: user.vaiTro === 'LE_TAN' ? user.id : null });
    return { don: await donDatSanRepository.findById(don.id, tx), hoan };
  });
  return { don: sangDTO(kq.don, { xemNoiBo: user.vaiTro !== 'KHACH_HANG' }), tongHoan: kq.hoan.tongHoan };
}

// ---------------------------------------------------------------- UC04.4 Đặt lịch học với HLV

const khoangGio = (bd, kt) => ({ tu: phutCua(bd), den: phutCua(kt) });
const giaoNhau = (a, b) => a.tu < b.den && b.tu < a.den;

export async function dsHlv() {
  const ds = await prisma.huanLuyenVien.findMany({
    where: { nguoiDung: { trangThai: { not: 'KHOA' } } },
    include: { nguoiDung: { select: { hoTen: true } } },
  });
  return ds.map((h) => ({ id: h.nguoiDungId, hoTen: h.nguoiDung.hoTen, chuyenMon: h.chuyenMon, hocPhiGio: soTien(h.hocPhiGio) }));
}

/** Lịch rảnh và các buổi đã bận của HLV trong 7 ngày từ tuNgay */
export async function lichRanhHlv(hlvId, tuNgay = homNay()) {
  const den = congNgay(tuNgay, 6);
  const where = { hlvId: Number(hlvId), ngay: { gte: sangNgayDb(tuNgay), lte: sangNgayDb(den) } };
  const [ranh, ban] = await Promise.all([
    prisma.lichRanhHlv.findMany({ where, orderBy: [{ ngay: 'asc' }, { gioBatDau: 'asc' }] }),
    prisma.buoiHoc.findMany({ where: { ...where, trangThai: 'DA_DAT' }, orderBy: [{ ngay: 'asc' }, { gioBatDau: 'asc' }] }),
  ]);
  return {
    lichRanh: ranh.map((r) => ({ id: r.id, ngay: chuoiNgay(r.ngay), gioBatDau: chuoiGio(r.gioBatDau), gioKetThuc: chuoiGio(r.gioKetThuc) })),
    daBan: ban.map((b) => ({ ngay: chuoiNgay(b.ngay), gioBatDau: chuoiGio(b.gioBatDau), gioKetThuc: chuoiGio(b.gioKetThuc) })),
  };
}

/** Các khoảng giờ sân của đơn theo từng (ngày, sân): [{ ngay, tu, den }] tính theo phút */
function khoangSanCuaDon(don) {
  const nhom = new Map();
  for (const c of chiTietTinhTien(don)) {
    const khoa = `${chuoiNgay(c.ngayChoi)}|${c.sanId}`;
    if (!nhom.has(khoa)) nhom.set(khoa, []);
    nhom.get(khoa).push(khoangGio(chuoiGio(c.khungGio.gioBatDau), chuoiGio(c.khungGio.gioKetThuc)));
  }
  const kq = [];
  for (const [khoa, ds] of nhom) {
    ds.sort((a, b) => a.tu - b.tu);
    let cur = { ...ds[0] };
    for (const k of ds.slice(1)) {
      if (k.tu === cur.den) cur.den = k.den;
      else {
        kq.push({ ngay: khoa.split('|')[0], ...cur });
        cur = { ...k };
      }
    }
    kq.push({ ngay: khoa.split('|')[0], ...cur });
  }
  return kq;
}

/** HLV có lịch rảnh trùng thời gian của đơn (UC04.4 bước 2) */
export async function hlvChoDon(user, maDon) {
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(user, don);
  const khoang = khoangSanCuaDon(don);
  const ngays = [...new Set(khoang.map((k) => k.ngay))];
  const dsHlvAll = await prisma.huanLuyenVien.findMany({
    where: { nguoiDung: { trangThai: { not: 'KHOA' } } },
    include: {
      nguoiDung: { select: { hoTen: true } },
      lichRanh: { where: { ngay: { in: ngays.map(sangNgayDb) } } },
      buoiHoc: { where: { trangThai: 'DA_DAT', ngay: { in: ngays.map(sangNgayDb) } } },
    },
  });
  const kq = [];
  for (const h of dsHlvAll) {
    const goiY = [];
    for (const k of khoang) {
      for (const r of h.lichRanh.filter((x) => chuoiNgay(x.ngay) === k.ngay)) {
        const rr = khoangGio(chuoiGio(r.gioBatDau), chuoiGio(r.gioKetThuc));
        const tu = Math.max(rr.tu, k.tu);
        const den = Math.min(rr.den, k.den);
        if (den - tu < 60) continue;
        const ban = h.buoiHoc.filter((b) => chuoiNgay(b.ngay) === k.ngay).map((b) => khoangGio(chuoiGio(b.gioBatDau), chuoiGio(b.gioKetThuc)));
        if (ban.some((b) => giaoNhau(b, { tu, den }))) continue;
        const gio = (p) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;
        goiY.push({ ngay: k.ngay, gioBatDau: gio(tu), gioKetThuc: gio(den) });
      }
    }
    if (goiY.length) {
      kq.push({ id: h.nguoiDungId, hoTen: h.nguoiDung.hoTen, chuyenMon: h.chuyenMon, hocPhiGio: soTien(h.hocPhiGio), khungCoThe: goiY });
    }
  }
  return kq;
}

/** QT-26: buổi học ≥ 1 giờ, trong lịch rảnh của HLV, trùng khung giờ một sân của đơn, HLV không trùng buổi */
export async function datLichHoc(user, { maDon, hlvId, ngay, gioBatDau, gioKetThuc }) {
  const k = khoangGio(gioBatDau, gioKetThuc);
  if (k.tu % 60 || k.den % 60 || k.den - k.tu < 60) throw loi.viPham('SAI_LICH_HOC', 'Buổi học tính theo giờ chẵn và dài tối thiểu 1 giờ (QT-26)');
  const kq = await prisma.$transaction(async (tx) => {
    const don = await donDatSanRepository.findByMaDon(maDon, tx);
    kiemTraQuyenDon(user, don);
    if (!['CHO_THANH_TOAN', 'DA_XAC_NHAN'].includes(don.trangThai)) throw loi.viPham('SAI_LICH_HOC', 'Đơn ở trạng thái này không đặt thêm HLV được');
    if (thoiDiem(ngay, gioBatDau) <= bayGio()) throw loi.viPham('SAI_LICH_HOC', 'Giờ học đã qua');
    if (!khoangSanCuaDon(don).some((s) => s.ngay === ngay && s.tu <= k.tu && k.den <= s.den)) {
      throw loi.viPham('SAI_LICH_HOC', 'Giờ học phải nằm trong khung giờ đã đặt của một sân trong đơn (QT-26)');
    }
    const hlv = await tx.huanLuyenVien.findUnique({ where: { nguoiDungId: Number(hlvId) }, include: { nguoiDung: true } });
    if (!hlv) throw loi.khongTimThay('huấn luyện viên');
    const ranh = await tx.lichRanhHlv.findMany({ where: { hlvId: hlv.nguoiDungId, ngay: sangNgayDb(ngay) } });
    if (!ranh.some((r) => phutCua(chuoiGio(r.gioBatDau)) <= k.tu && k.den <= phutCua(chuoiGio(r.gioKetThuc)))) {
      throw loi.viPham('HLV_KHONG_RANH', 'Huấn luyện viên không rảnh trong khoảng giờ này');
    }
    const ban = await tx.buoiHoc.findMany({ where: { hlvId: hlv.nguoiDungId, ngay: sangNgayDb(ngay), trangThai: 'DA_DAT' } });
    if (ban.some((b) => giaoNhau(khoangGio(chuoiGio(b.gioBatDau), chuoiGio(b.gioKetThuc)), k))) {
      throw loi.viPham('HLV_KHONG_RANH', 'Huấn luyện viên đã có buổi dạy khác trùng giờ');
    }
    await tx.buoiHoc.create({
      data: {
        donDatSanId: don.id, hlvId: hlv.nguoiDungId, ngay: sangNgayDb(ngay), gioBatDau: sangGioDb(gioBatDau), gioKetThuc: sangGioDb(gioKetThuc),
        hocPhi: soTien(hlv.hocPhiGio) * ((k.den - k.tu) / 60), trangThai: 'DA_DAT',
      },
    });
    await capNhatTongTien(don.id, tx);
    return { don: await donDatSanRepository.findById(don.id, tx), hlv };
  });
  notificationSender.guiNguoiDung(kq.hlv.nguoiDungId, `Bạn có buổi dạy mới ngày ${hienThiNgay(ngay)} từ ${gioBatDau} đến ${gioKetThuc} (đơn ${maDon}).`);
  return sangDTO(kq.don, { xemNoiBo: user.vaiTro !== 'KHACH_HANG' });
}

// ---------------------------------------------------------------- UC04.5 Quản lý lịch dạy

export async function lichDayCuaToi(hlv, { tuNgay = homNay(), denNgay } = {}) {
  const den = denNgay && laNgayHopLe(denNgay) ? denNgay : congNgay(tuNgay, 6);
  const where = { hlvId: hlv.id, ngay: { gte: sangNgayDb(tuNgay), lte: sangNgayDb(den) } };
  const [ranh, buoi] = await Promise.all([
    prisma.lichRanhHlv.findMany({ where, orderBy: [{ ngay: 'asc' }, { gioBatDau: 'asc' }] }),
    prisma.buoiHoc.findMany({
      where,
      include: {
        donDatSan: {
          include: {
            chiTiet: { where: { conHieuLuc: 1 }, include: { san: true } },
            khachHang: { include: { nguoiDung: { select: { hoTen: true, soDienThoai: true } } } },
          },
        },
      },
      orderBy: [{ ngay: 'asc' }, { gioBatDau: 'asc' }],
    }),
  ]);
  return {
    tuNgay,
    denNgay: den,
    lichRanh: ranh.map((r) => ({ id: r.id, ngay: chuoiNgay(r.ngay), gioBatDau: chuoiGio(r.gioBatDau), gioKetThuc: chuoiGio(r.gioKetThuc) })),
    buoiHoc: buoi.map((b) => ({
      id: b.id,
      ngay: chuoiNgay(b.ngay),
      gioBatDau: chuoiGio(b.gioBatDau),
      gioKetThuc: chuoiGio(b.gioKetThuc),
      trangThai: b.trangThai,
      hocPhi: soTien(b.hocPhi),
      maDon: b.donDatSan.maDon,
      khach: b.donDatSan.khachHang?.nguoiDung.hoTen ?? b.donDatSan.hoTenKhach,
      sdt: b.donDatSan.khachHang?.nguoiDung.soDienThoai ?? b.donDatSan.sdtKhach,
      san: [...new Set(b.donDatSan.chiTiet.map((c) => c.san.tenSan))].join(', '),
    })),
  };
}

export async function themLichRanh(hlv, { ngay, gioBatDau, gioKetThuc }) {
  if (!laNgayHopLe(ngay) || ngay < homNay()) throw loi.duLieu('Ngày không hợp lệ');
  const k = khoangGio(gioBatDau, gioKetThuc);
  if (k.tu % 60 || k.den % 60 || k.tu < 5 * 60 || k.den > 23 * 60 || k.den <= k.tu) {
    throw loi.duLieu('Lịch rảnh tính theo giờ chẵn, trong khoảng 05:00 – 23:00');
  }
  const ds = await prisma.lichRanhHlv.findMany({ where: { hlvId: hlv.id, ngay: sangNgayDb(ngay) } });
  if (ds.some((r) => giaoNhau(khoangGio(chuoiGio(r.gioBatDau), chuoiGio(r.gioKetThuc)), k))) {
    throw loi.xungDot('TRUNG_LICH_RANH', 'Khoảng giờ này chồng lấn lịch rảnh đã khai báo');
  }
  const r = await prisma.lichRanhHlv.create({
    data: { hlvId: hlv.id, ngay: sangNgayDb(ngay), gioBatDau: sangGioDb(gioBatDau), gioKetThuc: sangGioDb(gioKetThuc) },
  });
  return { id: r.id, ngay, gioBatDau, gioKetThuc };
}

/** UC04.5 – A1: xóa khung rảnh; buổi học trong khung chỉ hủy được trước giờ học ≥ 24 giờ (QT-15, QT-26) */
export async function xoaLichRanh(hlv, id) {
  const r = await prisma.lichRanhHlv.findUnique({ where: { id: Number(id) } });
  if (!r || r.hlvId !== hlv.id) throw loi.khongTimThay('lịch rảnh');
  const ngay = chuoiNgay(r.ngay);
  const k = khoangGio(chuoiGio(r.gioBatDau), chuoiGio(r.gioKetThuc));
  const buoi = (await prisma.buoiHoc.findMany({ where: { hlvId: hlv.id, ngay: r.ngay, trangThai: 'DA_DAT' } }))
    .filter((b) => giaoNhau(khoangGio(chuoiGio(b.gioBatDau), chuoiGio(b.gioKetThuc)), k));
  for (const b of buoi) {
    if ((thoiDiem(ngay, chuoiGio(b.gioBatDau)) - bayGio()) / 3600000 < 24) {
      throw loi.viPham('KHONG_DUOC_HUY', 'Có buổi học trong vòng 24 giờ tới, không thể báo nghỉ (QT-26)');
    }
  }
  const dsDon = [];
  await prisma.$transaction(async (tx) => {
    for (const b of buoi) {
      const don = await donDatSanRepository.findById(b.donDatSanId, tx);
      await tx.buoiHoc.update({ where: { id: b.id }, data: { trangThai: 'DA_HUY' } });
      const tongMoi = await capNhatTongTien(don.id, tx);
      await hoanPhanDuThua(tx, don, tongMoi); // QT-15: hoàn 100% học phí
      dsDon.push(don);
    }
    await tx.lichRanhHlv.delete({ where: { id: r.id } });
    await ghiNhatKy(hlv.id, 'BAO_NGHI', 'lich_ranh_hlv', r.id, { ngay, soBuoiHuy: buoi.length }, tx);
  });
  for (const don of dsDon) {
    notificationSender.guiKhachCuaDon(don, `Huấn luyện viên của đơn ${don.maDon} báo nghỉ ngày ${hienThiNgay(ngay)}. Học phí được hoàn 100%; bạn có thể chọn huấn luyện viên khác trong chi tiết đơn.`);
  }
  return { daXoa: true, soBuoiHuy: buoi.length };
}

export { hoanTienDon, dinhDangTien };

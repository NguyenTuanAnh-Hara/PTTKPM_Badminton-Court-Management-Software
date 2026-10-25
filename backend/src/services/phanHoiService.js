// PhanHoiService – phân hệ UC08 Thông báo & Phản hồi
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { donDatSanRepository } from '../repositories/donDatSanRepository.js';
import { notificationSender } from '../agents/notificationSender.js';
import { khoangThoiGian, chiTietTinhTien } from './donTinhToan.js';
import { ghiNhatKy } from './nhatKyService.js';
import { bayGio, chuoiGio, chuoiNgay, congNgay, homNay, ngayCua, sangNgayDb, thoiDiem } from '../utils/thoiGian.js';
import { chuoiNgauNhien } from '../utils/maSo.js';
import { loi } from '../utils/errors.js';

/** UC08.1 – đánh giá sau buổi chơi; dưới 3 sao có nội dung thì có thể gửi khiếu nại («extend») */
export async function danhGia(user, maDon, { soSao, noiDung, tieuChi = [], guiKhieuNai = false }) {
  const sao = Number(soSao);
  if (!Number.isInteger(sao) || sao < 1 || sao > 5) throw loi.duLieu('Số sao từ 1 đến 5');
  const nd = String(noiDung ?? '').trim();
  if (nd.length > 1000) throw loi.duLieu('Nhận xét tối đa 1.000 ký tự');
  if (sao < 3 && !nd) throw loi.duLieu('Đánh giá dưới 3 sao cần có nhận xét');
  const don = await donDatSanRepository.findByMaDon(maDon);
  if (!don) throw loi.khongTimThay('đơn đặt sân', 'KHONG_TIM_THAY_DON');
  if (don.khachHangId !== user.id) throw loi.khongPhaiChuDon();
  if (don.trangThai !== 'DA_HOAN_THANH') throw loi.viPham('CHUA_HOAN_THANH', 'Chỉ đánh giá đơn đã hoàn thành');
  if (don.danhGia) throw loi.xungDot('DA_DANH_GIA', 'Đơn này đã được đánh giá');
  const { ketThuc } = khoangThoiGian(don);
  if (congNgay(ngayCua(ketThuc), thamSo.SO_NGAY_DUOC_DANH_GIA) < homNay()) {
    throw loi.viPham('HET_HAN_DANH_GIA', `Chỉ đánh giá trong ${thamSo.SO_NGAY_DUOC_DANH_GIA} ngày sau buổi chơi (QT-19)`);
  }
  const noiDungLuu = [tieuChi.length ? `[Phản ánh: ${tieuChi.join(', ')}]` : '', nd].filter(Boolean).join(' ');
  const kq = await prisma.$transaction(async (tx) => {
    const dg = await tx.danhGia.create({ data: { donDatSanId: don.id, soSao: sao, noiDung: noiDungLuu || null } });
    let kn = null;
    if (guiKhieuNai && sao < 3 && nd) kn = await tx.khieuNai.create({ data: { danhGiaId: dg.id, trangThai: 'CHO_XU_LY' } });
    return { dg, kn };
  });
  if (kq.kn) {
    const dsQuanLy = await prisma.nguoiDung.findMany({ where: { vaiTro: 'QUAN_LY', trangThai: 'HOAT_DONG' } });
    for (const q of dsQuanLy) notificationSender.guiNguoiDung(q.id, `Có khiếu nại mới từ đơn ${don.maDon} (${sao} sao): ${nd}`);
  }
  return { daDanhGia: true, coKhieuNai: Boolean(kq.kn) };
}

/** Điểm trung bình đánh giá theo sân (UC08.1 bước 3) */
export async function diemTrungBinhSan() {
  const ds = await prisma.danhGia.findMany({ include: { donDatSan: { include: { chiTiet: { include: { san: true } } } } } });
  const theoSan = new Map();
  for (const d of ds) {
    for (const s of new Set(d.donDatSan.chiTiet.map((c) => c.san.tenSan))) {
      const x = theoSan.get(s) ?? { tenSan: s, tong: 0, soLuot: 0 };
      x.tong += d.soSao;
      x.soLuot++;
      theoSan.set(s, x);
    }
  }
  return [...theoSan.values()].map((x) => ({ tenSan: x.tenSan, soLuot: x.soLuot, diemTrungBinh: Math.round((x.tong / x.soLuot) * 10) / 10 }));
}

/** UC08.2 – danh sách khiếu nại, sắp theo thời gian chờ, đánh dấu quá 48 giờ */
export async function dsKhieuNai({ trangThai } = {}) {
  const ds = await prisma.khieuNai.findMany({
    where: trangThai ? { trangThai } : {},
    include: { danhGia: { include: { donDatSan: { include: { khachHang: { include: { nguoiDung: true } } } } } }, quanLy: { select: { hoTen: true } } },
    orderBy: { thoiGianTao: 'asc' },
  });
  const now = bayGio();
  return ds.map((k) => ({
    id: k.id,
    maDon: k.danhGia.donDatSan.maDon,
    khach: k.danhGia.donDatSan.khachHang?.nguoiDung.hoTen,
    soSao: k.danhGia.soSao,
    noiDung: k.danhGia.noiDung,
    trangThai: k.trangThai,
    thoiGianTao: k.thoiGianTao,
    quaHan: k.trangThai === 'CHO_XU_LY' && now - k.thoiGianTao > thamSo.GIO_KHIEU_NAI_QUA_HAN * 3600000,
    quanLy: k.quanLy?.hoTen ?? null,
    noiDungXuLy: k.noiDungXuLy,
    thoiGianXuLy: k.thoiGianXuLy,
  }));
}

/** «include» Xem chi tiết khiếu nại: đánh giá, đơn, sân, lễ tân trực, HLV, sự cố của sân trong ngày */
export async function chiTietKhieuNai(id) {
  const k = await prisma.khieuNai.findUnique({ where: { id: Number(id) }, include: { danhGia: true } });
  if (!k) throw loi.khongTimThay('khiếu nại');
  const don = await donDatSanRepository.findById(k.danhGia.donDatSanId);
  const ct = chiTietTinhTien(don);
  const ngay = chuoiNgay(ct[0]?.ngayChoi ?? don.ngayTao);
  const dsSanId = [...new Set(ct.map((c) => c.sanId))];
  const suCo = await prisma.suCo.findMany({
    where: { sanId: { in: dsSanId }, thoiGianGhiNhan: { gte: thoiDiem(ngay, '00:00'), lt: thoiDiem(congNgay(ngay, 1), '00:00') } },
    include: { san: true },
  });
  const leTan = await prisma.thanhToan.findMany({
    where: { donDatSanId: don.id, nhanVienThuId: { not: null } },
    include: { nhanVienThu: { include: { nguoiDung: { select: { hoTen: true } } } } },
  });
  return {
    id: k.id,
    trangThai: k.trangThai,
    danhGia: { soSao: k.danhGia.soSao, noiDung: k.danhGia.noiDung, thoiGian: k.danhGia.thoiGian },
    don: {
      maDon: don.maDon,
      khach: don.khachHang?.nguoiDung.hoTen,
      email: don.khachHang?.nguoiDung.email,
      ngayChoi: ngay,
      khung: ct.map((c) => `${c.san.tenSan} ${chuoiGio(c.khungGio.gioBatDau)}–${chuoiGio(c.khungGio.gioKetThuc)}`),
      hlv: don.buoiHoc.map((b) => b.hlv.nguoiDung.hoTen),
      leTan: [...new Set(leTan.map((t) => t.nhanVienThu.nguoiDung.hoTen))],
    },
    suCo: suCo.map((s) => ({ san: s.san.tenSan, moTa: s.moTa, thoiGianGhiNhan: s.thoiGianGhiNhan })),
    noiDungXuLy: k.noiDungXuLy,
  };
}

/** UC08.2 bước 3–5: hoàn tất khiếu nại, tùy chọn đền bù bằng mã giảm giá dùng một lần (A1) */
export async function xuLyKhieuNai(ql, id, { noiDungXuLy, denBu }) {
  const nd = String(noiDungXuLy ?? '').trim();
  if (!nd || nd.length > 2000) throw loi.duLieu('Nội dung giải quyết bắt buộc, tối đa 2.000 ký tự');
  const k = await prisma.khieuNai.findUnique({ where: { id: Number(id) }, include: { danhGia: { include: { donDatSan: true } } } });
  if (!k) throw loi.khongTimThay('khiếu nại');
  if (k.trangThai === 'DA_GIAI_QUYET') throw loi.xungDot('DA_GIAI_QUYET', 'Khiếu nại đã được giải quyết');
  const kq = await prisma.$transaction(async (tx) => {
    let ma = null;
    if (denBu?.phanTramGiam) {
      ma = await tx.maGiamGia.create({
        data: {
          ma: `DB${chuoiNgauNhien(8)}`,
          phanTramGiam: Number(denBu.phanTramGiam),
          giamToiDa: denBu.giamToiDa ? Number(denBu.giamToiDa) : null,
          soLuotToiDa: 1,
          ngayBatDau: sangNgayDb(homNay()),
          ngayKetThuc: sangNgayDb(congNgay(homNay(), 30)),
        },
      });
    }
    const noiDungLuu = ma ? `${nd}\nMã đền bù: ${ma.ma} (giảm ${ma.phanTramGiam}%, dùng đến ${congNgay(homNay(), 30)})` : nd;
    await tx.khieuNai.update({
      where: { id: k.id },
      data: { trangThai: 'DA_GIAI_QUYET', quanLyId: ql.id, noiDungXuLy: noiDungLuu, thoiGianXuLy: bayGio() },
    });
    await ghiNhatKy(ql.id, 'XU_LY_KHIEU_NAI', 'khieu_nai', k.id, { denBu: ma?.ma ?? null }, tx);
    return { ma, noiDungLuu };
  });
  // «include» Gửi phản hồi cho khách qua Dịch vụ SMS/Email
  notificationSender.guiKhachCuaDon(k.danhGia.donDatSan, `Phản hồi khiếu nại đơn ${k.danhGia.donDatSan.maDon}: ${kq.noiDungLuu}`);
  return { daGiaiQuyet: true, maDenBu: kq.ma?.ma ?? null };
}

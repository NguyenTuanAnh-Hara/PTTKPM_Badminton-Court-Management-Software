// BaoCaoService – phân hệ UC07 Báo cáo & Thống kê (QT-28, QT-29)
import ExcelJS from 'exceljs';
import prisma from '../config/prisma.js';
import { thanhToanRepository } from '../repositories/thanhToanRepository.js';
import { khungGioRepository } from '../repositories/khungGioRepository.js';
import { TRANG_THAI_DA_BAN } from './rules/trangThaiDon.js';
import { chuoiGio, congNgay, laNgayHopLe, ngayCua, sangNgayDb, soNgayGiua, thoiDiem, thuCuaNgay } from '../utils/thoiGian.js';
import { soTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

const NGUON = ['tienSan', 'thietBi', 'doUongDichVu', 'hocPhi', 'phiThanhVien', 'banGoiGio'];
export const TEN_NGUON = {
  tienSan: 'Tiền sân', thietBi: 'Thuê thiết bị', doUongDichVu: 'Đồ uống / dịch vụ', hocPhi: 'Học phí HLV',
  phiThanhVien: 'Phí thành viên', banGoiGio: 'Bán gói giờ',
};

function kiemTraKhoang(tuNgay, denNgay) {
  if (!laNgayHopLe(tuNgay) || !laNgayHopLe(denNgay) || tuNgay > denNgay) throw loi.duLieu('Khoảng thời gian không hợp lệ');
  if (soNgayGiua(tuNgay, denNgay) > 366) throw loi.duLieu('Khoảng thời gian tối đa 12 tháng');
}

const khoaKy = (ngay, nhomTheo) => {
  if (nhomTheo === 'thang') return ngay.slice(0, 7);
  if (nhomTheo === 'tuan') {
    const t = thuCuaNgay(ngay);
    return congNgay(ngay, t === 0 ? -6 : 1 - t); // thứ Hai đầu tuần
  }
  return ngay;
};

/** Chia số tiền của một giao dịch đặt sân theo cơ cấu đơn: sân / thiết bị / đồ uống – dịch vụ / học phí */
function chiaTheoNguon(t) {
  const kq = Object.fromEntries(NGUON.map((n) => [n, 0]));
  const tien = soTien(t.soTien);
  if (t.mucDich === 'GOI_THANH_VIEN') kq.phiThanhVien = tien;
  else if (t.mucDich === 'MUA_GOI_GIO') kq.banGoiGio = tien;
  else {
    const d = t.donDatSan;
    const san = d.chiTiet.reduce((s, c) => s + soTien(c.donGia), 0);
    let tb = 0;
    let du = 0;
    for (const x of d.chiTietDichVu) {
      const v = x.soLuong * soTien(x.donGia);
      if (x.dichVu.loai === 'THIET_BI') tb += v;
      else du += v;
    }
    const hp = d.buoiHoc.reduce((s, b) => s + soTien(b.hocPhi), 0);
    const tong = san + tb + du + hp;
    if (!tong) kq.tienSan = tien;
    else {
      kq.thietBi = Math.round((tien * tb) / tong);
      kq.doUongDichVu = Math.round((tien * du) / tong);
      kq.hocPhi = Math.round((tien * hp) / tong);
      kq.tienSan = tien - kq.thietBi - kq.doUongDichVu - kq.hocPhi;
    }
  }
  return kq;
}

async function tongDoanhThu(tuNgay, denNgay, nhomTheo = 'ngay') {
  const ds = await thanhToanRepository.findThanhCongTrongKhoang(thoiDiem(tuNgay, '00:00'), thoiDiem(congNgay(denNgay, 1), '00:00'));
  const theoNguon = Object.fromEntries(NGUON.map((n) => [n, 0]));
  const theoKy = new Map();
  let tong = 0;
  let soGiaoDich = 0;
  for (const t of ds) {
    // QT-28: không tính phần trả bằng gói giờ (đã ghi nhận khi bán gói) và điểm thưởng
    if (t.phuongThuc === 'GOI_GIO' || t.phuongThuc === 'DIEM_THUONG') continue;
    if (t.mucDich === 'DAT_SAN' && !t.donDatSan) continue;
    const dau = t.loai === 'THANH_TOAN' ? 1 : -1;
    const chia = chiaTheoNguon(t);
    const k = khoaKy(ngayCua(t.thoiGian), nhomTheo);
    if (!theoKy.has(k)) theoKy.set(k, { ky: k, tong: 0, ...Object.fromEntries(NGUON.map((n) => [n, 0])) });
    const dong = theoKy.get(k);
    for (const n of NGUON) {
      theoNguon[n] += dau * chia[n];
      dong[n] += dau * chia[n];
    }
    dong.tong += dau * soTien(t.soTien);
    tong += dau * soTien(t.soTien);
    soGiaoDich++;
  }
  return { tong, theoNguon, theoKy: [...theoKy.values()].sort((a, b) => a.ky.localeCompare(b.ky)), soGiaoDich };
}

/** «extend» Thống kê doanh thu theo nguồn, so sánh với kỳ trước */
export async function doanhThu({ tuNgay, denNgay, nhomTheo = 'ngay' }) {
  kiemTraKhoang(tuNgay, denNgay);
  const kq = await tongDoanhThu(tuNgay, denNgay, nhomTheo);
  const soNgay = soNgayGiua(tuNgay, denNgay) + 1;
  const truoc = await tongDoanhThu(congNgay(tuNgay, -soNgay), congNgay(tuNgay, -1));
  return {
    tuNgay, denNgay, nhomTheo, ...kq,
    kyTruoc: { tuNgay: congNgay(tuNgay, -soNgay), denNgay: congNgay(tuNgay, -1), tong: truoc.tong },
    tenNguon: TEN_NGUON,
  };
}

/** «extend» Thống kê tỷ lệ lấp đầy: bản đồ nhiệt sân × khung giờ, 5 khung cao điểm */
export async function lapDay({ tuNgay, denNgay }) {
  kiemTraKhoang(tuNgay, denNgay);
  const soNgay = soNgayGiua(tuNgay, denNgay) + 1;
  const dsKhung = await khungGioRepository.findAll();
  const dsSan = await prisma.san.findMany({ where: { trangThai: 'HOAT_DONG' }, orderBy: { id: 'asc' } }); // QT-29: không tính sân bảo trì / ngừng
  const ct = await prisma.chiTietDatSan.findMany({
    where: {
      sanId: { in: dsSan.map((s) => s.id) },
      ngayChoi: { gte: sangNgayDb(tuNgay), lte: sangNgayDb(denNgay) },
      conHieuLuc: 1, // khung đã trả lại (đơn không đến, đổi lịch, sự cố) không tính, tránh đếm trùng khi khung được bán lại
      donDatSan: { trangThai: { in: TRANG_THAI_DA_BAN } },
    },
    select: { sanId: true, khungGioId: true },
  });
  const dem = new Map();
  for (const c of ct) dem.set(`${c.sanId}-${c.khungGioId}`, (dem.get(`${c.sanId}-${c.khungGioId}`) ?? 0) + 1);
  const theoKhung = dsKhung.map((k) => {
    const daBan = dsSan.reduce((s, sn) => s + (dem.get(`${sn.id}-${k.id}`) ?? 0), 0);
    const khaDung = dsSan.length * soNgay;
    return { khungGioId: k.id, khung: `${chuoiGio(k.gioBatDau)}–${chuoiGio(k.gioKetThuc)}`, daBan, khaDung, tyLe: khaDung ? daBan / khaDung : 0 };
  });
  const tongBan = theoKhung.reduce((s, k) => s + k.daBan, 0);
  const tongKhaDung = dsSan.length * dsKhung.length * soNgay;
  return {
    tuNgay, denNgay, soNgay,
    tyLeChung: tongKhaDung ? tongBan / tongKhaDung : 0,
    khungGio: dsKhung.map((k) => `${chuoiGio(k.gioBatDau)}`),
    banDoNhiet: dsSan.map((s) => ({
      sanId: s.id, tenSan: s.tenSan,
      tyLe: dsKhung.map((k) => (dem.get(`${s.id}-${k.id}`) ?? 0) / soNgay),
    })),
    theoKhung,
    caoDiem: [...theoKhung].sort((a, b) => b.tyLe - a.tyLe).slice(0, 5),
  };
}

/** «extend» Xuất báo cáo ra tệp Excel */
export async function xuatExcel({ tuNgay, denNgay, nhomTheo = 'ngay' }) {
  const dt = await doanhThu({ tuNgay, denNgay, nhomTheo });
  const ld = await lapDay({ tuNgay, denNgay });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'He thong quan ly san cau long';

  const s1 = wb.addWorksheet('Doanh thu');
  s1.addRow([`Báo cáo doanh thu từ ${tuNgay} đến ${denNgay}`]).font = { bold: true, size: 13 };
  s1.addRow([]);
  s1.addRow(['Kỳ', 'Tổng', ...NGUON.map((n) => TEN_NGUON[n])]).font = { bold: true };
  for (const r of dt.theoKy) s1.addRow([r.ky, r.tong, ...NGUON.map((n) => r[n])]);
  s1.addRow(['Tổng cộng', dt.tong, ...NGUON.map((n) => dt.theoNguon[n])]).font = { bold: true };
  s1.addRow(['Kỳ trước', dt.kyTruoc.tong]);
  s1.columns.forEach((c, i) => { c.width = i === 0 ? 14 : 18; if (i) c.numFmt = '#,##0'; });

  const s2 = wb.addWorksheet('Ty le lap day');
  s2.addRow([`Tỷ lệ lấp đầy từ ${tuNgay} đến ${denNgay}: ${(ld.tyLeChung * 100).toFixed(1)}%`]).font = { bold: true, size: 13 };
  s2.addRow([]);
  s2.addRow(['Sân', ...ld.khungGio]).font = { bold: true };
  for (const r of ld.banDoNhiet) s2.addRow([r.tenSan, ...r.tyLe.map((x) => Math.round(x * 1000) / 10)]);
  s2.addRow([]);
  s2.addRow(['5 khung giờ cao điểm']).font = { bold: true };
  for (const k of ld.caoDiem) s2.addRow([k.khung, `${(k.tyLe * 100).toFixed(1)}%`]);
  s2.getColumn(1).width = 22;

  return wb.xlsx.writeBuffer();
}

/** A1 – xem chi tiết: các giao dịch tạo nên số liệu của một ngày */
export async function giaoDichTrongNgay(ngay) {
  if (!laNgayHopLe(ngay)) throw loi.duLieu('Ngày không hợp lệ');
  const ds = await thanhToanRepository.findThanhCongTrongKhoang(thoiDiem(ngay, '00:00'), thoiDiem(congNgay(ngay, 1), '00:00'));
  return ds.map((t) => ({
    maGiaoDich: `TT${t.id}`, thoiGian: t.thoiGian, loai: t.loai, mucDich: t.mucDich, phuongThuc: t.phuongThuc,
    soTien: soTien(t.soTien), maDon: t.donDatSan?.maDon ?? null,
  }));
}

// Các phép tính dùng chung cho đơn đặt sân: tổng hợp tiền, bảng tính tiền, chuyển sang DTO
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { GiaCalculator, heSoTruGio, tinhBangTien } from './rules/giaCalculator.js';
import { hangConHieuLuc } from './rules/diemThuongPolicy.js';
import { TEN_TRANG_THAI, TRANG_THAI_CON_HIEU_LUC } from './rules/trangThaiDon.js';
import { tyLeHoan, heSoHoan } from './rules/hoanTienPolicy.js';
import { chuoiGio, chuoiNgay, homNay, thoiDiem, congNgay, bayGio } from '../utils/thoiGian.js';
import { soTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

/** Các chi tiết sân đang được tính tiền của đơn */
export function chiTietTinhTien(don) {
  if (TRANG_THAI_CON_HIEU_LUC.includes(don.trangThai) || don.trangThai === 'DA_HOAN_THANH') {
    return don.chiTiet.filter((c) => c.conHieuLuc === 1);
  }
  return don.chiTiet; // đơn đã kết thúc: hiển thị toàn bộ
}

/** Thời điểm bắt đầu khung đầu tiên và kết thúc khung cuối cùng của đơn */
export function khoangThoiGian(don) {
  const ds = chiTietTinhTien(don);
  if (!ds.length) return { batDau: null, ketThuc: null };
  let batDau = null;
  let ketThuc = null;
  for (const c of ds) {
    const ngay = chuoiNgay(c.ngayChoi);
    const bd = thoiDiem(ngay, chuoiGio(c.khungGio.gioBatDau));
    const kt = thoiDiem(ngay, chuoiGio(c.khungGio.gioKetThuc));
    if (!batDau || bd < batDau) batDau = bd;
    if (!ketThuc || kt > ketThuc) ketThuc = kt;
  }
  return { batDau, ketThuc };
}

/** Tổng hợp các khoản tiền của đơn từ dữ liệu đầy đủ (INCLUDE_DON) */
export function tongHopDon(don) {
  const tienSan = chiTietTinhTien(don).reduce((s, c) => s + soTien(c.donGia), 0);
  let tienDichVuChuaGiao = 0;
  let tienDichVuDaGiao = 0;
  for (const d of don.chiTietDichVu) {
    const tien = d.soLuong * soTien(d.donGia);
    if (d.trangThai === 'DA_DAT') tienDichVuChuaGiao += tien;
    else tienDichVuDaGiao += tien;
  }
  const hocPhi = don.buoiHoc.filter((b) => b.trangThai !== 'DA_HUY').reduce((s, b) => s + soTien(b.hocPhi), 0);

  // Số tiền thực thu theo từng kênh (QT-12), đã trừ các lần hoàn
  const kenh = new Map();
  let daThanhToan = 0;
  for (const t of don.thanhToan) {
    if (t.trangThai !== 'THANH_CONG') continue;
    const dau = t.loai === 'THANH_TOAN' ? 1 : -1;
    const khoa = `${t.phuongThuc}|${t.goiGioChoiId ?? ''}`;
    const k = kenh.get(khoa) ?? { phuongThuc: t.phuongThuc, goiGioChoiId: t.goiGioChoiId, soTien: 0, soDiem: 0, giaoDichGoc: null };
    k.soTien += dau * soTien(t.soTien);
    if (t.phuongThuc === 'DIEM_THUONG') k.soDiem += dau * (t.soDiemSuDung ?? 0);
    if (t.loai === 'THANH_TOAN' && !k.giaoDichGoc) k.giaoDichGoc = t;
    kenh.set(khoa, k);
    daThanhToan += dau * soTien(t.soTien);
  }
  return {
    tienSan,
    tienDichVu: tienDichVuChuaGiao + tienDichVuDaGiao,
    tienDichVuChuaGiao,
    tienDichVuDaGiao,
    hocPhi,
    daThanhToan,
    kenh: [...kenh.values()].filter((k) => k.soTien > 0),
  };
}

/** Thông tin khách phục vụ tính ưu đãi: hạng còn hiệu lực, điểm hiện có */
export async function thongTinKhach(khachHangId, db = prisma) {
  if (!khachHangId) return null;
  const kh = await db.khachHang.findUnique({ where: { nguoiDungId: khachHangId }, include: { goiThanhVien: true } });
  if (!kh) return null;
  const hanThanhVien = chuoiNgay(kh.hanThanhVien);
  const conHang = hangConHieuLuc({ goiThanhVienId: kh.goiThanhVienId, hanThanhVien }, homNay());
  return {
    ...kh,
    hanThanhVien,
    conHang,
    phanTramHang: conHang ? kh.goiThanhVien.phanTramGiam : 0,
    heSoTichDiem: conHang ? Number(kh.goiThanhVien.heSoTichDiem) : 1,
  };
}

/** Kiểm tra mã giảm giá còn dùng được (UC03.1 – E3) */
export async function kiemTraMaGiamGia(ma, db = prisma) {
  const m = await db.maGiamGia.findUnique({ where: { ma: String(ma).trim().toUpperCase() } });
  if (!m) throw loi.viPham('MA_GIAM_GIA_KHONG_HOP_LE', 'Mã giảm giá không tồn tại');
  const hn = homNay();
  if (chuoiNgay(m.ngayBatDau) > hn) throw loi.viPham('MA_GIAM_GIA_KHONG_HOP_LE', 'Mã giảm giá chưa đến ngày áp dụng');
  if (chuoiNgay(m.ngayKetThuc) < hn) throw loi.viPham('MA_GIAM_GIA_KHONG_HOP_LE', 'Mã giảm giá đã hết hạn');
  if (m.soLuotDaDung >= m.soLuotToiDa) throw loi.viPham('MA_GIAM_GIA_KHONG_HOP_LE', 'Mã giảm giá đã hết lượt sử dụng');
  return m;
}

/** Gói giờ / thẻ trả trước của khách còn dùng được */
export async function kiemTraGoiGio(goiGioChoiId, khachHangId, db = prisma) {
  const g = await db.goiGioChoi.findUnique({ where: { id: Number(goiGioChoiId) }, include: { loaiGoiGio: true } });
  if (!g || g.khachHangId !== khachHangId) throw loi.viPham('GOI_GIO_KHONG_HOP_LE', 'Gói giờ không thuộc tài khoản của bạn');
  if (chuoiNgay(g.hanSuDung) < homNay()) throw loi.viPham('GOI_GIO_KHONG_HOP_LE', 'Gói giờ đã hết hạn sử dụng');
  const soGio = Number(g.soGioConLai ?? 0);
  const soDu = soTien(g.soDuConLai);
  if ((g.loaiGoiGio.loai === 'GOI_GIO' && soGio <= 0) || (g.loaiGoiGio.loai === 'THE_TRA_TRUOC' && soDu <= 0)) {
    throw loi.viPham('GOI_GIO_KHONG_HOP_LE', 'Gói giờ đã dùng hết');
  }
  return { ...g, loai: g.loaiGoiGio.loai, soGioConLai: soGio, soDuConLai: soDu };
}

/** Các khung sân dùng để trừ gói giờ, kèm số giờ bị trừ mỗi khung (QT-23) */
export async function khungChoGoi(don, db = prisma) {
  const gc = new GiaCalculator(db);
  const loaiTheoNgay = new Map();
  const ds = [];
  for (const c of chiTietTinhTien(don)) {
    const ngay = chuoiNgay(c.ngayChoi);
    if (!loaiTheoNgay.has(ngay)) loaiTheoNgay.set(ngay, await gc.loaiNgay(ngay));
    ds.push({ donGia: soTien(c.donGia), heSo: heSoTruGio(chuoiGio(c.khungGio.gioBatDau), loaiTheoNgay.get(ngay)) });
  }
  return ds;
}

/**
 * Bảng tính tiền của đơn (UC03.1 bước 2–3). Mã giảm giá đã gắn vào đơn và đã được dùng ở lần
 * thanh toán trước thì giữ nguyên; điểm và gói giờ chỉ áp dụng cho phần còn phải trả.
 */
export async function bangTinhTienDon(don, { maGiamGia, soDiem, goiGioChoiId } = {}, db = prisma) {
  const th = tongHopDon(don);
  const khach = await thongTinKhach(don.khachHangId, db);
  let ma = null;
  if (don.maGiamGiaId && th.daThanhToan > 0) {
    ma = don.maGiamGia;
  } else if (maGiamGia) {
    ma = await kiemTraMaGiamGia(maGiamGia, db);
  }
  let goi = null;
  if (goiGioChoiId) {
    if (!don.khachHangId) throw loi.viPham('GOI_GIO_KHONG_HOP_LE', 'Khách không có tài khoản không dùng được gói giờ');
    goi = await kiemTraGoiGio(goiGioChoiId, don.khachHangId, db);
  }
  if (soDiem && !khach) throw loi.viPham('DIEM_KHONG_HOP_LE', 'Khách không có tài khoản không dùng được điểm thưởng');
  const bang = tinhBangTien({
    tienSan: th.tienSan,
    tienDichVu: th.tienDichVu,
    hocPhi: th.hocPhi,
    phanTramHang: khach?.phanTramHang ?? 0,
    ma: ma ? { phanTramGiam: ma.phanTramGiam, giamToiDa: ma.giamToiDa === null ? null : soTien(ma.giamToiDa) } : null,
    daThanhToan: th.daThanhToan,
    soDiem: Number(soDiem) || 0,
    diemHienCo: khach?.diemThuong ?? 0,
    goi,
    khungChoGoi: goi?.loai === 'GOI_GIO' ? await khungChoGoi(don, db) : [],
  });
  return {
    bang: { ...bang, maGiamGia: ma?.ma ?? null, tenHang: khach?.conHang ? khach.goiThanhVien.tenGoi : null, diemHienCo: khach?.diemThuong ?? 0 },
    ma,
    goi,
    khach,
  };
}

/** Tính lại cột tong_tien (tổng sân + dịch vụ + học phí sau ưu đãi hạng và mã) */
export async function capNhatTongTien(donId, db) {
  const don = await db.donDatSan.findUnique({
    where: { id: donId },
    include: { chiTiet: true, chiTietDichVu: true, buoiHoc: true, thanhToan: true, maGiamGia: true },
  });
  const th = tongHopDon(don);
  const khach = await thongTinKhach(don.khachHangId, db);
  const bang = tinhBangTien({
    tienSan: th.tienSan,
    tienDichVu: th.tienDichVu,
    hocPhi: th.hocPhi,
    phanTramHang: khach?.phanTramHang ?? 0,
    ma: don.maGiamGia ? { phanTramGiam: don.maGiamGia.phanTramGiam, giamToiDa: don.maGiamGia.giamToiDa === null ? null : soTien(don.maGiamGia.giamToiDa) } : null,
  });
  await db.donDatSan.update({ where: { id: donId }, data: { tongTien: bang.tongSauGiam } });
  return bang.tongSauGiam;
}

/** Số tiền dự kiến hoàn nếu hủy ngay lúc này (UC02.3 bước 4) */
export function duKienHoan(don, doPhiaSan = false) {
  if (don.trangThai === 'CHO_THANH_TOAN') return { duocHuy: true, soTienHoan: 0, ghiChu: 'Đơn chưa thanh toán, hủy không mất phí' };
  if (don.trangThai !== 'DA_XAC_NHAN') return { duocHuy: false, soTienHoan: 0, lyDo: 'Đơn ở trạng thái này không thể hủy' };
  const { batDau } = khoangThoiGian(don);
  const soGio = (batDau - bayGio()) / 3600000;
  const tyLe = tyLeHoan(soGio, doPhiaSan);
  if (!tyLe.duocHuy) return { duocHuy: false, soTienHoan: 0, lyDo: tyLe.lyDo };
  const th = tongHopDon(don);
  const f = heSoHoan(th, tyLe);
  const tienKenh = th.kenh.filter((k) => k.phuongThuc !== 'DIEM_THUONG');
  const soTienHoan = tienKenh.reduce((s, k) => s + (f >= 1 ? k.soTien : Math.floor(k.soTien * f)), 0);
  const diemHoan = th.kenh.filter((k) => k.phuongThuc === 'DIEM_THUONG').reduce((s, k) => s + k.soDiem, 0);
  return {
    duocHuy: true,
    soTienHoan,
    diemHoan,
    tyLeSan: tyLe.tyLeSan,
    ghiChu: tyLe.tyLeSan < 1 ? `Hủy trước giờ chơi dưới ${thamSo.GIO_HOAN_TOAN_BO} giờ: hoàn ${thamSo.PHAN_TRAM_HOAN_SAN}% tiền sân` : 'Hoàn 100% số tiền đã trả',
  };
}

/** DonDatSanDTO – dữ liệu đơn trả ra giao diện, không chứa id nội bộ của bảng khác */
export function sangDTO(don, { xemNoiBo = false } = {}) {
  const th = tongHopDon(don);
  const { batDau, ketThuc } = khoangThoiGian(don);
  const tong = soTien(don.tongTien);
  const conPhaiThu = Math.max(0, tong - th.daThanhToan) < 1000 ? 0 : tong - th.daThanhToan;
  const now = bayGio();
  const conGio = batDau ? (batDau - now) / 3600000 : 0;
  const ketThucNgay = ketThuc ? congNgay(chuoiNgay(new Date(ketThuc.getTime() + 7 * 3600000)), thamSo.SO_NGAY_DUOC_DANH_GIA) : null;
  return {
    maDon: don.maDon,
    trangThai: don.trangThai,
    tenTrangThai: TEN_TRANG_THAI[don.trangThai],
    kenhDat: don.kenhDat,
    ngayTao: don.ngayTao,
    hanGiuCho: don.hanGiuCho,
    thoiGianCheckIn: don.thoiGianCheckIn,
    laDinhKy: Boolean(don.lichDinhKyId),
    soLanDoiLich: don.soLanDoiLich,
    khach: don.khachHang
      ? { hoTen: don.khachHang.nguoiDung.hoTen, soDienThoai: don.khachHang.nguoiDung.soDienThoai, coTaiKhoan: true }
      : { hoTen: don.hoTenKhach, soDienThoai: don.sdtKhach, coTaiKhoan: false },
    batDau,
    ketThuc,
    chiTiet: chiTietTinhTien(don).map((c) => ({
      id: c.id,
      sanId: c.sanId,
      tenSan: c.san.tenSan,
      ngayChoi: chuoiNgay(c.ngayChoi),
      khungGioId: c.khungGioId,
      gioBatDau: chuoiGio(c.khungGio.gioBatDau),
      gioKetThuc: chuoiGio(c.khungGio.gioKetThuc),
      donGia: soTien(c.donGia),
    })),
    dichVu: don.chiTietDichVu.map((d) => ({
      id: d.id,
      tenDichVu: d.dichVu.tenDichVu,
      loai: d.dichVu.loai,
      soLuong: d.soLuong,
      donGia: soTien(d.donGia),
      thanhTien: d.soLuong * soTien(d.donGia),
      tienCoc: soTien(d.tienCoc),
      trangThai: d.trangThai,
    })),
    buoiHoc: don.buoiHoc.map((b) => ({
      id: b.id,
      hlv: b.hlv.nguoiDung.hoTen,
      ngay: chuoiNgay(b.ngay),
      gioBatDau: chuoiGio(b.gioBatDau),
      gioKetThuc: chuoiGio(b.gioKetThuc),
      hocPhi: soTien(b.hocPhi),
      trangThai: b.trangThai,
    })),
    thanhToan: don.thanhToan
      .filter((t) => xemNoiBo || t.trangThai !== 'CHO_XU_LY')
      .map((t) => ({
        maGiaoDich: `TT${t.id}`,
        loai: t.loai,
        phuongThuc: t.phuongThuc,
        soTien: soTien(t.soTien),
        soDiem: t.soDiemSuDung,
        trangThai: t.trangThai,
        thoiGian: t.thoiGian,
        maHoaDon: t.hoaDon?.maHoaDon ?? null,
      })),
    tienSan: th.tienSan,
    tienDichVu: th.tienDichVu,
    hocPhi: th.hocPhi,
    maGiamGia: don.maGiamGia?.ma ?? null,
    tongTien: tong,
    daThanhToan: th.daThanhToan,
    conPhaiThu,
    coTheThanhToan: ['CHO_THANH_TOAN', 'DA_XAC_NHAN', 'DANG_SU_DUNG'].includes(don.trangThai) && conPhaiThu > 0,
    coTheHuy: (don.trangThai === 'CHO_THANH_TOAN') || (don.trangThai === 'DA_XAC_NHAN' && conGio >= thamSo.GIO_HUY_TOI_THIEU),
    coTheDoiLich: don.trangThai === 'DA_XAC_NHAN' && conGio >= thamSo.GIO_HUY_TOI_THIEU && don.soLanDoiLich < thamSo.SO_LAN_DOI_LICH_TOI_DA && !don.lichDinhKyId,
    coTheThemDichVu: ['CHO_THANH_TOAN', 'DA_XAC_NHAN'].includes(don.trangThai) && conGio > 0,
    coTheDanhGia: don.trangThai === 'DA_HOAN_THANH' && Boolean(don.khachHangId) && !don.danhGia && ketThucNgay >= homNay(),
    danhGia: don.danhGia
      ? {
          soSao: don.danhGia.soSao,
          noiDung: don.danhGia.noiDung,
          thoiGian: don.danhGia.thoiGian,
          khieuNai: don.danhGia.khieuNai
            ? { trangThai: don.danhGia.khieuNai.trangThai, noiDungXuLy: don.danhGia.khieuNai.noiDungXuLy }
            : null,
        }
      : null,
  };
}

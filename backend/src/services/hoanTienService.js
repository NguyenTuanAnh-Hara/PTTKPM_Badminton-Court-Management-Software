// Hoàn tiền về đúng kênh đã thanh toán (QT-12) – «include» Hoàn tiền của UC02.4, UC02.5, UC05.4
import { vnpayGateway } from '../agents/vnpayGateway.js';
import { phanBoHoan } from './rules/hoanTienPolicy.js';
import { tongHopDon, chiTietTinhTien } from './donTinhToan.js';
import { GiaCalculator, heSoTruGio } from './rules/giaCalculator.js';
import { chuoiGio, chuoiNgay } from '../utils/thoiGian.js';
import { soTien } from '../utils/tien.js';

/** Số giờ đã trừ của gói khi thanh toán soTienGoi cho đơn (tính lại theo cách trừ của QT-23) */
async function gioDaTruCuaGoi(don, soTienGoi, db) {
  const gc = new GiaCalculator(db);
  let tong = 0;
  let gio = 0;
  for (const c of chiTietTinhTien(don)) {
    if (tong >= soTienGoi) break;
    const ngay = chuoiNgay(c.ngayChoi);
    gio += heSoTruGio(chuoiGio(c.khungGio.gioBatDau), await gc.loaiNgay(ngay));
    tong += soTien(c.donGia);
  }
  return gio;
}

/**
 * Hoàn theo hệ số f (0…1) trên số tiền thực thu của từng kênh. Điểm thưởng đã dùng luôn được trả lại đủ (QT-11).
 * Phải gọi trong transaction (db = tx) và với đơn đã nạp đầy đủ (INCLUDE_DON) TRƯỚC khi thay đổi chi tiết.
 * @returns {{ tongHoan: number, diemHoan: number, dong: Array }}
 */
export async function hoanTienDon(db, don, f, { nhanVienId = null, traDiem = true } = {}) {
  const th = tongHopDon(don);
  const tienKenh = th.kenh.filter((k) => k.phuongThuc !== 'DIEM_THUONG');
  const dsHoan = phanBoHoan(tienKenh, f);
  const dong = [];
  let tongHoan = 0;
  for (const k of dsHoan) {
    let trangThai = 'THANH_CONG';
    let ghiChu = '';
    if (k.phuongThuc === 'VNPAY') {
      const kq = await vnpayGateway.hoanTien(k.giaoDichGoc, k.soTienHoan);
      trangThai = kq.thanhCong ? 'THANH_CONG' : 'CHO_XU_LY';
      ghiChu = kq.ghiChu;
    } else if (k.phuongThuc === 'GOI_GIO' && k.goiGioChoiId) {
      const goi = await db.goiGioChoi.findUnique({ where: { id: k.goiGioChoiId }, include: { loaiGoiGio: true } });
      if (goi.loaiGoiGio.loai === 'GOI_GIO') {
        const gioDaTru = await gioDaTruCuaGoi(don, k.soTien, db);
        const gioHoan = Math.round(gioDaTru * (k.soTienHoan / k.soTien) * 10) / 10;
        await db.goiGioChoi.update({ where: { id: goi.id }, data: { soGioConLai: { increment: gioHoan } } });
        ghiChu = `Cộng lại ${gioHoan} giờ vào gói`;
      } else {
        await db.goiGioChoi.update({ where: { id: goi.id }, data: { soDuConLai: { increment: k.soTienHoan } } });
        ghiChu = `Cộng lại ${k.soTienHoan} đ vào thẻ trả trước`;
      }
    } else {
      ghiChu = 'Lễ tân hoàn tại quầy';
    }
    await db.thanhToan.create({
      data: {
        khachHangId: don.khachHangId,
        mucDich: 'DAT_SAN',
        donDatSanId: don.id,
        goiGioChoiId: k.goiGioChoiId ?? null,
        nhanVienThuId: nhanVienId,
        loai: 'HOAN_TIEN',
        phuongThuc: k.phuongThuc,
        soTien: k.soTienHoan,
        trangThai,
      },
    });
    tongHoan += k.soTienHoan;
    dong.push({ phuongThuc: k.phuongThuc, soTien: k.soTienHoan, ghiChu });
  }

  let diemHoan = 0;
  if (traDiem && don.khachHangId) {
    for (const k of th.kenh.filter((x) => x.phuongThuc === 'DIEM_THUONG')) {
      diemHoan += k.soDiem;
      await db.thanhToan.create({
        data: {
          khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'HOAN_TIEN',
          phuongThuc: 'DIEM_THUONG', soDiemSuDung: k.soDiem, soTien: k.soTien, trangThai: 'THANH_CONG',
        },
      });
    }
    if (diemHoan > 0) {
      await db.khachHang.update({ where: { nguoiDungId: don.khachHangId }, data: { diemThuong: { increment: diemHoan } } });
    }
  }
  return { tongHoan, diemHoan, dong };
}

/** Hoàn phần đã trả vượt tổng tiền mới của đơn (bỏ bớt dịch vụ, đổi sang lịch rẻ hơn, hủy buổi học) */
export async function hoanPhanDuThua(db, donTruoc, tongTienMoi, opts = {}) {
  const th = tongHopDon(donTruoc);
  const tienDaTra = th.kenh.filter((k) => k.phuongThuc !== 'DIEM_THUONG').reduce((s, k) => s + k.soTien, 0);
  const duThua = th.daThanhToan - tongTienMoi;
  if (duThua < 1000 || tienDaTra <= 0) return { tongHoan: 0, diemHoan: 0, dong: [] };
  const f = Math.min(1, duThua / tienDaTra);
  return hoanTienDon(db, donTruoc, f, { ...opts, traDiem: false });
}

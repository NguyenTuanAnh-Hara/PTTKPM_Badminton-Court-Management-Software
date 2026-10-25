// GiaCalculator – cài đặt QT-07 → QT-10, QT-22, QT-23 (Hình 4.8)
import prisma from '../../config/prisma.js';
import thamSo from '../../config/thamSo.js';
import { chuoiGio, chuoiNgay, sangNgayDb, thuCuaNgay } from '../../utils/thoiGian.js';
import { lamTronNghin, soTien } from '../../utils/tien.js';
import { loi } from '../../utils/errors.js';

// ---------- Hàm thuần (không truy cập CSDL), được kiểm thử ở test/rules.test.js ----------

/** QT-07: Ngày lễ > Cuối tuần > Ngày thường */
export function xacDinhLoaiNgay(ngay, tapNgayLe) {
  if (tapNgayLe.has(ngay)) return 'NGAY_LE';
  const thu = thuCuaNgay(ngay);
  return thu === 0 || thu === 6 ? 'CUOI_TUAN' : 'NGAY_THUONG';
}

/** QT-08: khung giá cùng loại ngày, đang hiệu lực vào ngày chơi, có [bắt đầu, kết thúc) chứa giờ bắt đầu của khung */
export function timKhungGia(dsKhungGia, ngay, loaiNgay, gioBatDau) {
  return (
    dsKhungGia.find(
      (k) =>
        k.loaiNgay === loaiNgay &&
        k.apDungTu <= ngay &&
        (k.apDungDen === null || k.apDungDen >= ngay) &&
        k.gioBatDau <= gioBatDau &&
        gioBatDau < k.gioKetThuc,
    ) ?? null
  );
}

/** QT-23: số giờ bị trừ của một khung khi trả bằng gói giờ */
export function heSoTruGio(gioBatDau, loaiNgay) {
  const h = Number(gioBatDau.slice(0, 2));
  const caoDiem = h >= thamSo.GIO_CAO_DIEM_TU && h < thamSo.GIO_CAO_DIEM_DEN;
  return loaiNgay === 'NGAY_THUONG' && !caoDiem ? 1 : thamSo.HE_SO_TRU_GIO_CAO_DIEM;
}

/**
 * QT-09, QT-10, QT-22, QT-23: bảng tính tiền của một đơn.
 * - daThanhToan: số tiền đã thanh toán thành công trước đó (mọi phương thức, đã trừ hoàn tiền)
 * - khungChoGoi: [{ donGia, heSo }] các khung sân, dùng khi trả bằng gói giờ
 */
export function tinhBangTien({
  tienSan, tienDichVu = 0, hocPhi = 0, phanTramHang = 0, ma = null,
  daThanhToan = 0, soDiem = 0, diemHienCo = 0, goi = null, khungChoGoi = [],
}) {
  const tamTinh = tienSan + tienDichVu + hocPhi;
  const giamHang = Math.floor((tienSan * phanTramHang) / 100);
  const sauHang = tamTinh - giamHang;
  let giamMa = 0;
  if (ma) {
    giamMa = Math.floor((sauHang * ma.phanTramGiam) / 100);
    if (ma.giamToiDa !== null && ma.giamToiDa !== undefined) giamMa = Math.min(giamMa, ma.giamToiDa);
  }
  const tongSauGiam = sauHang - giamMa;
  let conLai = tongSauGiam - daThanhToan;
  if (conLai < 1000) conLai = 0; // phần lẻ dưới 1.000 đ đã được làm tròn khi thanh toán

  // (3) Điểm thưởng – QT-22
  let truDiem = 0;
  const diemToiDa = Math.floor((conLai * thamSo.PHAN_TRAM_DIEM_TOI_DA) / 100 / thamSo.GIA_TRI_MOT_DIEM / thamSo.BOI_SO_DIEM) * thamSo.BOI_SO_DIEM;
  if (soDiem) {
    if (!Number.isInteger(soDiem) || soDiem < 0 || soDiem % thamSo.BOI_SO_DIEM !== 0) {
      throw loi.viPham('DIEM_KHONG_HOP_LE', `Số điểm phải là bội số của ${thamSo.BOI_SO_DIEM}`);
    }
    if (soDiem > diemHienCo) throw loi.viPham('DIEM_KHONG_HOP_LE', `Bạn chỉ có ${diemHienCo} điểm`);
    if (soDiem > diemToiDa) {
      throw loi.viPham('DIEM_KHONG_HOP_LE', `Đơn này dùng được tối đa ${diemToiDa} điểm (50% số tiền còn lại)`);
    }
    truDiem = soDiem * thamSo.GIA_TRI_MOT_DIEM;
  }
  let sauDiem = conLai - truDiem;

  // (4) Gói giờ / thẻ trả trước – QT-23
  let truGoi = 0;
  let gioSuDung = 0;
  if (goi && sauDiem > 0) {
    if (goi.loai === 'GOI_GIO') {
      let gioCon = goi.soGioConLai;
      for (const k of khungChoGoi) {
        if (sauDiem - truGoi <= 0 || gioCon < k.heSo) break;
        truGoi += Math.min(k.donGia, sauDiem - truGoi);
        gioCon -= k.heSo;
        gioSuDung += k.heSo;
      }
    } else {
      truGoi = Math.min(goi.soDuConLai, sauDiem);
    }
  }
  sauDiem -= truGoi;
  const phaiTra = lamTronNghin(sauDiem);

  return {
    tienSan, tienDichVu, hocPhi, tamTinh, giamHang, giamMa, tongSauGiam,
    daThanhToan, conLai, truDiem, soDiem: soDiem || 0, diemToiDa, truGoi, gioSuDung, phaiTra,
  };
}

// ---------- Phần đọc dữ liệu cấu hình giá từ CSDL ----------

const khungGiaSangPhang = (k) => ({
  id: k.id,
  loaiNgay: k.loaiNgay,
  gioBatDau: chuoiGio(k.gioBatDau),
  gioKetThuc: chuoiGio(k.gioKetThuc),
  apDungTu: chuoiNgay(k.apDungTu),
  apDungDen: chuoiNgay(k.apDungDen),
  donGia: soTien(k.donGia),
});

export class GiaCalculator {
  constructor(db = prisma) {
    this.db = db;
  }

  async loaiNgay(ngay) {
    const le = await this.db.ngayLe.findUnique({ where: { ngay: sangNgayDb(ngay) } });
    return xacDinhLoaiNgay(ngay, new Set(le ? [ngay] : []));
  }

  /** Bảng giá của một ngày: Map(khungGioId → { khungGiaId, donGia, gioBatDau, heSo }) */
  async bangGiaNgay(ngay, dsKhungGio) {
    const loai = await this.loaiNgay(ngay);
    const dsKhungGia = (await this.db.khungGia.findMany({ where: { loaiNgay: loai } })).map(khungGiaSangPhang);
    const bang = new Map();
    for (const kg of dsKhungGio) {
      const bd = chuoiGio(kg.gioBatDau);
      const gia = timKhungGia(dsKhungGia, ngay, loai, bd);
      if (gia) bang.set(kg.id, { khungGiaId: gia.id, donGia: gia.donGia, gioBatDau: bd, heSo: heSoTruGio(bd, loai) });
    }
    return { loaiNgay: loai, bang };
  }

  async donGia(ngay, khungGio) {
    const { bang } = await this.bangGiaNgay(ngay, [khungGio]);
    const g = bang.get(khungGio.id);
    if (!g) throw loi.viPham('CHUA_CO_BANG_GIA', `Chưa có bảng giá cho ngày ${ngay} lúc ${chuoiGio(khungGio.gioBatDau)}`);
    return g;
  }
}

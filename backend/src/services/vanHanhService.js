// VanHanhService – phân hệ UC05 Vận hành sân (lễ tân)
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { donDatSanRepository, INCLUDE_DON } from '../repositories/donDatSanRepository.js';
import { notificationSender } from '../agents/notificationSender.js';
import { chuyenTrangThai, huyDon, kiemTraQuyenDon } from './datSanService.js';
import { khoangThoiGian, sangDTO, chiTietTinhTien, capNhatTongTien, tongHopDon } from './donTinhToan.js';
import { hoanTienDon } from './hoanTienService.js';
import { ghiNhatKy } from './nhatKyService.js';
import { TRANG_THAI_CON_HIEU_LUC } from './rules/trangThaiDon.js';
import { bayGio, homNay, sangNgayDb, chuoiNgay, chuoiGio, thoiDiem, congPhut, hienThiNgay } from '../utils/thoiGian.js';
import { soTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

// ---------------------------------------------------------------- UC05.2 Theo dõi tình trạng sân

export async function tinhTrangSan() {
  const now = bayGio();
  const ngay = homNay();
  const [dsSan, dsDon] = await Promise.all([
    prisma.san.findMany({ where: { trangThai: { not: 'NGUNG_SU_DUNG' } }, orderBy: { id: 'asc' } }),
    prisma.donDatSan.findMany({
      where: { trangThai: { in: TRANG_THAI_CON_HIEU_LUC }, chiTiet: { some: { ngayChoi: sangNgayDb(ngay), conHieuLuc: 1 } } },
      include: INCLUDE_DON,
    }),
  ]);
  const suCo = await prisma.suCo.findMany({ where: { trangThai: 'DANG_XU_LY' }, orderBy: { thoiGianGhiNhan: 'desc' } });

  return {
    thoiDiem: now,
    san: dsSan.map((s) => {
      const buoi = [];
      for (const d of dsDon) {
        const ct = chiTietTinhTien(d).filter((c) => c.sanId === s.id && chuoiNgay(c.ngayChoi) === ngay);
        if (!ct.length) continue;
        const bd = thoiDiem(ngay, chuoiGio(ct[0].khungGio.gioBatDau));
        const kt = thoiDiem(ngay, chuoiGio(ct[ct.length - 1].khungGio.gioKetThuc));
        buoi.push({ don: d, bd, kt });
      }
      buoi.sort((a, b) => a.bd - b.bd);
      const hienTai = buoi.find((b) => b.bd <= now && now < b.kt) ?? null;
      const keTiep = buoi.find((b) => b.bd > now) ?? null;
      let trangThai = 'TRONG';
      if (s.trangThai === 'BAO_TRI') trangThai = 'BAO_TRI';
      else if (hienTai?.don.trangThai === 'DANG_SU_DUNG') trangThai = 'DANG_SU_DUNG';
      else if (hienTai || (keTiep && keTiep.bd - now <= thamSo.PHUT_CHECK_IN_TRUOC * 60000)) trangThai = 'CHO_CHECK_IN';

      const canhBao = [];
      const xet = hienTai ?? keTiep;
      if (xet && xet.don.trangThai === 'DA_XAC_NHAN' && now > xet.bd) {
        const conPhut = Math.ceil((congPhut(xet.bd, thamSo.PHUT_CHECK_IN_SAU) - now) / 60000);
        canhBao.push(`Đơn ${xet.don.maDon} chưa check-in, còn ${Math.max(0, conPhut)} phút trước khi ghi nhận không đến`);
      }
      if (hienTai?.don.trangThai === 'DANG_SU_DUNG' && hienTai.kt - now <= 10 * 60000) canhBao.push('Còn dưới 10 phút là hết giờ');
      if (hienTai) {
        const chuaTra = hienTai.don.chiTietDichVu.filter((x) => x.trangThai === 'DA_GIAO' && x.dichVu.loai === 'THIET_BI');
        if (chuaTra.length && hienTai.kt - now <= 10 * 60000) canhBao.push('Có thiết bị chưa trả');
        const dto = sangDTO(hienTai.don, { xemNoiBo: true });
        if (dto.conPhaiThu > 0) canhBao.push(`Còn phải thu ${dto.conPhaiThu.toLocaleString('vi-VN')} đ`);
      }
      const tom = (b) =>
        b && {
          maDon: b.don.maDon,
          trangThai: b.don.trangThai,
          khach: b.don.khachHang?.nguoiDung.hoTen ?? b.don.hoTenKhach,
          sdt: b.don.khachHang?.nguoiDung.soDienThoai ?? b.don.sdtKhach,
          batDau: b.bd,
          ketThuc: b.kt,
          conLaiPhut: Math.max(0, Math.round((b.kt - now) / 60000)),
        };
      return {
        id: s.id,
        tenSan: s.tenSan,
        loaiSan: s.loaiSan,
        trangThai,
        hienTai: tom(hienTai),
        keTiep: tom(keTiep),
        canhBao,
        suCo: suCo.filter((x) => x.sanId === s.id).map((x) => ({ id: x.id, moTa: x.moTa, thoiGianGhiNhan: x.thoiGianGhiNhan })),
      };
    }),
  };
}

// ---------------------------------------------------------------- UC05.1 Check-in khách

/** «include» Tra cứu đơn đặt sân: đơn của hôm nay theo mã đơn hoặc SĐT */
export async function traCuuDonHomNay(q) {
  const s = String(q ?? '').trim();
  if (!s) throw loi.duLieu('Nhập mã đặt chỗ hoặc số điện thoại');
  const ds = await prisma.donDatSan.findMany({
    where: {
      chiTiet: { some: { ngayChoi: sangNgayDb(homNay()) } },
      OR: [{ maDon: s.toUpperCase() }, { sdtKhach: s }, { khachHang: { nguoiDung: { soDienThoai: s } } }],
    },
    include: INCLUDE_DON,
    orderBy: { ngayTao: 'desc' },
  });
  return ds.map((d) => sangDTO(d, { xemNoiBo: true }));
}

export async function checkIn(nhanVien, maDon) {
  const kq = await prisma.$transaction(async (tx) => {
    const don = await donDatSanRepository.findByMaDon(maDon, tx);
    kiemTraQuyenDon(nhanVien, don);
    if (don.trangThai === 'CHO_THANH_TOAN') throw loi.viPham('CON_NO', 'Đơn chưa thanh toán, hãy thu tiền trước khi check-in (UC05.1 – A1)');
    if (don.trangThai !== 'DA_XAC_NHAN') throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'Đơn không ở trạng thái chờ check-in');
    const { batDau } = khoangThoiGian(don);
    const now = bayGio();
    if (now < congPhut(batDau, -thamSo.PHUT_CHECK_IN_TRUOC) || now > congPhut(batDau, thamSo.PHUT_CHECK_IN_SAU)) {
      throw loi.viPham('NGOAI_GIO_CHECK_IN', `Chỉ check-in từ ${thamSo.PHUT_CHECK_IN_TRUOC} phút trước đến ${thamSo.PHUT_CHECK_IN_SAU} phút sau giờ bắt đầu (QT-16)`);
    }
    const dto = sangDTO(don, { xemNoiBo: true });
    if (dto.conPhaiThu > 0) throw loi.viPham('CON_NO', `Đơn còn ${dto.conPhaiThu.toLocaleString('vi-VN')} đ chưa thanh toán, hãy thu trước khi check-in`);
    await chuyenTrangThai(tx, don, 'DANG_SU_DUNG', { thoiGianCheckIn: now });
    await ghiNhatKy(nhanVien.id, 'CHECK_IN', 'don_dat_san', don.id, null, tx);
    return donDatSanRepository.findById(don.id, tx);
  });
  const dto = sangDTO(kq, { xemNoiBo: true });
  return { don: dto, thietBiCanGiao: dto.dichVu.filter((d) => d.trangThai === 'DA_DAT') };
}

// ---------------------------------------------------------------- UC05.3 Giao / nhận thiết bị

export async function giaoDichVu(nhanVien, chiTietDichVuId) {
  return prisma.$transaction(async (tx) => {
    const ct = await tx.chiTietDichVu.findUnique({ where: { id: Number(chiTietDichVuId) }, include: { dichVu: true, donDatSan: true } });
    if (!ct) throw loi.khongTimThay('dịch vụ của đơn');
    if (ct.trangThai !== 'DA_DAT') throw loi.xungDot('DA_GIAO', 'Dịch vụ này đã được giao');
    if (!['DA_XAC_NHAN', 'DANG_SU_DUNG'].includes(ct.donDatSan.trangThai)) throw loi.viPham('CHUA_CHECK_IN', 'Đơn chưa thanh toán hoặc đã kết thúc');
    if (ct.dichVu.soLuongTon < ct.soLuong) throw loi.viPham('HET_THIET_BI', `${ct.dichVu.tenDichVu} trong kho không đủ`);
    await tx.dichVu.update({ where: { id: ct.dichVuId }, data: { soLuongTon: { decrement: ct.soLuong } } });
    const tienCoc = ct.dichVu.loai === 'THIET_BI' ? soTien(ct.dichVu.tienCoc) * ct.soLuong : 0;
    await tx.chiTietDichVu.update({ where: { id: ct.id }, data: { trangThai: 'DA_GIAO', tienCoc, nhanVienGhiNhanId: nhanVien.vaiTro === 'LE_TAN' ? nhanVien.id : null } });
    return { tenDichVu: ct.dichVu.tenDichVu, soLuong: ct.soLuong, tienCocThu: tienCoc };
  });
}

/** tinhTrang: NGUYEN_VEN | HONG | MAT (QT-25) */
export async function nhanThietBi(nhanVien, chiTietDichVuId, { tinhTrang = 'NGUYEN_VEN', ghiChu = '' } = {}) {
  return prisma.$transaction(async (tx) => {
    const ct = await tx.chiTietDichVu.findUnique({ where: { id: Number(chiTietDichVuId) }, include: { dichVu: true } });
    if (!ct || ct.dichVu.loai !== 'THIET_BI') throw loi.khongTimThay('thiết bị của đơn');
    if (ct.trangThai !== 'DA_GIAO') throw loi.xungDot('CHUA_GIAO', 'Thiết bị chưa được giao hoặc đã nhận lại');
    const nguyenVen = tinhTrang === 'NGUYEN_VEN';
    if (nguyenVen) await tx.dichVu.update({ where: { id: ct.dichVuId }, data: { soLuongTon: { increment: ct.soLuong } } });
    await tx.chiTietDichVu.update({ where: { id: ct.id }, data: { trangThai: 'DA_TRA' } });
    await ghiNhatKy(nhanVien.id, 'NHAN_THIET_BI', 'chi_tiet_dich_vu', ct.id, { tinhTrang, ghiChu }, tx);
    return { tenDichVu: ct.dichVu.tenDichVu, tinhTrang, tienCocHoan: nguyenVen ? soTien(ct.tienCoc) : 0, tienCocGiuLai: nguyenVen ? 0 : soTien(ct.tienCoc) };
  });
}

// ---------------------------------------------------------------- UC05.4 Ghi nhận sự cố sân (QT-27)

/** Gợi ý sân thay thế: cùng loại sân, đang hoạt động, còn trống đủ các khung của lịch bị ảnh hưởng */
async function goiYSanThayThe(san, dsChiTiet) {
  const dsSan = await prisma.san.findMany({ where: { id: { not: san.id }, trangThai: 'HOAT_DONG', loaiSan: san.loaiSan ?? undefined } });
  const kq = [];
  for (const s of dsSan) {
    const trung = await prisma.chiTietDatSan.count({
      where: { sanId: s.id, conHieuLuc: 1, OR: dsChiTiet.map((c) => ({ ngayChoi: c.ngayChoi, khungGioId: c.khungGioId })) },
    });
    if (!trung) kq.push({ id: s.id, tenSan: s.tenSan });
  }
  return kq;
}

/** Các lịch đặt của sân bị ảnh hưởng từ hiện tại đến hết ngày (hoặc đến thời điểm dự kiến khắc phục) */
async function lichBiAnhHuong(sanId, denLuc) {
  const now = bayGio();
  const ds = await prisma.chiTietDatSan.findMany({
    where: { sanId, conHieuLuc: 1, ngayChoi: { gte: sangNgayDb(homNay()), lte: sangNgayDb(chuoiNgay(new Date(denLuc.getTime() + 7 * 3600000))) } },
    include: { khungGio: true, donDatSan: true },
  });
  return ds.filter((c) => {
    const kt = thoiDiem(chuoiNgay(c.ngayChoi), chuoiGio(c.khungGio.gioKetThuc));
    const bd = thoiDiem(chuoiNgay(c.ngayChoi), chuoiGio(c.khungGio.gioBatDau));
    return kt > now && bd < denLuc && TRANG_THAI_CON_HIEU_LUC.includes(c.donDatSan.trangThai);
  });
}

export async function dsLichAnhHuong(sanId, denLuc) {
  const san = await prisma.san.findUnique({ where: { id: Number(sanId) } });
  if (!san) throw loi.khongTimThay('sân');
  const ct = await lichBiAnhHuong(san.id, denLuc);
  const theoDon = new Map();
  for (const c of ct) {
    if (!theoDon.has(c.donDatSanId)) theoDon.set(c.donDatSanId, []);
    theoDon.get(c.donDatSanId).push(c);
  }
  const kq = [];
  for (const [, ds] of theoDon) {
    const d = ds[0].donDatSan;
    kq.push({
      maDon: d.maDon,
      trangThai: d.trangThai,
      khung: ds.map((c) => `${chuoiGio(c.khungGio.gioBatDau)}–${chuoiGio(c.khungGio.gioKetThuc)} ${hienThiNgay(chuoiNgay(c.ngayChoi))}`),
      goiYSan: await goiYSanThayThe(san, ds),
    });
  }
  return kq;
}

export async function ghiNhanSuCo(nhanVien, { sanId, moTa, denLuc }) {
  const san = await prisma.san.findUnique({ where: { id: Number(sanId) } });
  if (!san) throw loi.khongTimThay('sân');
  if (!moTa || String(moTa).length > 255) throw loi.duLieu('Mô tả sự cố bắt buộc, tối đa 255 ký tự');
  const den = denLuc ? new Date(denLuc) : thoiDiem(homNay(), '23:00');
  const suCo = await prisma.$transaction(async (tx) => {
    const sc = await tx.suCo.create({ data: { sanId: san.id, leTanId: nhanVien.id, moTa, trangThai: 'DANG_XU_LY' } });
    await tx.san.update({ where: { id: san.id }, data: { trangThai: 'BAO_TRI' } });
    await ghiNhatKy(nhanVien.id, 'SU_CO', 'su_co', sc.id, { san: san.tenSan, moTa }, tx);
    return sc;
  });
  return { suCoId: suCo.id, lichBiAnhHuong: await dsLichAnhHuong(san.id, den) };
}

/**
 * «extend» Xử lý lịch đặt bị ảnh hưởng: chuyển sang sân thay thế hoặc hủy và hoàn 100% (QT-15, QT-27).
 * hanhDong: CHUYEN_SAN (kèm sanMoiId) | HUY
 */
export async function xuLyDonBiAnhHuong(nhanVien, { maDon, sanSuCoId, hanhDong, sanMoiId }) {
  if (!['CHUYEN_SAN', 'HUY'].includes(hanhDong)) throw loi.duLieu('Hành động là CHUYEN_SAN hoặc HUY');
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(nhanVien, don);
  const biAnhHuong = chiTietTinhTien(don).filter((c) => c.sanId === Number(sanSuCoId) && thoiDiem(chuoiNgay(c.ngayChoi), chuoiGio(c.khungGio.gioKetThuc)) > bayGio());
  if (!biAnhHuong.length) throw loi.viPham('KHONG_BI_ANH_HUONG', 'Đơn không có khung nào trên sân gặp sự cố');

  if (hanhDong === 'CHUYEN_SAN') {
    const sanMoi = await prisma.san.findUnique({ where: { id: Number(sanMoiId) } });
    if (!sanMoi || sanMoi.trangThai !== 'HOAT_DONG') throw loi.viPham('SAN_KHONG_HOAT_DONG', 'Sân thay thế không hoạt động');
    await prisma.$transaction(async (tx) => {
      for (const c of biAnhHuong) {
        // Giá cao hơn không thu thêm; đơn giá đã lưu được giữ nguyên (QT-27)
        await tx.chiTietDatSan.update({ where: { id: c.id }, data: { sanId: sanMoi.id } });
      }
      await ghiNhatKy(nhanVien.id, 'CHUYEN_SAN', 'don_dat_san', don.id, { tu: Number(sanSuCoId), den: sanMoi.id }, tx);
    });
    notificationSender.guiKhachCuaDon(
      don,
      `Do sự cố kỹ thuật, đơn ${don.maDon} được chuyển sang ${sanMoi.tenSan} cùng khung giờ. Nếu không đồng ý, bạn có thể hủy trong 30 phút và được hoàn 100%.`,
    );
    return { maDon, ketQua: `Đã chuyển sang ${sanMoi.tenSan}` };
  }

  // HUY: toàn bộ đơn nằm trên sân sự cố → hủy cả đơn; nếu chỉ một phần → bỏ các khung đó và hoàn tiền phần sân tương ứng
  const conLai = chiTietTinhTien(don).filter((c) => !biAnhHuong.includes(c));
  if (!conLai.length) {
    if (don.trangThai === 'DANG_SU_DUNG') {
      // A1 của UC05.4: khách đang chơi, hoàn phần thời gian chưa chơi
      const th = tongHopDon(don);
      const tienSanChuaChoi = biAnhHuong
        .filter((c) => thoiDiem(chuoiNgay(c.ngayChoi), chuoiGio(c.khungGio.gioBatDau)) > bayGio())
        .reduce((s, c) => s + soTien(c.donGia), 0);
      const tamTinh = th.tienSan + th.tienDichVu + th.hocPhi;
      const kq = await prisma.$transaction((tx) => hoanTienDon(tx, don, tamTinh ? tienSanChuaChoi / tamTinh : 0, { nhanVienId: nhanVien.id, traDiem: false }));
      notificationSender.guiKhachCuaDon(don, `Sân của đơn ${don.maDon} gặp sự cố. Chúng tôi hoàn ${kq.tongHoan.toLocaleString('vi-VN')} đ cho thời gian chưa chơi.`);
      return { maDon, ketQua: `Đã hoàn ${kq.tongHoan} đ cho thời gian chưa chơi` };
    }
    const r = await huyDon(nhanVien, maDon, { lyDo: 'Sân gặp sự cố', doPhiaSan: true });
    return { maDon, ketQua: `Đã hủy đơn, hoàn ${r.tongHoan} đ` };
  }
  const hoan = await prisma.$transaction(async (tx) => {
    const th = tongHopDon(don);
    const tienSanBo = biAnhHuong.reduce((s, c) => s + soTien(c.donGia), 0);
    const tamTinh = th.tienSan + th.tienDichVu + th.hocPhi;
    const r = await hoanTienDon(tx, don, tamTinh ? tienSanBo / tamTinh : 0, { nhanVienId: nhanVien.id, traDiem: false });
    await tx.chiTietDatSan.deleteMany({ where: { id: { in: biAnhHuong.map((c) => c.id) } } });
    await capNhatTongTien(don.id, tx);
    await ghiNhatKy(nhanVien.id, 'HUY_KHUNG_SU_CO', 'don_dat_san', don.id, { soKhung: biAnhHuong.length }, tx);
    return r;
  });
  notificationSender.guiKhachCuaDon(don, `Một số khung của đơn ${don.maDon} bị hủy do sân gặp sự cố. Số tiền hoàn: ${hoan.tongHoan.toLocaleString('vi-VN')} đ.`);
  return { maDon, ketQua: `Đã hủy ${biAnhHuong.length} khung, hoàn ${hoan.tongHoan} đ` };
}

export async function khacPhucSuCo(nhanVien, suCoId) {
  const sc = await prisma.suCo.findUnique({ where: { id: Number(suCoId) } });
  if (!sc) throw loi.khongTimThay('sự cố');
  await prisma.$transaction(async (tx) => {
    await tx.suCo.update({ where: { id: sc.id }, data: { trangThai: 'DA_KHAC_PHUC', thoiGianKhacPhuc: bayGio() } });
    const conSuCo = await tx.suCo.count({ where: { sanId: sc.sanId, trangThai: 'DANG_XU_LY', id: { not: sc.id } } });
    if (!conSuCo) await tx.san.update({ where: { id: sc.sanId }, data: { trangThai: 'HOAT_DONG' } });
    await ghiNhatKy(nhanVien.id, 'KHAC_PHUC_SU_CO', 'su_co', sc.id, null, tx);
  });
  return { daKhacPhuc: true };
}

export async function dsSuCo({ trangThai } = {}) {
  const ds = await prisma.suCo.findMany({
    where: trangThai ? { trangThai } : {},
    include: { san: true, leTan: { include: { nguoiDung: { select: { hoTen: true } } } } },
    orderBy: { thoiGianGhiNhan: 'desc' },
    take: 100,
  });
  return ds.map((s) => ({
    id: s.id, san: s.san.tenSan, sanId: s.sanId, moTa: s.moTa, trangThai: s.trangThai, leTan: s.leTan.nguoiDung.hoTen,
    thoiGianGhiNhan: s.thoiGianGhiNhan, thoiGianKhacPhuc: s.thoiGianKhacPhuc,
  }));
}

export { capNhatTongTien };

/** Lễ tân tìm tài khoản khách theo SĐT / tên để đặt hộ hoặc bán gói tại quầy */
export async function timKhach(q) {
  const s = String(q ?? '').trim();
  if (s.length < 3) return [];
  const ds = await prisma.nguoiDung.findMany({
    where: { vaiTro: 'KHACH_HANG', OR: [{ soDienThoai: { contains: s } }, { hoTen: { contains: s } }, { email: { contains: s } }] },
    include: { khachHang: { include: { goiThanhVien: true } } },
    take: 10,
  });
  return ds.map((u) => ({ id: u.id, hoTen: u.hoTen, soDienThoai: u.soDienThoai, email: u.email, trangThai: u.trangThai, diemThuong: u.khachHang?.diemThuong ?? 0 }));
}

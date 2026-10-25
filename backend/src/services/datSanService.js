// DatSanService – nghiệp vụ phân hệ UC02 Đặt sân & Lịch sân (Hình 4.8, Bảng 4.17)
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { donDatSanRepository, INCLUDE_DON } from '../repositories/donDatSanRepository.js';
import { chiTietDatSanRepository } from '../repositories/chiTietDatSanRepository.js';
import { khungGioRepository } from '../repositories/khungGioRepository.js';
import { GiaCalculator, tinhBangTien } from './rules/giaCalculator.js';
import { tyLeHoan, heSoHoan } from './rules/hoanTienPolicy.js';
import { diemTichLuy } from './rules/diemThuongPolicy.js';
import { choPhepChuyen, TEN_TRANG_THAI } from './rules/trangThaiDon.js';
import {
  sangDTO, tongHopDon, khoangThoiGian, thongTinKhach, duKienHoan, chiTietTinhTien,
} from './donTinhToan.js';
import { hoanTienDon, hoanPhanDuThua } from './hoanTienService.js';
import { ghiNhatKy } from './nhatKyService.js';
import { notificationSender } from '../agents/notificationSender.js';
import {
  bayGio, homNay, congNgay, congPhut, soNgayGiua, laNgayHopLe, sangNgayDb, chuoiGio, chuoiNgay,
  thoiDiem, thuVietNam, hienThiThoiDiem, hienThiNgay,
} from '../utils/thoiGian.js';
import { taoMa } from '../utils/maSo.js';
import { soTien, dinhDangTien, lamTronNghin } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

// ---------------------------------------------------------------- tiện ích nội bộ

async function taoMaDon(db) {
  for (let i = 0; i < 5; i++) {
    const ma = taoMa('DS');
    if (!(await db.donDatSan.findUnique({ where: { maDon: ma } }))) return ma;
  }
  throw new Error('Không tạo được mã đơn');
}

/** Kiểm tra quyền xem / thao tác đơn: khách chỉ thao tác đơn của mình */
export function kiemTraQuyenDon(user, don) {
  if (!don) throw loi.khongTimThay('đơn đặt sân', 'KHONG_TIM_THAY_DON');
  if (user.vaiTro === 'KHACH_HANG' && don.khachHangId !== user.id) throw loi.khongPhaiChuDon();
  if (!['KHACH_HANG', 'LE_TAN', 'QUAN_LY'].includes(user.vaiTro)) throw loi.khongDuQuyen();
}

/** Chuyển trạng thái theo đúng Bảng 3.5i */
export async function chuyenTrangThai(db, don, moi, duLieuThem = {}) {
  if (!choPhepChuyen(don.trangThai, moi)) {
    throw loi.xungDot(
      'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
      `Không thể chuyển đơn từ “${TEN_TRANG_THAI[don.trangThai]}” sang “${TEN_TRANG_THAI[moi]}”`,
    );
  }
  return db.donDatSan.update({ where: { id: don.id }, data: { trangThai: moi, ...duLieuThem } });
}

/** Trả lại các khung giờ của đơn (con_hieu_luc = NULL); có thể chỉ trả các khung bắt đầu sau một thời điểm */
async function traKhung(db, don, { sauThoiDiem = null } = {}) {
  const ids = don.chiTiet
    .filter((c) => c.conHieuLuc === 1)
    .filter((c) => !sauThoiDiem || thoiDiem(chuoiNgay(c.ngayChoi), chuoiGio(c.khungGio.gioBatDau)) > sauThoiDiem)
    .map((c) => c.id);
  if (ids.length) await db.chiTietDatSan.updateMany({ where: { id: { in: ids } }, data: { conHieuLuc: null } });
}

/** Hủy dịch vụ chưa giao và buổi học đi kèm khi đơn bị hủy / hết hạn (QT-14) */
async function huyDichVuDiKem(db, don) {
  await db.chiTietDichVu.deleteMany({ where: { donDatSanId: don.id, trangThai: 'DA_DAT' } });
  await db.buoiHoc.updateMany({ where: { donDatSanId: don.id, trangThai: 'DA_DAT' }, data: { trangThai: 'DA_HUY' } });
}

const moTaKhung = (don) =>
  chiTietTinhTien(don)
    .map((c) => `${c.san.tenSan} ${chuoiGio(c.khungGio.gioBatDau)}–${chuoiGio(c.khungGio.gioKetThuc)} ngày ${hienThiNgay(chuoiNgay(c.ngayChoi))}`)
    .join('; ');

/**
 * QT-01, QT-02, QT-06: kiểm tra danh sách (sân, khung giờ) của một ngày và lấy đơn giá từng khung.
 * @returns [{ sanId, khungGioId, khungGiaId, donGia }]
 */
export async function kiemTraSanKhung(ngay, danhSach, { laNhanVien = false, boQuaPhamVi = false, boQuaDonId = null, db = prisma } = {}) {
  if (!laNgayHopLe(ngay)) throw loi.duLieu('Ngày chơi không hợp lệ');
  if (!Array.isArray(danhSach) || danhSach.length === 0) throw loi.duLieu('Hãy chọn ít nhất một khung giờ');

  const hn = homNay();
  const cach = soNgayGiua(hn, ngay);
  if (cach < 0) throw loi.viPham('NGOAI_PHAM_VI_NGAY', 'Không thể đặt sân cho ngày đã qua');
  const gioiHan = laNhanVien ? 30 : thamSo.SO_NGAY_DAT_TRUOC - 1;
  if (!boQuaPhamVi && cach > gioiHan) {
    throw loi.viPham('NGOAI_PHAM_VI_NGAY', `Chỉ được đặt sân trong ${gioiHan + 1} ngày tới (QT-02)`);
  }

  const dsKhung = await khungGioRepository.findAll(db);
  const khungTheoId = new Map(dsKhung.map((k) => [k.id, k]));
  const nhom = new Map();
  const daCo = new Set();
  for (const x of danhSach) {
    const sanId = Number(x.sanId);
    const khungGioId = Number(x.khungGioId);
    const khoa = `${sanId}-${khungGioId}`;
    if (daCo.has(khoa)) continue;
    daCo.add(khoa);
    const k = khungTheoId.get(khungGioId);
    if (!k) throw loi.duLieu('Khung giờ không hợp lệ');
    const batDau = thoiDiem(ngay, chuoiGio(k.gioBatDau));
    if (batDau < congPhut(bayGio(), thamSo.PHUT_DAT_TRUOC_TOI_THIEU)) {
      throw loi.viPham('NGOAI_PHAM_VI_NGAY', `Khung ${chuoiGio(k.gioBatDau)} đã bắt đầu hoặc còn dưới ${thamSo.PHUT_DAT_TRUOC_TOI_THIEU} phút (QT-02)`);
    }
    if (!nhom.has(sanId)) nhom.set(sanId, []);
    nhom.get(sanId).push(khungGioId);
  }

  const dsSan = await db.san.findMany({ where: { id: { in: [...nhom.keys()] } } });
  if (dsSan.length !== nhom.size) throw loi.khongTimThay('sân');
  for (const s of dsSan) {
    if (s.trangThai !== 'HOAT_DONG') throw loi.viPham('SAN_KHONG_HOAT_DONG', `${s.tenSan} đang bảo trì hoặc ngừng sử dụng`);
    const ids = nhom.get(s.id).sort((a, b) => a - b);
    if (ids.length > thamSo.SO_KHUNG_LIEN_TIEP_TOI_DA) {
      throw loi.viPham('SAI_SO_KHUNG', `Mỗi sân đặt tối đa ${thamSo.SO_KHUNG_LIEN_TIEP_TOI_DA} khung liên tiếp (QT-01)`);
    }
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] !== ids[i - 1] + 1) throw loi.viPham('SAI_SO_KHUNG', `Các khung của ${s.tenSan} phải liên tiếp nhau (QT-01)`);
    }
  }

  const dsSanKhung = [...nhom.entries()].flatMap(([sanId, ids]) => ids.map((khungGioId) => ({ sanId, khungGioId })));
  const trung = await chiTietDatSanRepository.timTrung(ngay, dsSanKhung, boQuaDonId, db);
  if (trung.length) {
    throw loi.trungLich(
      `${trung[0].san.tenSan}, khung ${chuoiGio(trung[0].khungGio.gioBatDau)}–${chuoiGio(trung[0].khungGio.gioKetThuc)} ngày ${hienThiNgay(ngay)} vừa có người đặt`,
      trung.map((t) => ({ sanId: t.sanId, khungGioId: t.khungGioId })),
    );
  }

  const { bang } = await new GiaCalculator(db).bangGiaNgay(ngay, dsKhung);
  return dsSanKhung.map((x) => {
    const g = bang.get(x.khungGioId);
    if (!g) throw loi.viPham('CHUA_CO_BANG_GIA', 'Chưa có bảng giá cho khung giờ đã chọn, vui lòng liên hệ quản lý');
    return { ...x, khungGiaId: g.khungGiaId, donGia: g.donGia };
  });
}

// ---------------------------------------------------------------- UC02.1 Xem lịch sân trống

export async function layLichSan(ngay, { loaiSan } = {}, user = null) {
  if (!laNgayHopLe(ngay)) throw loi.duLieu('Ngày không hợp lệ');
  const laNhanVien = user && ['LE_TAN', 'QUAN_LY'].includes(user.vaiTro);
  const dsKhung = await khungGioRepository.findAll();
  const gc = new GiaCalculator();
  const { loaiNgay, bang } = await gc.bangGiaNgay(ngay, dsKhung);
  const dsSan = await prisma.san.findMany({
    where: { trangThai: { not: 'NGUNG_SU_DUNG' }, ...(loaiSan ? { loaiSan } : {}) },
    orderBy: { id: 'asc' },
  });
  const daDat = await chiTietDatSanRepository.findByNgayChoi(ngay);
  const theoO = new Map(daDat.map((c) => [`${c.sanId}-${c.khungGioId}`, c]));
  const now = bayGio();

  return {
    ngay,
    loaiNgay,
    khungGio: dsKhung.map((k) => ({
      id: k.id,
      gioBatDau: chuoiGio(k.gioBatDau),
      gioKetThuc: chuoiGio(k.gioKetThuc),
      donGia: bang.get(k.id)?.donGia ?? null,
    })),
    san: dsSan.map((s) => ({
      id: s.id,
      tenSan: s.tenSan,
      loaiSan: s.loaiSan,
      trangThai: s.trangThai,
      o: dsKhung.map((k) => {
        const c = theoO.get(`${s.id}-${k.id}`);
        let trangThai = 'TRONG';
        if (c) trangThai = c.donDatSan.trangThai === 'CHO_THANH_TOAN' ? 'DANG_GIU' : 'DA_DAT';
        else if (s.trangThai === 'BAO_TRI') trangThai = 'BAO_TRI';
        else if (thoiDiem(ngay, chuoiGio(k.gioBatDau)) < congPhut(now, laNhanVien ? 0 : thamSo.PHUT_DAT_TRUOC_TOI_THIEU)) trangThai = 'DA_QUA';
        const o = { khungGioId: k.id, trangThai };
        if (c && user && c.donDatSan.khachHangId === user.id) o.cuaToi = true;
        if (c && laNhanVien) {
          o.maDon = c.donDatSan.maDon;
          o.tenKhach = c.donDatSan.khachHang?.nguoiDung.hoTen ?? c.donDatSan.hoTenKhach;
          o.sdtKhach = c.donDatSan.khachHang?.nguoiDung.soDienThoai ?? c.donDatSan.sdtKhach;
        }
        return o;
      }),
    })),
  };
}

// ---------------------------------------------------------------- UC02.2 Đặt sân

/** Các quy tắc phải thỏa trước khi tạo đơn (QT-03, QT-05, QT-18) */
async function kiemTraQuyTac(user, req) {
  const laNhanVien = user.vaiTro === 'LE_TAN' || user.vaiTro === 'QUAN_LY';
  let khachHangId = null;
  if (laNhanVien) {
    if (req.khachHangId) {
      const kh = await prisma.khachHang.findUnique({ where: { nguoiDungId: Number(req.khachHangId) } });
      if (!kh) throw loi.khongTimThay('tài khoản khách hàng');
      khachHangId = kh.nguoiDungId;
    } else if (!req.sdtKhach || !req.hoTenKhach) {
      throw loi.duLieu('Nhập tài khoản khách hoặc họ tên và số điện thoại của khách');
    }
  } else {
    if (user.trangThai === 'KHOA_DAT_TRUC_TUYEN') throw loi.khoaDatTrucTuyen();
    khachHangId = user.id;
  }
  const dinhKy = req.dinhKy?.soBuoi ? Number(req.dinhKy.soBuoi) : 0;
  if (dinhKy) {
    if (dinhKy < thamSo.DINH_KY_SO_BUOI_TOI_THIEU || dinhKy > thamSo.DINH_KY_SO_BUOI_TOI_DA) {
      throw loi.viPham('SAI_DINH_KY', `Lịch định kỳ có từ ${thamSo.DINH_KY_SO_BUOI_TOI_THIEU} đến ${thamSo.DINH_KY_SO_BUOI_TOI_DA} buổi (QT-05)`);
    }
    if (!khachHangId) throw loi.viPham('SAI_DINH_KY', 'Lịch định kỳ chỉ dành cho khách có tài khoản');
    if (new Set(req.danhSach.map((x) => Number(x.sanId))).size !== 1) {
      throw loi.viPham('SAI_DINH_KY', 'Lịch định kỳ phải trên cùng một sân, cùng khung giờ (QT-05)');
    }
  } else if (!laNhanVien) {
    const dangCho = await donDatSanRepository.demDangCho(khachHangId);
    if (dangCho >= thamSo.SO_DON_CHO_TOI_DA) {
      throw loi.viPham('VUOT_GIOI_HAN_DON_CHO', `Bạn đang có ${dangCho} đơn chờ thanh toán. Hãy thanh toán hoặc hủy bớt trước khi đặt thêm (QT-03)`);
    }
  }
  return { laNhanVien, khachHangId, dinhKy };
}

/**
 * Tạo đơn đặt lẻ hoặc định kỳ, giữ chỗ (UC02.2).
 * req: { ngayChoi, danhSach:[{sanId,khungGioId}], dinhKy?:{soBuoi}, khachHangId?, hoTenKhach?, sdtKhach?, taiQuay? }
 */
export async function datSan(user, req) {
  const { laNhanVien, khachHangId, dinhKy } = await kiemTraQuyTac(user, req);
  const soBuoi = dinhKy || 1;
  const dsNgay = Array.from({ length: soBuoi }, (_, i) => congNgay(req.ngayChoi, i * 7));

  // Kiểm tra từng buổi trước, để báo lỗi rõ ràng (buổi sau của lịch định kỳ không bị giới hạn 7 ngày)
  const dsBuoi = [];
  for (let i = 0; i < dsNgay.length; i++) {
    dsBuoi.push(await kiemTraSanKhung(dsNgay[i], req.danhSach, { laNhanVien, boQuaPhamVi: i > 0 }));
  }

  const now = bayGio();
  const khach = await thongTinKhach(khachHangId);
  const phanTramHang = khach?.phanTramHang ?? 0;
  const giuPhut = laNhanVien && !req.taiQuay ? thamSo.GIU_CHO_LE_TAN_PHUT : thamSo.GIU_CHO_PHUT;

  const dsDon = await prisma.$transaction(async (tx) => {
    let lichDinhKyId = null;
    if (dinhKy) {
      const ids = dsBuoi[0].map((x) => x.khungGioId).sort((a, b) => a - b);
      const dsKhung = await khungGioRepository.findAll(tx);
      const kDau = dsKhung.find((k) => k.id === ids[0]);
      const kCuoi = dsKhung.find((k) => k.id === ids[ids.length - 1]);
      const ldk = await tx.lichDinhKy.create({
        data: {
          khachHangId,
          sanId: dsBuoi[0][0].sanId,
          tanSuat: 'HANG_TUAN',
          thuTrongTuan: thuVietNam(req.ngayChoi),
          gioBatDau: kDau.gioBatDau,
          gioKetThuc: kCuoi.gioKetThuc,
          tuNgay: sangNgayDb(dsNgay[0]),
          denNgay: sangNgayDb(dsNgay[dsNgay.length - 1]),
        },
      });
      lichDinhKyId = ldk.id;
    }
    const tao = [];
    for (let i = 0; i < dsBuoi.length; i++) {
      const dong = dsBuoi[i];
      const tienSan = dong.reduce((s, x) => s + x.donGia, 0);
      let hanGiuCho = congPhut(now, giuPhut);
      if (i > 0) {
        const dsKhung = await khungGioRepository.findAll(tx);
        const dau = dsKhung.find((k) => k.id === Math.min(...dong.map((x) => x.khungGioId)));
        hanGiuCho = new Date(thoiDiem(dsNgay[i], chuoiGio(dau.gioBatDau)).getTime() - thamSo.DINH_KY_HAN_THANH_TOAN_GIO * 3600000);
      }
      const don = await tx.donDatSan.create({
        data: {
          maDon: await taoMaDon(tx),
          khachHangId,
          hoTenKhach: khachHangId ? null : req.hoTenKhach,
          sdtKhach: khachHangId ? null : req.sdtKhach,
          nhanVienLapId: laNhanVien && user.vaiTro === 'LE_TAN' ? user.id : null,
          lichDinhKyId,
          kenhDat: laNhanVien ? 'TAI_QUAY' : 'TRUC_TUYEN',
          trangThai: 'CHO_THANH_TOAN',
          tongTien: tienSan - Math.floor((tienSan * phanTramHang) / 100),
          hanGiuCho,
          chiTiet: {
            create: dong.map((x) => ({
              sanId: x.sanId, ngayChoi: sangNgayDb(dsNgay[i]), khungGioId: x.khungGioId,
              khungGiaId: x.khungGiaId, donGia: x.donGia, conHieuLuc: 1,
            })),
          },
        },
        include: INCLUDE_DON,
      });
      tao.push(don);
    }
    return tao;
  });

  const dau = dsDon[0];
  await ghiNhatKy(user.id, 'TAO_DON', 'don_dat_san', dau.id, { maDon: dau.maDon, soBuoi });
  notificationSender.guiKhachCuaDon(
    dau,
    `Đơn ${dau.maDon} (${moTaKhung(dau)}) đã được giữ chỗ đến ${hienThiThoiDiem(dau.hanGiuCho)}. ` +
      `Vui lòng thanh toán ${dinhDangTien(dau.tongTien)} trước thời điểm này.` +
      (soBuoi > 1 ? ` Lịch định kỳ gồm ${soBuoi} buổi; mỗi buổi sau cần thanh toán trước giờ chơi 24 giờ.` : ''),
  );
  return { don: sangDTO(dau), soBuoi, cacDon: dsDon.map((d) => ({ maDon: d.maDon, ngayChoi: chuoiNgay(d.chiTiet[0].ngayChoi), hanGiuCho: d.hanGiuCho })) };
}

// ---------------------------------------------------------------- UC02.3 Quản lý lịch đặt sân

function dieuKienLoc({ trangThai, tuNgay, denNgay, q }) {
  const where = {};
  if (trangThai) where.trangThai = { in: String(trangThai).split(',') };
  if (tuNgay || denNgay) {
    where.chiTiet = {
      some: {
        ngayChoi: {
          ...(tuNgay && laNgayHopLe(tuNgay) ? { gte: sangNgayDb(tuNgay) } : {}),
          ...(denNgay && laNgayHopLe(denNgay) ? { lte: sangNgayDb(denNgay) } : {}),
        },
      },
    };
  }
  if (q) {
    const s = String(q).trim();
    where.OR = [
      { maDon: { contains: s.toUpperCase() } },
      { sdtKhach: s },
      { khachHang: { nguoiDung: { soDienThoai: s } } },
    ];
  }
  return where;
}

export async function layDanhSachDon(user, boLoc = {}) {
  const trang = Math.max(0, Number(boLoc.trang) || 0);
  const kichThuoc = Math.min(100, Math.max(1, Number(boLoc.kichThuoc) || 20));
  const where = dieuKienLoc(boLoc);
  if (user.vaiTro === 'KHACH_HANG') where.khachHangId = user.id;
  const [tong, ds] = await Promise.all([
    prisma.donDatSan.count({ where }),
    prisma.donDatSan.findMany({ where, include: INCLUDE_DON, orderBy: { ngayTao: 'desc' }, skip: trang * kichThuoc, take: kichThuoc }),
  ]);
  const xemNoiBo = user.vaiTro !== 'KHACH_HANG';
  return { items: ds.map((d) => sangDTO(d, { xemNoiBo })), tong, trang, kichThuoc };
}

export async function layChiTietDon(user, maDon) {
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(user, don);
  return { ...sangDTO(don, { xemNoiBo: user.vaiTro !== 'KHACH_HANG' }), duKienHoan: duKienHoan(don) };
}

// ---------------------------------------------------------------- UC02.4 Hủy lịch đặt sân

/**
 * Hủy đơn và hoàn tiền về kênh gốc. doPhiaSan = true khi sân sự cố / HLV nghỉ (QT-15).
 * Trả về { don, tongHoan, diemHoan }.
 */
export async function huyDon(user, maDon, { lyDo = '', doPhiaSan = false } = {}) {
  const kq = await prisma.$transaction(async (tx) => {
    const don = await donDatSanRepository.findByMaDon(maDon, tx);
    kiemTraQuyenDon(user, don);
    let hoan = { tongHoan: 0, diemHoan: 0, dong: [] };
    if (don.trangThai === 'DA_XAC_NHAN') {
      const { batDau } = khoangThoiGian(don);
      const tyLe = tyLeHoan((batDau - bayGio()) / 3600000, doPhiaSan);
      if (!tyLe.duocHuy) throw loi.viPham('KHONG_DUOC_HUY', tyLe.lyDo);
      hoan = await hoanTienDon(tx, don, heSoHoan(tongHopDon(don), tyLe), { nhanVienId: user.vaiTro === 'LE_TAN' ? user.id : null });
    } else if (don.trangThai !== 'CHO_THANH_TOAN') {
      throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', `Đơn đang ở trạng thái “${TEN_TRANG_THAI[don.trangThai]}”, không thể hủy`);
    }
    await chuyenTrangThai(tx, don, 'DA_HUY', { hanGiuCho: null });
    await traKhung(tx, don);
    await huyDichVuDiKem(tx, don);
    await tx.thanhToan.updateMany({ where: { donDatSanId: don.id, trangThai: 'CHO_XU_LY' }, data: { trangThai: 'THAT_BAI' } });
    await ghiNhatKy(user.id, 'HUY_DON', 'don_dat_san', don.id, { lyDo, doPhiaSan, hoan: hoan.tongHoan }, tx);
    return { don, hoan };
  });
  const { don, hoan } = kq;
  notificationSender.guiKhachCuaDon(
    don,
    `Đơn ${don.maDon} đã được hủy${doPhiaSan ? ' do sự cố từ phía sân, chúng tôi rất xin lỗi' : ''}. ` +
      (hoan.tongHoan ? `Số tiền hoàn: ${dinhDangTien(hoan.tongHoan)} về kênh đã thanh toán. ` : '') +
      (hoan.diemHoan ? `Đã trả lại ${hoan.diemHoan} điểm thưởng.` : ''),
  );
  return { maDon: don.maDon, tongHoan: hoan.tongHoan, diemHoan: hoan.diemHoan, chiTietHoan: hoan.dong };
}

// ---------------------------------------------------------------- UC02.5 Đổi lịch đặt sân

/** Thay toàn bộ chi tiết sân của đơn bằng lịch mới (bước 5 của UC02.5) – gọi trong transaction */
export async function apDungDoiLich(tx, donId, { ngayChoi, dong }, nguoiThucHienId) {
  const truoc = await donDatSanRepository.findById(donId, tx);
  await tx.chiTietDatSan.deleteMany({ where: { donDatSanId: donId, conHieuLuc: 1 } });
  await tx.chiTietDatSan.createMany({
    data: dong.map((x) => ({
      donDatSanId: donId, sanId: x.sanId, ngayChoi: sangNgayDb(ngayChoi), khungGioId: x.khungGioId,
      khungGiaId: x.khungGiaId, donGia: x.donGia, conHieuLuc: 1,
    })),
  });
  await tx.donDatSan.update({ where: { id: donId }, data: { soLanDoiLich: { increment: 1 } } });
  await ghiNhatKy(nguoiThucHienId, 'DOI_LICH', 'don_dat_san', donId, { cu: moTaKhung(truoc), ngayMoi: ngayChoi }, tx);
  return truoc;
}

/** Tổng tiền đơn nếu đổi sang các khung mới */
async function tongTienSauDoi(don, dongMoi) {
  const th = tongHopDon(don);
  const khach = await thongTinKhach(don.khachHangId);
  return tinhBangTien({
    tienSan: dongMoi.reduce((s, x) => s + x.donGia, 0),
    tienDichVu: th.tienDichVu,
    hocPhi: th.hocPhi,
    phanTramHang: khach?.phanTramHang ?? 0,
    ma: don.maGiamGia ? { phanTramGiam: don.maGiamGia.phanTramGiam, giamToiDa: don.maGiamGia.giamToiDa === null ? null : soTien(don.maGiamGia.giamToiDa) } : null,
  }).tongSauGiam;
}

/**
 * Đổi lịch (QT-13). req: { ngayChoi, danhSach, xacNhan?, phuongThuc? (lễ tân thu chênh lệch) }
 * Khi chưa xacNhan: chỉ trả về số tiền chênh lệch để người dùng xác nhận (bước 3–4).
 */
export async function doiLich(user, maDon, req) {
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(user, don);
  if (don.trangThai !== 'DA_XAC_NHAN') throw loi.viPham('KHONG_DUOC_DOI_LICH', 'Chỉ đổi lịch cho đơn đã xác nhận');
  if (don.lichDinhKyId) throw loi.viPham('KHONG_DUOC_DOI_LICH', 'Buổi của lịch định kỳ không đổi lịch được, hãy hủy và đặt lại');
  if (don.soLanDoiLich >= thamSo.SO_LAN_DOI_LICH_TOI_DA) throw loi.viPham('KHONG_DUOC_DOI_LICH', 'Mỗi đơn chỉ được đổi lịch 1 lần (QT-13)');
  const { batDau } = khoangThoiGian(don);
  if ((batDau - bayGio()) / 3600000 < thamSo.GIO_HUY_TOI_THIEU) {
    throw loi.viPham('KHONG_DUOC_DOI_LICH', `Chỉ đổi lịch khi còn ít nhất ${thamSo.GIO_HUY_TOI_THIEU} giờ trước giờ chơi (QT-13)`);
  }
  const laNhanVien = user.vaiTro !== 'KHACH_HANG';
  const dong = await kiemTraSanKhung(req.ngayChoi, req.danhSach, { laNhanVien, boQuaDonId: don.id });
  const tongMoi = await tongTienSauDoi(don, dong);
  const th = tongHopDon(don);
  const chenhLech = tongMoi - th.daThanhToan;
  const tomTat = { tongTienCu: soTien(don.tongTien), tongTienMoi: tongMoi, daThanhToan: th.daThanhToan, chenhLech };
  if (!req.xacNhan) return { ...tomTat, canThanhToan: chenhLech >= 1000, duocHoan: chenhLech <= -1000 ? -chenhLech : 0 };

  if (chenhLech >= 1000) {
    if (laNhanVien) {
      if (!['TIEN_MAT', 'CHUYEN_KHOAN'].includes(req.phuongThuc)) throw loi.duLieu('Chọn phương thức thu phần chênh lệch');
      await prisma.$transaction(async (tx) => {
        await apDungDoiLich(tx, don.id, { ngayChoi: req.ngayChoi, dong }, user.id);
        await tx.donDatSan.update({ where: { id: don.id }, data: { tongTien: tongMoi } });
        await tx.thanhToan.create({
          data: {
            khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, nhanVienThuId: user.vaiTro === 'LE_TAN' ? user.id : null,
            loai: 'THANH_TOAN', phuongThuc: req.phuongThuc, soTien: lamTronNghin(chenhLech), trangThai: 'THANH_CONG',
          },
        });
      });
    } else {
      // A1: khách thanh toán chênh lệch qua VNPAY, lịch mới chỉ áp dụng khi thanh toán thành công
      const { taoThanhToanDoiLich } = await import('./thanhToanService.js');
      const tt = await taoThanhToanDoiLich(user, don, { ngayChoi: req.ngayChoi, dong, tongMoi }, lamTronNghin(chenhLech), req.ip);
      return { ...tomTat, canThanhToan: true, ...tt };
    }
  } else {
    await prisma.$transaction(async (tx) => {
      const truoc = await apDungDoiLich(tx, don.id, { ngayChoi: req.ngayChoi, dong }, user.id);
      await tx.donDatSan.update({ where: { id: don.id }, data: { tongTien: tongMoi } });
      if (chenhLech <= -1000) await hoanPhanDuThua(tx, truoc, tongMoi, { nhanVienId: user.vaiTro === 'LE_TAN' ? user.id : null });
    });
  }
  const sau = await donDatSanRepository.findById(don.id);
  notificationSender.guiKhachCuaDon(sau, `Đơn ${sau.maDon} đã được đổi sang lịch mới: ${moTaKhung(sau)}.`);
  return { ...tomTat, canThanhToan: false, don: sangDTO(sau) };
}

// ---------------------------------------------------------------- Bộ hẹn giờ (UC02.6, UC01.5, UC01.6)

/** UC02.6: hủy các đơn quá hạn giữ chỗ, trả lại khung giờ */
export async function huyDonQuaHan() {
  const ds = await donDatSanRepository.findQuaHanGiuCho(bayGio());
  for (const d of ds) {
    const don = await prisma.$transaction(async (tx) => {
      const x = await donDatSanRepository.findById(d.id, tx);
      if (x.trangThai !== 'CHO_THANH_TOAN') return null;
      await chuyenTrangThai(tx, x, 'HET_HAN');
      await traKhung(tx, x);
      await huyDichVuDiKem(tx, x);
      return x;
    });
    if (don) {
      notificationSender.guiKhachCuaDon(don, `Đơn ${don.maDon} (${moTaKhung(don)}) đã hết thời gian giữ chỗ nên được hủy tự động.`);
    }
  }
  return ds.length;
}

/** Đếm số đơn “Không đến” của khách trong 30 ngày gần nhất và khóa đặt trực tuyến nếu đủ 3 lần (QT-18) */
export async function kiemTraKhoaKhach(khachHangId, db = prisma) {
  const tu = sangNgayDb(congNgay(homNay(), -thamSo.SO_NGAY_DEM_NO_SHOW));
  const soLan = await db.donDatSan.count({
    where: { khachHangId, trangThai: 'KHONG_DEN', chiTiet: { some: { ngayChoi: { gte: tu } } } },
  });
  const u = await db.nguoiDung.findUnique({ where: { id: khachHangId } });
  if (soLan >= thamSo.SO_LAN_NO_SHOW_KHOA && u.trangThai === 'HOAT_DONG') {
    await db.nguoiDung.update({ where: { id: khachHangId }, data: { trangThai: 'KHOA_DAT_TRUC_TUYEN' } });
    await ghiNhatKy(khachHangId, 'KHOA_DAT_TRUC_TUYEN', 'nguoi_dung', khachHangId, `Bộ hẹn giờ: ${soLan} lần không đến trong ${thamSo.SO_NGAY_DEM_NO_SHOW} ngày`, db);
    return { soLan, biKhoa: true };
  }
  return { soLan, biKhoa: false };
}

/** UC01.6 + QT-17: đơn đã xác nhận quá 15 phút chưa check-in → “Không đến” */
export async function ghiNhanKhongDen() {
  const now = bayGio();
  const ds = await donDatSanRepository.findChuaCheckIn(sangNgayDb(homNay()));
  let dem = 0;
  for (const d of ds) {
    const { batDau } = khoangThoiGian(d);
    if (!batDau || congPhut(batDau, thamSo.PHUT_CHECK_IN_SAU) > now) continue;
    const kq = await prisma.$transaction(async (tx) => {
      const x = await donDatSanRepository.findById(d.id, tx);
      if (x.trangThai !== 'DA_XAC_NHAN') return null;
      await chuyenTrangThai(tx, x, 'KHONG_DEN');
      await traKhung(tx, x, { sauThoiDiem: now }); // trả các khung còn lại để bán cho khách vãng lai
      await tx.chiTietDichVu.deleteMany({ where: { donDatSanId: x.id, trangThai: 'DA_DAT' } });
      let khoa = null;
      if (x.khachHangId) {
        await tx.khachHang.update({ where: { nguoiDungId: x.khachHangId }, data: { soLanNoShow: { increment: 1 } } });
        khoa = await kiemTraKhoaKhach(x.khachHangId, tx);
      }
      return { x, khoa };
    });
    if (!kq) continue;
    dem++;
    const { x, khoa } = kq;
    notificationSender.guiKhachCuaDon(
      x,
      `Đơn ${x.maDon} được ghi nhận “Không đến” vì chưa check-in sau ${thamSo.PHUT_CHECK_IN_SAU} phút kể từ giờ chơi.` +
        (khoa ? ` Bạn đã không đến ${khoa.soLan} lần trong ${thamSo.SO_NGAY_DEM_NO_SHOW} ngày.` : '') +
        (khoa?.biKhoa ? ' Tài khoản tạm bị khóa đặt sân trực tuyến; vui lòng liên hệ quản lý để mở khóa.' : ''),
    );
  }
  return dem;
}

/** UC01.5 + QT-19, QT-21: qua giờ kết thúc → “Đã hoàn thành”, cộng điểm thưởng */
export async function hoanThanhBuoiChoi() {
  const now = bayGio();
  const ds = await donDatSanRepository.findDangSuDung();
  let dem = 0;
  for (const d of ds) {
    const { ketThuc } = khoangThoiGian(d);
    if (!ketThuc || ketThuc > now) continue;
    const kq = await prisma.$transaction(async (tx) => {
      const x = await donDatSanRepository.findById(d.id, tx);
      if (x.trangThai !== 'DANG_SU_DUNG') return null;
      await chuyenTrangThai(tx, x, 'DA_HOAN_THANH');
      await tx.buoiHoc.updateMany({ where: { donDatSanId: x.id, trangThai: 'DA_DAT' }, data: { trangThai: 'DA_DAY' } });
      let diem = 0;
      if (x.khachHangId) {
        const khach = await thongTinKhach(x.khachHangId, tx);
        diem = diemTichLuy(chiTietTinhTien(x).length, khach.heSoTichDiem);
        if (diem > 0) await tx.khachHang.update({ where: { nguoiDungId: x.khachHangId }, data: { diemThuong: { increment: diem } } });
      }
      return { x, diem };
    });
    if (!kq) continue;
    dem++;
    if (kq.x.khachHangId) {
      notificationSender.guiKhachCuaDon(
        kq.x,
        `Cảm ơn bạn đã chơi tại sân! Đơn ${kq.x.maDon} được cộng ${kq.diem} điểm thưởng. ` +
          `Hãy dành chút thời gian đánh giá buổi chơi trong ${thamSo.SO_NGAY_DUOC_DANH_GIA} ngày tới.`,
      );
    }
  }
  return dem;
}

/** Chạy lúc 00:05 hằng ngày: rà lại điều kiện khóa của mọi khách có đơn “Không đến” gần đây */
export async function kiemTraKhoaTatCa() {
  const tu = sangNgayDb(congNgay(homNay(), -thamSo.SO_NGAY_DEM_NO_SHOW));
  const ds = await prisma.donDatSan.findMany({
    where: { trangThai: 'KHONG_DEN', khachHangId: { not: null }, chiTiet: { some: { ngayChoi: { gte: tu } } } },
    select: { khachHangId: true },
    distinct: ['khachHangId'],
  });
  for (const d of ds) await kiemTraKhoaKhach(d.khachHangId);
  return ds.length;
}

// ThanhToanService – nghiệp vụ phân hệ UC03 Thanh toán & Ưu đãi (Hình 4.8, Bảng 4.17, Bảng 4.22)
import prisma from '../config/prisma.js';
import { vnpayGateway, VnpayGateway } from '../agents/vnpayGateway.js';
import { notificationSender } from '../agents/notificationSender.js';
import { donDatSanRepository } from '../repositories/donDatSanRepository.js';
import { thanhToanRepository } from '../repositories/thanhToanRepository.js';
import { chiTietDatSanRepository } from '../repositories/chiTietDatSanRepository.js';
import { bangTinhTienDon, capNhatTongTien, sangDTO, thongTinKhach, kiemTraGoiGio } from './donTinhToan.js';
import { hanThanhVienMoi } from './rules/diemThuongPolicy.js';
import { kiemTraQuyenDon, chuyenTrangThai, apDungDoiLich, kiemTraSanKhung } from './datSanService.js';
import { ghiNhatKy } from './nhatKyService.js';
import { taoMa } from '../utils/maSo.js';
import { bayGio, homNay, congNgay, congPhut, sangNgayDb, chuoiNgay, hienThiNgay } from '../utils/thoiGian.js';
import { soTien, dinhDangTien } from '../utils/tien.js';
import { loi } from '../utils/errors.js';

async function taoHoaDon(db, thanhToanId, tongTien) {
  return db.hoaDon.create({ data: { maHoaDon: taoMa('HD'), thanhToanId, tongTien } });
}

// ---------------------------------------------------------------- UC03.1 – bước 2, 3: tính tiền

export async function tinhTien(user, { maDon, maGiamGia, soDiem, goiGioChoiId }) {
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(user, don);
  const { bang } = await bangTinhTienDon(don, { maGiamGia, soDiem, goiGioChoiId });
  const khach = await thongTinKhach(don.khachHangId);
  const goiDungDuoc = don.khachHangId
    ? await prisma.goiGioChoi.findMany({
        where: {
          khachHangId: don.khachHangId,
          hanSuDung: { gte: sangNgayDb(homNay()) },
          OR: [{ soGioConLai: { gt: 0 } }, { soDuConLai: { gt: 0 } }],
        },
        include: { loaiGoiGio: true },
      })
    : [];
  return {
    maDon: don.maDon,
    trangThai: don.trangThai,
    hanGiuCho: don.hanGiuCho,
    bangTinhTien: bang,
    diemHienCo: khach?.diemThuong ?? 0,
    goiGioDungDuoc: goiDungDuoc.map((g) => ({
      id: g.id,
      tenGoi: g.loaiGoiGio.tenGoi,
      loai: g.loaiGoiGio.loai,
      soGioConLai: g.soGioConLai === null ? null : Number(g.soGioConLai),
      soDuConLai: g.soDuConLai === null ? null : soTien(g.soDuConLai),
      hanSuDung: chuoiNgay(g.hanSuDung),
    })),
  };
}

/**
 * Ghi nhận một lần thanh toán thành công cho đơn (UC03.1 bước 6–7), trong transaction.
 * - chinh: { phuongThuc, soTien, thanhToanChoId?, maGiaoDich?, nhanVienId? } – khoản tiền thật (VNPAY / tiền mặt / chuyển khoản)
 * - luaChon: { soDiem, goiGioChoiId, maGiamGia }
 */
async function ghiNhanThanhToanDon(tx, donId, luaChon, chinh) {
  const don = await donDatSanRepository.findById(donId, tx);
  let tinh;
  try {
    tinh = await bangTinhTienDon(don, luaChon, tx);
  } catch {
    tinh = await bangTinhTienDon(don, {}, tx); // ưu đãi không còn dùng được: ghi nhận phần tiền đã thu
  }
  const { bang, ma, goi } = tinh;
  const daDungMaTruoc = Boolean(don.maGiamGiaId) && don.thanhToan.some((t) => t.trangThai === 'THANH_CONG' && t.loai === 'THANH_TOAN');
  const dsTao = [];

  if (chinh.thanhToanChoId) {
    const t = await tx.thanhToan.update({
      where: { id: chinh.thanhToanChoId },
      data: { trangThai: 'THANH_CONG', maGiaoDichCong: chinh.maGiaoDich ?? null, goiGioChoiId: null, soDiemSuDung: null, thoiGian: bayGio() },
    });
    dsTao.push(t);
  } else if (chinh.soTien > 0) {
    dsTao.push(
      await tx.thanhToan.create({
        data: {
          khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, nhanVienThuId: chinh.nhanVienId ?? null,
          loai: 'THANH_TOAN', phuongThuc: chinh.phuongThuc, soTien: chinh.soTien, trangThai: 'THANH_CONG',
        },
      }),
    );
  }
  if (bang.truDiem > 0) {
    await tx.khachHang.update({ where: { nguoiDungId: don.khachHangId }, data: { diemThuong: { decrement: bang.soDiem } } });
    dsTao.push(
      await tx.thanhToan.create({
        data: {
          khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'THANH_TOAN',
          phuongThuc: 'DIEM_THUONG', soDiemSuDung: bang.soDiem, soTien: bang.truDiem, trangThai: 'THANH_CONG',
        },
      }),
    );
  }
  if (bang.truGoi > 0 && goi) {
    await tx.goiGioChoi.update({
      where: { id: goi.id },
      data: goi.loai === 'GOI_GIO' ? { soGioConLai: { decrement: bang.gioSuDung } } : { soDuConLai: { decrement: bang.truGoi } },
    });
    dsTao.push(
      await tx.thanhToan.create({
        data: {
          khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, goiGioChoiId: goi.id, loai: 'THANH_TOAN',
          phuongThuc: 'GOI_GIO', soTien: bang.truGoi, trangThai: 'THANH_CONG',
        },
      }),
    );
  }
  if (!daDungMaTruoc) {
    // Mã chỉ được gắn vĩnh viễn vào đơn ở lần thanh toán thành công đầu tiên
    await tx.donDatSan.update({ where: { id: don.id }, data: { maGiamGiaId: ma?.id ?? null } });
    if (ma) await tx.maGiamGia.update({ where: { id: ma.id }, data: { soLuotDaDung: { increment: 1 } } });
  }
  await capNhatTongTien(don.id, tx);

  // Trạng thái đơn
  let ghiChu = '';
  if (don.trangThai === 'CHO_THANH_TOAN') {
    await chuyenTrangThai(tx, don, 'DA_XAC_NHAN', { hanGiuCho: null });
  } else if (don.trangThai === 'HET_HAN') {
    // E1 của UC02.6: kết quả thanh toán về sau khi đơn đã hết hạn
    const dsKhung = don.chiTiet.map((c) => ({ sanId: c.sanId, khungGioId: c.khungGioId, ngay: chuoiNgay(c.ngayChoi) }));
    let conTrong = true;
    for (const ngay of new Set(dsKhung.map((x) => x.ngay))) {
      const trung = await chiTietDatSanRepository.timTrung(ngay, dsKhung.filter((x) => x.ngay === ngay), don.id, tx);
      if (trung.length) conTrong = false;
    }
    if (conTrong) {
      await tx.chiTietDatSan.updateMany({ where: { donDatSanId: don.id }, data: { conHieuLuc: 1 } });
      await chuyenTrangThai(tx, don, 'DA_XAC_NHAN', { hanGiuCho: null });
      ghiChu = 'Thanh toán về sau khi hết giữ chỗ, khung vẫn trống nên đơn được khôi phục.';
    } else {
      ghiChu = 'Thanh toán về sau khi hết giữ chỗ và khung đã có người đặt, hệ thống hoàn 100% số tiền vừa thu.';
      for (const t of dsTao.filter((x) => x.phuongThuc !== 'DIEM_THUONG' && x.phuongThuc !== 'GOI_GIO')) {
        await vnpayGateway.hoanTien(t, soTien(t.soTien));
        await tx.thanhToan.create({
          data: {
            khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'HOAN_TIEN',
            phuongThuc: t.phuongThuc, soTien: t.soTien, trangThai: 'THANH_CONG',
          },
        });
      }
    }
  }
  let hoaDon = null;
  if (dsTao.length) {
    const tongThu = dsTao.reduce((s, t) => s + soTien(t.soTien), 0);
    hoaDon = await taoHoaDon(tx, dsTao[0].id, tongThu);
  }
  return { don, bang, hoaDon, ghiChu };
}

function thongBaoDaThanhToan(kq) {
  const { don, hoaDon, ghiChu } = kq;
  notificationSender.guiKhachCuaDon(
    don,
    ghiChu ||
      `Đơn ${don.maDon} đã thanh toán thành công${hoaDon ? `, số tiền ${dinhDangTien(hoaDon.tongTien)}, hóa đơn ${hoaDon.maHoaDon}` : ''}. ` +
        'Vui lòng đến sân đúng giờ và đọc mã đơn khi check-in.',
  );
}

// ---------------------------------------------------------------- UC03.1 – bước 4: tạo giao dịch trực tuyến

export async function taoYeuCau(user, { maDon, maGiamGia, soDiem, goiGioChoiId }, ip) {
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(user, don);
  if (!['CHO_THANH_TOAN', 'DA_XAC_NHAN', 'DANG_SU_DUNG'].includes(don.trangThai)) {
    throw loi.xungDot(don.trangThai === 'HET_HAN' ? 'DON_HET_HAN_GIU_CHO' : 'CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'Đơn không còn ở trạng thái cần thanh toán');
  }
  if (don.trangThai === 'CHO_THANH_TOAN' && don.hanGiuCho && don.hanGiuCho < bayGio()) {
    throw loi.xungDot('DON_HET_HAN_GIU_CHO', 'Đơn đã quá thời gian giữ chỗ (QT-04)');
  }
  const { bang, ma, goi } = await bangTinhTienDon(don, { maGiamGia, soDiem, goiGioChoiId });
  if (bang.conLai <= 0) throw loi.xungDot('DON_DA_THANH_TOAN', 'Đơn đã được thanh toán đủ');

  // A2 – ưu đãi phủ hết số tiền: không qua cổng thanh toán
  if (bang.phaiTra === 0) {
    const kq = await prisma.$transaction((tx) =>
      ghiNhanThanhToanDon(tx, don.id, { maGiamGia, soDiem, goiGioChoiId }, { phuongThuc: 'TIEN_MAT', soTien: 0 }),
    );
    thongBaoDaThanhToan(kq);
    return { bangTinhTien: bang, paymentUrl: null, daThanhToan: true, hoaDon: kq.hoaDon?.maHoaDon ?? null };
  }

  // Đơn chưa xác nhận: chỉ giữ một giao dịch chờ tại một thời điểm
  const tt = await prisma.$transaction(async (tx) => {
    await tx.thanhToan.updateMany({ where: { donDatSanId: don.id, trangThai: 'CHO_XU_LY' }, data: { trangThai: 'THAT_BAI' } });
    const daTraTruoc = don.thanhToan.some((t) => t.trangThai === 'THANH_CONG' && t.loai === 'THANH_TOAN');
    if (!daTraTruoc) await tx.donDatSan.update({ where: { id: don.id }, data: { maGiamGiaId: ma?.id ?? null } });
    return tx.thanhToan.create({
      data: {
        khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'THANH_TOAN', phuongThuc: 'VNPAY',
        soTien: bang.phaiTra, trangThai: 'CHO_XU_LY',
        goiGioChoiId: goi?.id ?? null, // lựa chọn của khách, áp dụng khi thanh toán thành công
        soDiemSuDung: bang.soDiem || null,
      },
    });
  });
  const paymentUrl = vnpayGateway.taoUrlThanhToan(tt, {
    noiDung: `Thanh toan don ${don.maDon}`,
    ip,
    hetHanLuc: don.trangThai === 'CHO_THANH_TOAN' && don.hanGiuCho ? don.hanGiuCho : congPhut(bayGio(), 15),
  });
  return { maGiaoDich: VnpayGateway.maThamChieu(tt.id), bangTinhTien: bang, paymentUrl, daThanhToan: false };
}

// ---------------------------------------------------------------- UC03.1 – A1, A3: thu tiền tại quầy

export async function thuTaiQuay(nhanVien, { maDon, maGiamGia, soDiem, goiGioChoiId, phuongThuc, tienKhachDua }) {
  if (!['TIEN_MAT', 'CHUYEN_KHOAN'].includes(phuongThuc)) throw loi.duLieu('Phương thức tại quầy là tiền mặt hoặc chuyển khoản');
  const don = await donDatSanRepository.findByMaDon(maDon);
  kiemTraQuyenDon(nhanVien, don);
  if (!['CHO_THANH_TOAN', 'DA_XAC_NHAN', 'DANG_SU_DUNG'].includes(don.trangThai)) {
    throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'Đơn không còn ở trạng thái cần thanh toán');
  }
  const { bang } = await bangTinhTienDon(don, { maGiamGia, soDiem, goiGioChoiId });
  if (bang.conLai <= 0) throw loi.xungDot('DON_DA_THANH_TOAN', 'Đơn đã được thanh toán đủ');
  let tienThua = 0;
  if (phuongThuc === 'TIEN_MAT') {
    const dua = Number(tienKhachDua) || 0;
    if (dua < bang.phaiTra) throw loi.duLieu(`Khách cần đưa ít nhất ${dinhDangTien(bang.phaiTra)}`);
    tienThua = dua - bang.phaiTra;
  }
  const kq = await prisma.$transaction(async (tx) => {
    await tx.thanhToan.updateMany({ where: { donDatSanId: don.id, trangThai: 'CHO_XU_LY' }, data: { trangThai: 'THAT_BAI' } });
    const r = await ghiNhanThanhToanDon(tx, don.id, { maGiamGia, soDiem, goiGioChoiId }, { phuongThuc, soTien: bang.phaiTra, nhanVienId: nhanVien.vaiTro === 'LE_TAN' ? nhanVien.id : null });
    await ghiNhatKy(nhanVien.id, 'THU_TIEN', 'don_dat_san', don.id, { soTien: bang.phaiTra, phuongThuc }, tx);
    return r;
  });
  thongBaoDaThanhToan(kq);
  const sau = await donDatSanRepository.findById(don.id);
  return { bangTinhTien: bang, tienThua, hoaDon: kq.hoaDon?.maHoaDon ?? null, don: sangDTO(sau, { xemNoiBo: true }) };
}

// ---------------------------------------------------------------- UC02.5 – A1: thanh toán chênh lệch khi đổi lịch

export async function taoThanhToanDoiLich(user, don, lichMoi, soTienChenh, ip) {
  const tt = await prisma.thanhToan.create({
    data: {
      khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'THANH_TOAN', phuongThuc: 'VNPAY',
      soTien: soTienChenh, trangThai: 'CHO_XU_LY',
      // Lưu trong CSDL để server khởi động lại giữa chừng vẫn áp dụng/hoàn đúng khoản chênh lệch
      duLieuDoiLich: { ...lichMoi, nguoiThucHienId: user.id, hetHan: congPhut(bayGio(), 10).getTime() },
    },
  });
  const paymentUrl = vnpayGateway.taoUrlThanhToan(tt, { noiDung: `Doi lich don ${don.maDon}`, ip, hetHanLuc: congPhut(bayGio(), 10) });
  return { maGiaoDich: VnpayGateway.maThamChieu(tt.id), paymentUrl };
}

async function ghiNhanDoiLich(tx, tt, maGiaoDich) {
  const cho = tt.duLieuDoiLich;
  await tx.thanhToan.update({ where: { id: tt.id }, data: { trangThai: 'THANH_CONG', maGiaoDichCong: maGiaoDich, thoiGian: bayGio() } });
  const don = await donDatSanRepository.findById(tt.donDatSanId, tx);
  let apDung = false;
  if (cho.hetHan >= bayGio().getTime() && don.trangThai === 'DA_XAC_NHAN') {
    try {
      await kiemTraSanKhung(cho.ngayChoi, cho.dong, { laNhanVien: true, boQuaDonId: don.id, db: tx });
      await apDungDoiLich(tx, don.id, cho, cho.nguoiThucHienId);
      await tx.donDatSan.update({ where: { id: don.id }, data: { tongTien: cho.tongMoi } });
      apDung = true;
    } catch {
      apDung = false;
    }
  }
  if (!apDung) {
    await vnpayGateway.hoanTien(tt, soTien(tt.soTien));
    await tx.thanhToan.create({
      data: {
        khachHangId: don.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'HOAN_TIEN',
        phuongThuc: 'VNPAY', soTien: tt.soTien, trangThai: 'THANH_CONG',
      },
    });
  }
  const hoaDon = await taoHoaDon(tx, tt.id, soTien(tt.soTien));
  return {
    don, hoaDon,
    ghiChu: apDung
      ? `Đơn ${don.maDon} đã đổi lịch thành công sau khi thanh toán chênh lệch ${dinhDangTien(tt.soTien)}.`
      : `Lịch mới của đơn ${don.maDon} không còn trống hoặc quá 10 phút giữ chỗ; đơn giữ lịch cũ và số tiền chênh lệch được hoàn lại.`,
  };
}

// ---------------------------------------------------------------- UC01.4, UC03.2: phí thành viên, gói giờ

export async function dangKyGoiThanhVien(user, goiThanhVienId, ip) {
  const goi = await prisma.goiThanhVien.findUnique({ where: { id: Number(goiThanhVienId) } });
  if (!goi || goi.trangThai !== 'DANG_BAN') throw loi.khongTimThay('hạng thành viên đang mở bán');
  const kh = await thongTinKhach(user.id);
  const du = hanThanhVienMoi({ goiThanhVienId: kh.goiThanhVienId, hanThanhVien: kh.hanThanhVien }, goi, homNay());
  const tt = await prisma.thanhToan.create({
    data: {
      khachHangId: user.id, mucDich: 'GOI_THANH_VIEN', goiThanhVienId: goi.id, loai: 'THANH_TOAN', phuongThuc: 'VNPAY',
      soTien: goi.phi, trangThai: 'CHO_XU_LY',
    },
  });
  const paymentUrl = vnpayGateway.taoUrlThanhToan(tt, { noiDung: `Phi thanh vien ${goi.tenGoi}`, ip, hetHanLuc: congPhut(bayGio(), 15) });
  return { maGiaoDich: VnpayGateway.maThamChieu(tt.id), soTien: soTien(goi.phi), loai: du.loai, hanMoi: du.hanMoi, paymentUrl };
}

async function ghiNhanThanhVien(tx, tt) {
  const goi = await tx.goiThanhVien.findUnique({ where: { id: tt.goiThanhVienId } });
  const kh = await tx.khachHang.findUnique({ where: { nguoiDungId: tt.khachHangId } });
  const du = hanThanhVienMoi({ goiThanhVienId: kh.goiThanhVienId, hanThanhVien: chuoiNgay(kh.hanThanhVien) }, goi, homNay());
  await tx.khachHang.update({ where: { nguoiDungId: kh.nguoiDungId }, data: { goiThanhVienId: goi.id, hanThanhVien: sangNgayDb(du.hanMoi) } });
  const hoaDon = await taoHoaDon(tx, tt.id, soTien(tt.soTien));
  return {
    khachHangId: kh.nguoiDungId,
    hoaDon,
    ghiChu: `Bạn đã ${du.loai === 'GIA_HAN' ? 'gia hạn' : du.loai === 'NANG_HANG' ? 'nâng lên' : 'đăng ký'} hạng ${goi.tenGoi}, hiệu lực đến ${hienThiNgay(du.hanMoi)}. Hóa đơn ${hoaDon.maHoaDon}.`,
  };
}

export async function muaGoiGio(user, loaiGoiGioId, ip) {
  const loai = await prisma.loaiGoiGio.findUnique({ where: { id: Number(loaiGoiGioId) } });
  if (!loai) throw loi.khongTimThay('loại gói giờ');
  const tt = await prisma.$transaction(async (tx) => {
    // Tạo sẵn bản ghi gói rỗng; số giờ / số dư chỉ được nạp khi thanh toán thành công
    const goi = await tx.goiGioChoi.create({
      data: {
        khachHangId: user.id, loaiGoiGioId: loai.id, soGioConLai: loai.loai === 'GOI_GIO' ? 0 : null,
        soDuConLai: loai.loai === 'THE_TRA_TRUOC' ? 0 : null, ngayMua: bayGio(), hanSuDung: sangNgayDb(homNay()),
      },
    });
    return tx.thanhToan.create({
      data: {
        khachHangId: user.id, mucDich: 'MUA_GOI_GIO', goiGioChoiId: goi.id, loai: 'THANH_TOAN', phuongThuc: 'VNPAY',
        soTien: loai.giaBan, trangThai: 'CHO_XU_LY',
      },
    });
  });
  const paymentUrl = vnpayGateway.taoUrlThanhToan(tt, { noiDung: `Mua ${loai.tenGoi}`, ip, hetHanLuc: congPhut(bayGio(), 15) });
  return { maGiaoDich: VnpayGateway.maThamChieu(tt.id), soTien: soTien(loai.giaBan), paymentUrl };
}

async function ghiNhanGoiGio(tx, tt) {
  const goi = await tx.goiGioChoi.findUnique({ where: { id: tt.goiGioChoiId }, include: { loaiGoiGio: true } });
  const l = goi.loaiGoiGio;
  const han = congNgay(homNay(), l.thoiHanNgay);
  await tx.goiGioChoi.update({
    where: { id: goi.id },
    data: {
      soGioConLai: l.loai === 'GOI_GIO' ? l.soGio : null,
      soDuConLai: l.loai === 'THE_TRA_TRUOC' ? l.menhGia : null,
      ngayMua: bayGio(),
      hanSuDung: sangNgayDb(han),
    },
  });
  const hoaDon = await taoHoaDon(tx, tt.id, soTien(tt.soTien));
  return {
    khachHangId: goi.khachHangId,
    hoaDon,
    ghiChu:
      `Bạn đã mua ${l.tenGoi}: ${l.loai === 'GOI_GIO' ? `${Number(l.soGio)} giờ chơi` : `số dư ${dinhDangTien(l.menhGia)}`}, ` +
      `hạn sử dụng đến ${hienThiNgay(han)}. Hóa đơn ${hoaDon.maHoaDon}.`,
  };
}

/** UC03.2 – A1: lễ tân bán gói giờ hoặc hạng thành viên tại quầy cho khách có tài khoản */
export async function banTaiQuay(nhanVien, { khachHangId, loaiGoiGioId, goiThanhVienId, phuongThuc }) {
  if (!['TIEN_MAT', 'CHUYEN_KHOAN'].includes(phuongThuc)) throw loi.duLieu('Phương thức tại quầy là tiền mặt hoặc chuyển khoản');
  const kh = await prisma.khachHang.findUnique({ where: { nguoiDungId: Number(khachHangId) } });
  if (!kh) throw loi.khongTimThay('tài khoản khách hàng');
  const kq = await prisma.$transaction(async (tx) => {
    let tt;
    if (loaiGoiGioId) {
      const loai = await tx.loaiGoiGio.findUnique({ where: { id: Number(loaiGoiGioId) } });
      if (!loai) throw loi.khongTimThay('loại gói giờ');
      const goi = await tx.goiGioChoi.create({
        data: { khachHangId: kh.nguoiDungId, loaiGoiGioId: loai.id, ngayMua: bayGio(), hanSuDung: sangNgayDb(homNay()) },
      });
      tt = await tx.thanhToan.create({
        data: {
          khachHangId: kh.nguoiDungId, mucDich: 'MUA_GOI_GIO', goiGioChoiId: goi.id, nhanVienThuId: nhanVien.vaiTro === 'LE_TAN' ? nhanVien.id : null,
          loai: 'THANH_TOAN', phuongThuc, soTien: loai.giaBan, trangThai: 'THANH_CONG',
        },
      });
      return ghiNhanGoiGio(tx, tt);
    }
    const goi = await tx.goiThanhVien.findUnique({ where: { id: Number(goiThanhVienId) } });
    if (!goi || goi.trangThai !== 'DANG_BAN') throw loi.khongTimThay('hạng thành viên đang mở bán');
    tt = await tx.thanhToan.create({
      data: {
        khachHangId: kh.nguoiDungId, mucDich: 'GOI_THANH_VIEN', goiThanhVienId: goi.id, nhanVienThuId: nhanVien.vaiTro === 'LE_TAN' ? nhanVien.id : null,
        loai: 'THANH_TOAN', phuongThuc, soTien: goi.phi, trangThai: 'THANH_CONG',
      },
    });
    return ghiNhanThanhVien(tx, tt);
  });
  notificationSender.guiNguoiDung(kq.khachHangId, kq.ghiChu);
  return { hoaDon: kq.hoaDon.maHoaDon, thongBao: kq.ghiChu };
}

// ---------------------------------------------------------------- Kết quả từ cổng VNPAY (Bảng 4.22)

/**
 * Xử lý kết quả giao dịch – dùng chung cho IPN (VNPAY gọi) và trang kết quả (trình duyệt quay về).
 * Cả hai đều xác minh chữ ký; giao dịch chỉ được ghi nhận một lần (lũy đẳng – NFR-07).
 */
export async function xuLyKetQua(params) {
  if (!vnpayGateway.xacMinhChuKy(params)) return { RspCode: '97', Message: 'Invalid signature' };
  const id = VnpayGateway.idTuMaThamChieu(params.vnp_TxnRef);
  const tt = id ? await thanhToanRepository.findById(id) : null;
  if (!tt) return { RspCode: '01', Message: 'Order not found' };
  if (Number(params.vnp_Amount) / 100 !== soTien(tt.soTien)) return { RspCode: '04', Message: 'Invalid amount', thanhToan: tt };
  const maGiaoDich = params.vnp_TransactionNo ? `VNP${params.vnp_TransactionNo}` : null;
  if (tt.trangThai !== 'CHO_XU_LY' || (maGiaoDich && (await thanhToanRepository.existsByMaGiaoDichCong(maGiaoDich)))) {
    return { RspCode: '02', Message: 'Order already confirmed', thanhToan: tt };
  }
  const thanhCong = params.vnp_ResponseCode === '00' && (params.vnp_TransactionStatus ?? '00') === '00';

  const kq = await prisma.$transaction(async (tx) => {
    // Khóa bản ghi: chỉ một tiến trình chuyển được giao dịch khỏi trạng thái “Chờ xử lý”
    if (!thanhCong) {
      const n = await tx.thanhToan.updateMany({ where: { id: tt.id, trangThai: 'CHO_XU_LY' }, data: { trangThai: 'THAT_BAI' } });
      return n.count ? { thatBai: true } : { daXuLy: true };
    }
    const n = await tx.thanhToan.updateMany({ where: { id: tt.id, trangThai: 'CHO_XU_LY' }, data: { maGiaoDichCong: maGiaoDich } });
    if (!n.count) return { daXuLy: true };
    if (tt.mucDich === 'GOI_THANH_VIEN') {
      await tx.thanhToan.update({ where: { id: tt.id }, data: { trangThai: 'THANH_CONG', thoiGian: bayGio() } });
      return ghiNhanThanhVien(tx, tt);
    }
    if (tt.mucDich === 'MUA_GOI_GIO') {
      await tx.thanhToan.update({ where: { id: tt.id }, data: { trangThai: 'THANH_CONG', thoiGian: bayGio() } });
      return ghiNhanGoiGio(tx, tt);
    }
    if (tt.duLieuDoiLich) return ghiNhanDoiLich(tx, tt, maGiaoDich);
    const don = await tx.donDatSan.findUnique({ where: { id: tt.donDatSanId }, include: { maGiamGia: true } });
    if (don.trangThai === 'DA_HUY') {
      // Đơn đã bị hủy trong lúc khách đang thanh toán: ghi nhận rồi hoàn lại toàn bộ
      await tx.thanhToan.update({ where: { id: tt.id }, data: { trangThai: 'THANH_CONG', thoiGian: bayGio() } });
      await vnpayGateway.hoanTien(tt, soTien(tt.soTien));
      await tx.thanhToan.create({
        data: { khachHangId: tt.khachHangId, mucDich: 'DAT_SAN', donDatSanId: don.id, loai: 'HOAN_TIEN', phuongThuc: 'VNPAY', soTien: tt.soTien, trangThai: 'THANH_CONG' },
      });
      return { don, ghiChu: `Đơn ${don.maDon} đã bị hủy trước khi thanh toán xong, số tiền vừa thu được hoàn lại.` };
    }
    return ghiNhanThanhToanDon(
      tx,
      don.id,
      { soDiem: tt.soDiemSuDung ?? 0, goiGioChoiId: tt.goiGioChoiId, maGiamGia: don.maGiamGia?.ma },
      { thanhToanChoId: tt.id, maGiaoDich, phuongThuc: 'VNPAY', soTien: soTien(tt.soTien) },
    );
  });

  if (kq.daXuLy) return { RspCode: '02', Message: 'Order already confirmed', thanhToan: tt };
  if (kq.thatBai) return { RspCode: '00', Message: 'Confirm Success', thanhCong: false, thanhToan: tt };
  if (kq.don) thongBaoDaThanhToan(kq);
  else if (kq.khachHangId) notificationSender.guiNguoiDung(kq.khachHangId, kq.ghiChu);
  return { RspCode: '00', Message: 'Confirm Success', thanhCong: true, thanhToan: tt, ghiChu: kq.ghiChu, hoaDon: kq.hoaDon?.maHoaDon };
}

/** Kết quả hiển thị cho trang /thanh-toan/ket-qua sau khi trình duyệt quay về */
export async function ketQuaChoTrinhDuyet(params) {
  const r = await xuLyKetQua(params);
  if (r.RspCode === '97') throw loi.duLieu('Chữ ký kết quả thanh toán không hợp lệ');
  if (!r.thanhToan) throw loi.khongTimThay('giao dịch', 'KHONG_TIM_THAY_GIAO_DICH');
  const tt = await thanhToanRepository.findById(r.thanhToan.id);
  return {
    maGiaoDich: VnpayGateway.maThamChieu(tt.id),
    thanhCong: tt.trangThai === 'THANH_CONG',
    trangThai: tt.trangThai,
    mucDich: tt.mucDich,
    soTien: soTien(tt.soTien),
    maDon: tt.donDatSan?.maDon ?? null,
    maHoaDon: tt.hoaDon?.maHoaDon ?? null,
    ghiChu: r.ghiChu ?? null,
  };
}

/** Chỉ ở chế độ giả lập: tạo tham số kết quả có chữ ký như VNPAY gửi về */
export async function giaLapKetQua(user, txnRef, thanhCong) {
  if (!vnpayGateway.laGiaLap) throw loi.khongDuQuyen('Chức năng giả lập chỉ dùng khi VNPAY_MODE=mock');
  const id = VnpayGateway.idTuMaThamChieu(txnRef);
  const tt = id ? await prisma.thanhToan.findUnique({ where: { id } }) : null;
  if (!tt) throw loi.khongTimThay('giao dịch', 'KHONG_TIM_THAY_GIAO_DICH');
  if (user.vaiTro === 'KHACH_HANG' && tt.khachHangId !== user.id) throw loi.khongDuQuyen();
  return vnpayGateway.taoKetQuaGiaLap({ txnRef, soTien: soTien(tt.soTien), thanhCong });
}

// ---------------------------------------------------------------- Hóa đơn (FR-23)

export async function layHoaDon(user, maHoaDon) {
  const hd = await prisma.hoaDon.findUnique({
    where: { maHoaDon },
    include: {
      thanhToan: {
        include: {
          donDatSan: { include: { chiTiet: { include: { san: true, khungGio: true } }, chiTietDichVu: { include: { dichVu: true } }, buoiHoc: true } },
          khachHang: { include: { nguoiDung: { select: { hoTen: true, soDienThoai: true, email: true } } } },
          goiThanhVien: true,
          goiGioChoi: { include: { loaiGoiGio: true } },
        },
      },
    },
  });
  if (!hd) throw loi.khongTimThay('hóa đơn', 'KHONG_TIM_THAY_HOA_DON');
  const laNhanVien = ['LE_TAN', 'QUAN_LY'].includes(user.vaiTro);
  if (!laNhanVien && hd.thanhToan.khachHangId !== user.id) throw loi.khongDuQuyen();
  const t = hd.thanhToan;
  const ds = [];
  if (t.mucDich === 'DAT_SAN' && t.donDatSan) {
    const d = t.donDatSan;
    for (const c of d.chiTiet.filter((x) => x.conHieuLuc === 1 || d.trangThai !== 'DA_XAC_NHAN')) {
      ds.push({ noiDung: `${c.san.tenSan} ${c.khungGio.gioBatDau.toISOString().slice(11, 16)} ngày ${hienThiNgay(chuoiNgay(c.ngayChoi))}`, soLuong: 1, donGia: soTien(c.donGia) });
    }
    for (const x of d.chiTietDichVu) ds.push({ noiDung: x.dichVu.tenDichVu, soLuong: x.soLuong, donGia: soTien(x.donGia) });
    for (const b of d.buoiHoc.filter((x) => x.trangThai !== 'DA_HUY')) ds.push({ noiDung: 'Học phí huấn luyện viên', soLuong: 1, donGia: soTien(b.hocPhi) });
  } else if (t.mucDich === 'GOI_THANH_VIEN') {
    ds.push({ noiDung: `Phí thành viên hạng ${t.goiThanhVien.tenGoi}`, soLuong: 1, donGia: soTien(t.soTien) });
  } else if (t.goiGioChoi) {
    ds.push({ noiDung: t.goiGioChoi.loaiGoiGio.tenGoi, soLuong: 1, donGia: soTien(t.soTien) });
  }
  return {
    maHoaDon: hd.maHoaDon,
    ngayLap: hd.ngayLap,
    tongTien: soTien(hd.tongTien),
    khach: t.khachHang ? t.khachHang.nguoiDung : { hoTen: t.donDatSan?.hoTenKhach, soDienThoai: t.donDatSan?.sdtKhach },
    maDon: t.donDatSan?.maDon ?? null,
    tongTienDon: t.donDatSan ? soTien(t.donDatSan.tongTien) : null,
    phuongThuc: t.phuongThuc,
    dong: ds,
  };
}

/** Danh sách gói giờ đã mua của khách (trang cá nhân) */
export async function goiCuaToi(user) {
  const ds = await prisma.goiGioChoi.findMany({
    where: { khachHangId: user.id, thanhToan: { some: { mucDich: 'MUA_GOI_GIO', trangThai: 'THANH_CONG' } } },
    include: { loaiGoiGio: true },
    orderBy: { ngayMua: 'desc' },
  });
  return ds.map((g) => ({
    id: g.id,
    tenGoi: g.loaiGoiGio.tenGoi,
    loai: g.loaiGoiGio.loai,
    soGioConLai: g.soGioConLai === null ? null : Number(g.soGioConLai),
    soDuConLai: g.soDuConLai === null ? null : soTien(g.soDuConLai),
    ngayMua: g.ngayMua,
    hanSuDung: chuoiNgay(g.hanSuDung),
    conHan: chuoiNgay(g.hanSuDung) >= homNay(),
  }));
}

export { kiemTraGoiGio };

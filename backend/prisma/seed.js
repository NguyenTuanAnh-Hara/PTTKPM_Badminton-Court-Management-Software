// Dữ liệu mẫu: 18 khung giờ, 8 sân, bảng giá, ngày lễ, tài khoản 4 vai trò, dịch vụ, ưu đãi, đơn mẫu cho báo cáo.
// Chạy: npm run db:setup (xóa sạch CSDL rồi tạo lại) hoặc npm run db:seed (chỉ thêm dữ liệu mẫu).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { congNgay, homNay, sangGioDb, sangNgayDb, thoiDiem, thuCuaNgay as xacNgayThu } from '../src/utils/thoiGian.js';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAT_KHAU_MAU = 'MatKhau123';
const gio = (h) => `${String(h).padStart(2, '0')}:00`;

async function apDungCheck() {
  const sql = fs.readFileSync(path.join(__dirname, 'check_constraints.sql'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(';').map((s) => s.trim()).filter(Boolean);
  for (const cau of sql) {
    try {
      await prisma.$executeRawUnsafe(cau);
    } catch (e) {
      if (!/Duplicate|already exists|3822/.test(e.message)) console.warn('Bỏ qua ràng buộc:', e.message.split('\n')[0]);
    }
  }
}

async function main() {
  if (await prisma.nguoiDung.count()) {
    console.log('CSDL đã có dữ liệu – bỏ qua seed. Dùng "npm run db:setup" để tạo lại từ đầu.');
    await apDungCheck();
    return;
  }
  console.log('Đang tạo dữ liệu mẫu…');
  await apDungCheck();

  // 18 khung giờ 05:00 → 23:00
  await prisma.khungGio.createMany({
    data: Array.from({ length: 18 }, (_, i) => ({ id: i + 1, gioBatDau: sangGioDb(gio(5 + i)), gioKetThuc: sangGioDb(gio(6 + i)) })),
  });

  // 8 sân
  await prisma.san.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      tenSan: `Sân ${i + 1}`,
      loaiSan: i < 6 ? 'Thảm PVC tiêu chuẩn' : 'Thảm thi đấu cao cấp',
      trangThai: 'HOAT_DONG',
      moTa: i < 6 ? null : 'Sân thi đấu, ánh sáng chống chói',
    })),
  });

  // Bảng giá (Bảng 3.5c dùng giá cuối tuần 100.000 / 150.000 đ)
  const apDungTu = sangNgayDb('2026-01-01');
  const bang = {
    NGAY_THUONG: [['05:00', '17:00', 80000], ['17:00', '22:00', 120000], ['22:00', '23:00', 80000]],
    CUOI_TUAN: [['05:00', '17:00', 100000], ['17:00', '22:00', 150000], ['22:00', '23:00', 100000]],
    NGAY_LE: [['05:00', '17:00', 120000], ['17:00', '23:00', 180000]],
  };
  for (const [loaiNgay, ds] of Object.entries(bang)) {
    await prisma.khungGia.createMany({
      data: ds.map(([bd, kt, g]) => ({ loaiNgay, gioBatDau: sangGioDb(bd), gioKetThuc: sangGioDb(kt), donGia: g, apDungTu })),
    });
  }
  await prisma.ngayLe.createMany({
    data: [
      ['2026-01-01', 'Tết Dương lịch'], ['2026-02-16', 'Tết Nguyên đán'], ['2026-02-17', 'Tết Nguyên đán'],
      ['2026-02-18', 'Tết Nguyên đán'], ['2026-02-19', 'Tết Nguyên đán'], ['2026-02-20', 'Tết Nguyên đán'],
      ['2026-04-26', 'Giỗ Tổ Hùng Vương'], ['2026-04-30', 'Ngày Giải phóng miền Nam'], ['2026-05-01', 'Quốc tế Lao động'],
      ['2026-09-01', 'Quốc khánh'], ['2026-09-02', 'Quốc khánh'], ['2027-01-01', 'Tết Dương lịch'],
    ].map(([ngay, tenNgayLe]) => ({ ngay: sangNgayDb(ngay), tenNgayLe })),
  });

  // Hạng thành viên (QT-20), gói giờ, mã giảm giá
  const [bac, vang] = await Promise.all([
    prisma.goiThanhVien.create({ data: { tenGoi: 'Bạc', phi: 99000, thoiHanNgay: 30, heSoTichDiem: 1.0, phanTramGiam: 5, trangThai: 'DANG_BAN' } }),
    prisma.goiThanhVien.create({ data: { tenGoi: 'Vàng', phi: 199000, thoiHanNgay: 30, heSoTichDiem: 1.5, phanTramGiam: 10, trangThai: 'DANG_BAN' } }),
    prisma.goiThanhVien.create({ data: { tenGoi: 'Kim Cương', phi: 299000, thoiHanNgay: 30, heSoTichDiem: 2.0, phanTramGiam: 15, trangThai: 'DANG_BAN' } }),
  ]);
  const goi10 = await prisma.loaiGoiGio.create({ data: { tenGoi: 'Gói 10 giờ chơi', loai: 'GOI_GIO', soGio: 10, giaBan: 750000, thoiHanNgay: 90 } });
  await prisma.loaiGoiGio.create({ data: { tenGoi: 'Gói 20 giờ chơi', loai: 'GOI_GIO', soGio: 20, giaBan: 1400000, thoiHanNgay: 120 } });
  await prisma.loaiGoiGio.create({ data: { tenGoi: 'Thẻ trả trước 550K', loai: 'THE_TRA_TRUOC', menhGia: 550000, giaBan: 500000, thoiHanNgay: 180 } });
  await prisma.maGiamGia.createMany({
    data: [
      { ma: 'GIAM20', phanTramGiam: 20, giamToiDa: 50000, soLuotToiDa: 100, ngayBatDau: sangNgayDb('2026-01-01'), ngayKetThuc: sangNgayDb('2027-12-31') },
      { ma: 'CHAOBANMOI', phanTramGiam: 10, giamToiDa: 30000, soLuotToiDa: 500, ngayBatDau: sangNgayDb('2026-01-01'), ngayKetThuc: sangNgayDb('2027-12-31') },
    ],
  });

  // Dịch vụ (FR-34)
  await prisma.dichVu.createMany({
    data: [
      { tenDichVu: 'Vợt Yonex Astrox', loai: 'THIET_BI', donGia: 20000, tienCoc: 200000, soLuongTon: 20, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Vợt Lining Windstorm', loai: 'THIET_BI', donGia: 15000, tienCoc: 150000, soLuongTon: 15, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Giày cầu lông', loai: 'THIET_BI', donGia: 30000, tienCoc: 300000, soLuongTon: 10, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Nước suối Aquafina', loai: 'DO_UONG', donGia: 10000, soLuongTon: 200, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Nước điện giải Revive', loai: 'DO_UONG', donGia: 15000, soLuongTon: 150, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Trà chanh', loai: 'DO_UONG', donGia: 20000, soLuongTon: 100, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Ống cầu Thành Công (12 quả)', loai: 'DICH_VU_KHAC', donGia: 180000, soLuongTon: 40, trangThai: 'DANG_BAN' },
      { tenDichVu: 'Khăn lạnh', loai: 'DICH_VU_KHAC', donGia: 5000, soLuongTon: 300, trangThai: 'DANG_BAN' },
    ],
  });

  // Tài khoản mẫu – mật khẩu chung MatKhau123
  const hash = await bcrypt.hash(MAT_KHAU_MAU, 10);
  const tao = (hoTen, soDienThoai, email, vaiTro, them = {}) =>
    prisma.nguoiDung.create({ data: { hoTen, soDienThoai, email, vaiTro, matKhauHash: hash, ...them } });
  await tao('Nguyễn Văn Quản', '0900000001', 'quanly@sancaulong.vn', 'QUAN_LY');
  const letan = await tao('Trần Thị Lễ', '0900000002', 'letan@sancaulong.vn', 'LE_TAN', { leTan: { create: { caLamViec: 'Ca sáng 05:00 – 14:00' } } });
  await tao('Phạm Văn Tân', '0900000003', 'letan2@sancaulong.vn', 'LE_TAN', { leTan: { create: { caLamViec: 'Ca chiều 14:00 – 23:00' } } });
  const hlv1 = await tao('Lê Minh Huấn', '0900000004', 'hlv@sancaulong.vn', 'HLV', { hlv: { create: { chuyenMon: 'Kỹ thuật cơ bản, đánh đơn', hocPhiGio: 200000 } } });
  const hlv2 = await tao('Đỗ Thu Hà', '0900000005', 'hlv2@sancaulong.vn', 'HLV', { hlv: { create: { chuyenMon: 'Đánh đôi, thể lực', hocPhiGio: 250000 } } });
  const kh1 = await tao('Nguyễn Tuấn Anh', '0911111111', 'khach@sancaulong.vn', 'KHACH_HANG', {
    khachHang: { create: { goiThanhVienId: vang.id, hanThanhVien: sangNgayDb(congNgay(homNay(), 20)), diemThuong: 500 } },
  });
  const kh2 = await tao('Hoàng Thị Mai', '0922222222', 'mai@sancaulong.vn', 'KHACH_HANG', {
    khachHang: { create: { goiThanhVienId: bac.id, hanThanhVien: sangNgayDb(congNgay(homNay(), 5)), diemThuong: 120 } },
  });
  const kh3 = await tao('Vũ Đức Long', '0933333333', 'long@sancaulong.vn', 'KHACH_HANG', { khachHang: { create: {} } });

  // Gói giờ đã mua của khách 1
  const goiMua = await prisma.goiGioChoi.create({
    data: { khachHangId: kh1.id, loaiGoiGioId: goi10.id, soGioConLai: 10, ngayMua: new Date(), hanSuDung: sangNgayDb(congNgay(homNay(), 90)) },
  });
  await prisma.thanhToan.create({
    data: { khachHangId: kh1.id, mucDich: 'MUA_GOI_GIO', goiGioChoiId: goiMua.id, loai: 'THANH_TOAN', phuongThuc: 'VNPAY', soTien: 750000, trangThai: 'THANH_CONG', maGiaoDichCong: 'VNPSEED0001' },
  });

  // Lịch rảnh HLV 7 ngày tới
  for (let i = 0; i < 7; i++) {
    const ngay = sangNgayDb(congNgay(homNay(), i));
    await prisma.lichRanhHlv.create({ data: { hlvId: hlv1.id, ngay, gioBatDau: sangGioDb('17:00'), gioKetThuc: sangGioDb('21:00') } });
    await prisma.lichRanhHlv.create({ data: { hlvId: hlv2.id, ngay, gioBatDau: sangGioDb('06:00'), gioKetThuc: sangGioDb('10:00') } });
  }

  // Đơn mẫu trong 21 ngày qua (đã hoàn thành, có thanh toán) để báo cáo có số liệu
  const dsKhungGia = await prisma.khungGia.findMany();
  const ngayLe = new Set((await prisma.ngayLe.findMany()).map((n) => n.ngay.toISOString().slice(0, 10)));
  const gia = (ngay, h) => {
    const thu = xacNgayThu(ngay);
    const loai = ngayLe.has(ngay) ? 'NGAY_LE' : thu === 0 || thu === 6 ? 'CUOI_TUAN' : 'NGAY_THUONG';
    const g = dsKhungGia.find((k) => k.loaiNgay === loai && k.gioBatDau.toISOString().slice(11, 13) <= gio(h).slice(0, 2) && gio(h).slice(0, 2) < k.gioKetThuc.toISOString().slice(11, 13));
    return g;
  };
  const dsKhach = [kh1.id, kh2.id, kh3.id, null];
  let dem = 0;
  for (let lui = 21; lui >= 1; lui--) {
    const ngay = congNgay(homNay(), -lui);
    const soDon = 3 + ((lui * 7) % 5);
    for (let k = 0; k < soDon; k++) {
      dem++;
      const sanId = 1 + ((lui + k * 3) % 8);
      const h = [6, 9, 17, 18, 19, 20, 15][(lui + k) % 7];
      const soKhung = 1 + ((lui + k) % 2);
      const khach = dsKhach[(lui + k) % 4];
      const dong = Array.from({ length: soKhung }, (_, j) => ({ h: h + j, g: gia(ngay, h + j) }));
      const tien = dong.reduce((s, x) => s + Number(x.g.donGia), 0);
      const khongDen = lui === 10 && k === 0;
      const don = await prisma.donDatSan.create({
        data: {
          maDon: `DSMAU${String(dem).padStart(4, '0')}`,
          khachHangId: khach,
          hoTenKhach: khach ? null : 'Khách vãng lai',
          sdtKhach: khach ? null : '0987654321',
          nhanVienLapId: khach ? null : letan.id,
          kenhDat: khach ? 'TRUC_TUYEN' : 'TAI_QUAY',
          trangThai: khongDen ? 'KHONG_DEN' : 'DA_HOAN_THANH',
          tongTien: tien,
          ngayTao: thoiDiem(congNgay(ngay, -1), '20:00'),
          thoiGianCheckIn: khongDen ? null : thoiDiem(ngay, gio(h)),
          chiTiet: {
            create: dong.map((x) => ({
              sanId, ngayChoi: sangNgayDb(ngay), khungGioId: x.h - 4, khungGiaId: x.g.id, donGia: x.g.donGia, conHieuLuc: khongDen ? null : 1,
            })),
          },
        },
      });
      if (k % 3 === 1) {
        await prisma.chiTietDichVu.create({ data: { donDatSanId: don.id, dichVuId: 4, soLuong: 2, donGia: 10000, trangThai: 'DA_GIAO', nhanVienGhiNhanId: letan.id } });
        await prisma.donDatSan.update({ where: { id: don.id }, data: { tongTien: tien + 20000 } });
      }
      await prisma.thanhToan.create({
        data: {
          khachHangId: khach, mucDich: 'DAT_SAN', donDatSanId: don.id, nhanVienThuId: khach ? null : letan.id,
          loai: 'THANH_TOAN', phuongThuc: khach ? 'VNPAY' : 'TIEN_MAT', soTien: tien + (k % 3 === 1 ? 20000 : 0),
          trangThai: 'THANH_CONG', thoiGian: thoiDiem(congNgay(ngay, -1), '20:05'), maGiaoDichCong: khach ? `VNPSEED${dem + 1000}` : null,
        },
      });
    }
  }
  await prisma.khachHang.update({ where: { nguoiDungId: kh1.id }, data: { soLanNoShow: 1 } });
  console.log(`Đã tạo dữ liệu mẫu (${dem} đơn mẫu). Mật khẩu của mọi tài khoản mẫu: ${MAT_KHAU_MAU}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Kiểm thử đơn vị các thành phần dùng CSDL hoặc dịch vụ ngoài, thay CSDL bằng đối tượng giả (Bảng 5.7)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GiaCalculator } from '../../src/services/rules/giaCalculator.js';
import { VnpayGateway } from '../../src/agents/vnpayGateway.js';

// CSDL giả cho GiaCalculator: chỉ cài hai bảng ngayLe, khungGia
const db = (ngayLe, khungGia) => ({
  ngayLe: { findUnique: async ({ where }) => (ngayLe.includes(where.ngay.toISOString().slice(0, 10)) ? { ngay: where.ngay } : null) },
  khungGia: { findMany: async ({ where }) => khungGia.filter((k) => k.loaiNgay === where.loaiNgay) },
});
const gio = (s) => new Date(`1970-01-01T${s}:00.000Z`);
const ngay = (s) => new Date(`${s}T00:00:00.000Z`);
const kg = (id, loaiNgay, bd, kt, donGia) => ({ id, loaiNgay, gioBatDau: gio(bd), gioKetThuc: gio(kt), apDungTu: ngay('2026-01-01'), apDungDen: null, donGia });
const BANG_GIA = [
  kg(1, 'NGAY_THUONG', '05:00', '17:00', 80000), kg(2, 'NGAY_THUONG', '17:00', '22:00', 120000), kg(3, 'NGAY_THUONG', '22:00', '23:00', 80000),
  kg(4, 'CUOI_TUAN', '05:00', '17:00', 100000), kg(5, 'CUOI_TUAN', '17:00', '22:00', 150000),
  kg(6, 'NGAY_LE', '05:00', '17:00', 120000), kg(7, 'NGAY_LE', '17:00', '23:00', 180000),
];
const khung = (id, bd, kt) => ({ id, gioBatDau: gio(bd), gioKetThuc: gio(kt) });

test('UT-17 GiaCalculator.bangGiaNgay(): đơn giá và hệ số trừ giờ theo loại ngày (dữ liệu mẫu)', async () => {
  const gc = new GiaCalculator(db(['2026-09-02'], BANG_GIA));
  const ds = [khung(1, '05:00', '06:00'), khung(13, '17:00', '18:00'), khung(18, '22:00', '23:00')];
  const thuong = await gc.bangGiaNgay('2026-10-27', ds); // thứ Ba
  assert.equal(thuong.loaiNgay, 'NGAY_THUONG');
  assert.deepEqual([...thuong.bang.values()].map((x) => [x.donGia, x.heSo]), [[80000, 1], [120000, 1.5], [80000, 1]]);
  const cuoiTuan = await gc.bangGiaNgay('2026-10-31', ds); // thứ Bảy, chưa có giá 22:00
  assert.deepEqual([...cuoiTuan.bang.keys()], [1, 13]);
  const le = await gc.bangGiaNgay('2026-09-02', ds);
  assert.equal(le.loaiNgay, 'NGAY_LE');
  assert.equal(le.bang.get(13).donGia, 180000);
});

test('UT-18 GiaCalculator.donGia(): báo CHUA_CO_BANG_GIA khi khung chưa được cấu hình giá', async () => {
  const gc = new GiaCalculator(db([], BANG_GIA));
  await assert.rejects(gc.donGia('2026-10-31', khung(18, '22:00', '23:00')), (e) => e.code === 'CHUA_CO_BANG_GIA' && e.status === 422);
});

const cong = new VnpayGateway({ mode: 'sandbox', tmnCode: 'TESTCODE', hashSecret: 'BIMATKIEMTHU', url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' });

test('UT-19 VnpayGateway.taoUrlThanhToan(): số tiền × 100, mã tham chiếu TT{id}, có chữ ký hợp lệ', () => {
  const url = new URL(cong.taoUrlThanhToan({ id: 42, soTien: 250000 }, { noiDung: 'Thanh toan don DS2610ABCD' }));
  const p = Object.fromEntries(url.searchParams);
  assert.equal(p.vnp_Amount, '25000000');
  assert.equal(p.vnp_TxnRef, 'TT42');
  assert.equal(p.vnp_TmnCode, 'TESTCODE');
  assert.equal(p.vnp_SecureHash.length, 128); // HMAC-SHA512 dạng hex
  assert.ok(cong.xacMinhChuKy(p));
  assert.equal(VnpayGateway.idTuMaThamChieu('TT42'), 42);
  assert.equal(VnpayGateway.idTuMaThamChieu('XX42'), null);
});

test('UT-20 VnpayGateway.xacMinhChuKy(): từ chối khi bị sửa số tiền, sai khóa bí mật hoặc thiếu chữ ký', () => {
  const kq = cong.taoKetQuaGiaLap({ txnRef: 'TT42', soTien: 250000, thanhCong: true });
  assert.ok(cong.xacMinhChuKy(kq));
  assert.ok(!cong.xacMinhChuKy({ ...kq, vnp_Amount: '100' }));
  assert.ok(!cong.xacMinhChuKy({ ...kq, vnp_ResponseCode: '24' }));
  assert.ok(!cong.xacMinhChuKy({ ...kq, vnp_SecureHash: '' }));
  const congKhac = new VnpayGateway({ mode: 'sandbox', hashSecret: 'KHOAKHAC' });
  assert.ok(!congKhac.xacMinhChuKy(kq));
});

test('UT-21 VnpayGateway chế độ giả lập: URL trỏ tới trang giả lập, không gọi cổng thật', () => {
  const gl = new VnpayGateway({ mode: 'mock' });
  assert.ok(gl.laGiaLap);
  const url = new URL(gl.taoUrlThanhToan({ id: 7, soTien: 80000 }, { noiDung: 'x' }));
  assert.equal(url.pathname, '/thanh-toan/gia-lap');
  assert.equal(url.searchParams.get('txnRef'), 'TT7');
});

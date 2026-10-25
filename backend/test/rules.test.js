// Kiểm thử đơn vị các quy tắc nghiệp vụ (mục 3.2.5). Chạy: npm run test:rules
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tinhBangTien, xacDinhLoaiNgay, timKhungGia, heSoTruGio } from '../src/services/rules/giaCalculator.js';
import { tyLeHoan, heSoHoan, phanBoHoan } from '../src/services/rules/hoanTienPolicy.js';
import { diemTichLuy, hanThanhVienMoi } from '../src/services/rules/diemThuongPolicy.js';
import { choPhepChuyen } from '../src/services/rules/trangThaiDon.js';

test('QT-07: loại ngày', () => {
  const le = new Set(['2026-09-02']);
  assert.equal(xacDinhLoaiNgay('2026-09-02', le), 'NGAY_LE'); // thứ Tư nhưng là ngày lễ
  assert.equal(xacDinhLoaiNgay('2026-10-31', le), 'CUOI_TUAN'); // thứ Bảy
  assert.equal(xacDinhLoaiNgay('2026-11-01', le), 'CUOI_TUAN'); // Chủ nhật
  assert.equal(xacDinhLoaiNgay('2026-10-26', le), 'NGAY_THUONG'); // thứ Hai
});

test('QT-08: chọn khung giá đang hiệu lực chứa giờ bắt đầu', () => {
  const ds = [
    { id: 1, loaiNgay: 'CUOI_TUAN', gioBatDau: '05:00', gioKetThuc: '17:00', apDungTu: '2026-01-01', apDungDen: null, donGia: 100000 },
    { id: 2, loaiNgay: 'CUOI_TUAN', gioBatDau: '17:00', gioKetThuc: '22:00', apDungTu: '2026-01-01', apDungDen: '2026-10-31', donGia: 150000 },
    { id: 3, loaiNgay: 'CUOI_TUAN', gioBatDau: '17:00', gioKetThuc: '22:00', apDungTu: '2026-11-01', apDungDen: null, donGia: 160000 },
  ];
  assert.equal(timKhungGia(ds, '2026-10-31', 'CUOI_TUAN', '16:00').id, 1);
  assert.equal(timKhungGia(ds, '2026-10-31', 'CUOI_TUAN', '17:00').id, 2);
  assert.equal(timKhungGia(ds, '2026-11-01', 'CUOI_TUAN', '18:00').id, 3);
  assert.equal(timKhungGia(ds, '2026-11-01', 'NGAY_THUONG', '18:00'), null);
});

test('Bảng 3.5c: ví dụ tính tiền ra 250.000 đ', () => {
  const kq = tinhBangTien({
    tienSan: 300000, tienDichVu: 40000, phanTramHang: 10,
    ma: { phanTramGiam: 20, giamToiDa: 50000 }, soDiem: 100, diemHienCo: 500,
  });
  assert.equal(kq.tamTinh, 340000);
  assert.equal(kq.giamHang, 30000);
  assert.equal(kq.giamMa, 50000);
  assert.equal(kq.truDiem, 10000);
  assert.equal(kq.phaiTra, 250000);
});

test('QT-22: điểm vượt 50% hoặc không phải bội số 10 bị từ chối', () => {
  assert.throws(() => tinhBangTien({ tienSan: 100000, soDiem: 15, diemHienCo: 100 }), /bội số/);
  assert.throws(() => tinhBangTien({ tienSan: 100000, soDiem: 600, diemHienCo: 1000 }), /tối đa 500/);
});

test('QT-23: gói giờ trừ 1 giờ khung thường, 1,5 giờ khung cao điểm', () => {
  assert.equal(heSoTruGio('09:00', 'NGAY_THUONG'), 1);
  assert.equal(heSoTruGio('18:00', 'NGAY_THUONG'), 1.5);
  assert.equal(heSoTruGio('09:00', 'CUOI_TUAN'), 1.5);
  const kq = tinhBangTien({
    tienSan: 240000,
    goi: { loai: 'GOI_GIO', soGioConLai: 2 },
    khungChoGoi: [{ donGia: 120000, heSo: 1.5 }, { donGia: 120000, heSo: 1.5 }],
  });
  assert.equal(kq.truGoi, 120000); // chỉ đủ giờ cho 1 khung
  assert.equal(kq.gioSuDung, 1.5);
  assert.equal(kq.phaiTra, 120000);
});

test('Thanh toán phần còn lại sau khi đã trả một phần', () => {
  const kq = tinhBangTien({ tienSan: 200000, tienDichVu: 30000, daThanhToan: 200000 });
  assert.equal(kq.conLai, 30000);
  assert.equal(kq.phaiTra, 30000);
});

test('QT-11: mức hoàn theo thời gian còn lại', () => {
  assert.deepEqual(tyLeHoan(30), { duocHuy: true, tyLeSan: 1, tyLeKhac: 1 });
  assert.equal(tyLeHoan(5).tyLeSan, 0.5);
  assert.equal(tyLeHoan(1).duocHuy, false);
  assert.equal(tyLeHoan(1, true).duocHuy, true); // QT-15: hủy do phía sân
  const f = heSoHoan({ tienSan: 200000, tienDichVuChuaGiao: 40000, hocPhi: 0 }, tyLeHoan(5));
  assert.equal(f, (100000 + 40000) / 240000);
  const ds = phanBoHoan([{ phuongThuc: 'VNPAY', soTien: 240000 }], f);
  assert.equal(ds[0].soTienHoan, 140000);
});

test('QT-20, QT-21: hạng thành viên và tích điểm', () => {
  assert.equal(diemTichLuy(2, 1.5), 30);
  const vang = { id: 2, thoiHanNgay: 30 };
  assert.deepEqual(hanThanhVienMoi({ goiThanhVienId: 2, hanThanhVien: '2026-11-10' }, vang, '2026-10-25'),
    { loai: 'GIA_HAN', hanMoi: '2026-12-10' });
  assert.deepEqual(hanThanhVienMoi({ goiThanhVienId: 1, hanThanhVien: '2026-11-10' }, vang, '2026-10-25'),
    { loai: 'NANG_HANG', hanMoi: '2026-11-24' });
});

test('Bảng 3.5i: chuyển trạng thái', () => {
  assert.ok(choPhepChuyen('CHO_THANH_TOAN', 'DA_XAC_NHAN'));
  assert.ok(!choPhepChuyen('DA_HUY', 'DA_XAC_NHAN'));
  assert.ok(!choPhepChuyen('DA_HOAN_THANH', 'DA_HUY'));
});

// Kiểm thử đơn vị các quy tắc nghiệp vụ (mục 3.2.5). Chạy: npm run test:rules
// Mỗi bài có mã UT-xx, trùng với Bảng 5.7 của báo cáo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tinhBangTien, xacDinhLoaiNgay, timKhungGia, heSoTruGio } from '../../src/services/rules/giaCalculator.js';
import { tyLeHoan, heSoHoan, phanBoHoan } from '../../src/services/rules/hoanTienPolicy.js';
import { diemTichLuy, hanThanhVienMoi } from '../../src/services/rules/diemThuongPolicy.js';
import { choPhepChuyen, CHUYEN_HOP_LE } from '../../src/services/rules/trangThaiDon.js';

// ---------------------------------------------------------------- Giá sân (QT-07, QT-08)
test('UT-01 QT-07: ngày lễ ưu tiên hơn cuối tuần, cuối tuần hơn ngày thường', () => {
  const le = new Set(['2026-09-02', '2026-05-02']);
  assert.equal(xacDinhLoaiNgay('2026-09-02', le), 'NGAY_LE'); // thứ Tư nhưng là ngày lễ
  assert.equal(xacDinhLoaiNgay('2026-05-02', le), 'NGAY_LE'); // thứ Bảy và là ngày lễ
  assert.equal(xacDinhLoaiNgay('2026-10-31', le), 'CUOI_TUAN'); // thứ Bảy
  assert.equal(xacDinhLoaiNgay('2026-11-01', le), 'CUOI_TUAN'); // Chủ nhật
  assert.equal(xacDinhLoaiNgay('2026-10-26', le), 'NGAY_THUONG'); // thứ Hai
});

test('UT-02 QT-08: chọn khung giá đang hiệu lực, biên [bắt đầu, kết thúc)', () => {
  const ds = [
    { id: 1, loaiNgay: 'CUOI_TUAN', gioBatDau: '05:00', gioKetThuc: '17:00', apDungTu: '2026-01-01', apDungDen: null, donGia: 100000 },
    { id: 2, loaiNgay: 'CUOI_TUAN', gioBatDau: '17:00', gioKetThuc: '22:00', apDungTu: '2026-01-01', apDungDen: '2026-10-31', donGia: 150000 },
    { id: 3, loaiNgay: 'CUOI_TUAN', gioBatDau: '17:00', gioKetThuc: '22:00', apDungTu: '2026-11-01', apDungDen: null, donGia: 160000 },
  ];
  assert.equal(timKhungGia(ds, '2026-10-31', 'CUOI_TUAN', '16:00').id, 1);
  assert.equal(timKhungGia(ds, '2026-10-31', 'CUOI_TUAN', '17:00').id, 2); // 17:00 thuộc khung sau
  assert.equal(timKhungGia(ds, '2026-11-01', 'CUOI_TUAN', '18:00').id, 3); // bảng giá mới có hiệu lực
  assert.equal(timKhungGia(ds, '2026-11-01', 'CUOI_TUAN', '22:00'), null); // ngoài mọi khung
  assert.equal(timKhungGia(ds, '2026-11-01', 'NGAY_THUONG', '18:00'), null); // chưa có bảng giá
});

// ---------------------------------------------------------------- Tính tiền (QT-09, QT-10, QT-22, QT-23)
test('UT-03 Bảng 3.5c: ví dụ tính tiền ra 250.000 đ', () => {
  const kq = tinhBangTien({
    tienSan: 300000, tienDichVu: 40000, phanTramHang: 10,
    ma: { phanTramGiam: 20, giamToiDa: 50000 }, soDiem: 100, diemHienCo: 500,
  });
  assert.equal(kq.tamTinh, 340000);
  assert.equal(kq.giamHang, 30000); // hạng chỉ giảm trên tiền sân
  assert.equal(kq.giamMa, 50000); // 20% × 310.000 = 62.000, chặn ở 50.000
  assert.equal(kq.truDiem, 10000);
  assert.equal(kq.phaiTra, 250000);
});

test('UT-04 QT-10: mã giảm giá không có mức trần, làm tròn xuống nghìn', () => {
  const kq = tinhBangTien({ tienSan: 245500, ma: { phanTramGiam: 10, giamToiDa: null } });
  assert.equal(kq.giamMa, 24550);
  assert.equal(kq.phaiTra, 220000); // 220.950 → 220.000
});

test('UT-05 QT-22: điểm không phải bội số 10, vượt số điểm đang có hoặc vượt 50% bị từ chối', () => {
  assert.throws(() => tinhBangTien({ tienSan: 100000, soDiem: 15, diemHienCo: 100 }), /bội số/);
  assert.throws(() => tinhBangTien({ tienSan: 100000, soDiem: 200, diemHienCo: 100 }), /chỉ có 100 điểm/);
  assert.throws(() => tinhBangTien({ tienSan: 100000, soDiem: 600, diemHienCo: 1000 }), /tối đa 500/);
  const kq = tinhBangTien({ tienSan: 100000, soDiem: 500, diemHienCo: 1000 }); // đúng 50%
  assert.equal(kq.truDiem, 50000);
  assert.equal(kq.phaiTra, 50000);
});

test('UT-06 QT-23: gói giờ trừ 1 giờ khung thường, 1,5 giờ khung cao điểm và cuối tuần', () => {
  assert.equal(heSoTruGio('09:00', 'NGAY_THUONG'), 1);
  assert.equal(heSoTruGio('16:00', 'NGAY_THUONG'), 1);
  assert.equal(heSoTruGio('17:00', 'NGAY_THUONG'), 1.5);
  assert.equal(heSoTruGio('21:00', 'NGAY_THUONG'), 1.5);
  assert.equal(heSoTruGio('22:00', 'NGAY_THUONG'), 1);
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

test('UT-07 QT-23: thẻ trả trước trừ theo số dư, không vượt số phải trả', () => {
  const a = tinhBangTien({ tienSan: 160000, goi: { loai: 'THE_TRA_TRUOC', soDuConLai: 100000 } });
  assert.equal(a.truGoi, 100000);
  assert.equal(a.phaiTra, 60000);
  const b = tinhBangTien({ tienSan: 160000, goi: { loai: 'THE_TRA_TRUOC', soDuConLai: 500000 } });
  assert.equal(b.truGoi, 160000);
  assert.equal(b.phaiTra, 0); // UC03.1 – A2: không cần qua cổng thanh toán
});

test('UT-08 Thanh toán phần còn lại sau khi đã trả một phần (thêm dịch vụ sau khi đặt)', () => {
  const kq = tinhBangTien({ tienSan: 200000, tienDichVu: 30000, daThanhToan: 200000 });
  assert.equal(kq.conLai, 30000);
  assert.equal(kq.phaiTra, 30000);
  assert.equal(tinhBangTien({ tienSan: 200000, daThanhToan: 199500 }).conLai, 0); // lẻ dưới 1.000 đ
});

// ---------------------------------------------------------------- Hủy, hoàn tiền (QT-11 → QT-15)
test('UT-09 QT-11: mức hoàn theo thời gian còn lại đến giờ chơi', () => {
  assert.deepEqual(tyLeHoan(30), { duocHuy: true, tyLeSan: 1, tyLeKhac: 1 });
  assert.equal(tyLeHoan(24).tyLeSan, 1); // biên 24 giờ: hoàn 100%
  assert.equal(tyLeHoan(23.9).tyLeSan, 0.5);
  assert.equal(tyLeHoan(2).duocHuy, true); // biên 2 giờ: vẫn được hủy
  assert.equal(tyLeHoan(1.99).duocHuy, false);
});

test('UT-10 QT-15: hủy do phía sân luôn hoàn 100%', () => {
  assert.deepEqual(tyLeHoan(0.5, true), { duocHuy: true, tyLeSan: 1, tyLeKhac: 1 });
});

test('UT-11 QT-11, QT-14: dịch vụ chưa giao hoàn đủ, dịch vụ đã giao không hoàn', () => {
  const tyLe = tyLeHoan(5); // hoàn 50% tiền sân
  const f = heSoHoan({ tienSan: 200000, tienDichVuChuaGiao: 40000, tienDichVuDaGiao: 60000 }, tyLe);
  assert.equal(f, (100000 + 40000) / 300000);
  assert.equal(heSoHoan({ tienSan: 0 }, tyLe), 0);
});

test('UT-12 QT-12: tiền hoàn chia về đúng từng kênh đã thanh toán', () => {
  const kenh = [
    { phuongThuc: 'VNPAY', soTien: 150000 },
    { phuongThuc: 'GOI_GIO', soTien: 90000, goiGioChoiId: 7 },
    { phuongThuc: 'DIEM_THUONG', soTien: 0 },
  ];
  const ds = phanBoHoan(kenh, 0.5);
  assert.deepEqual(ds.map((x) => [x.phuongThuc, x.soTienHoan]), [['VNPAY', 75000], ['GOI_GIO', 45000]]);
  assert.equal(phanBoHoan(kenh, 1)[0].soTienHoan, 150000); // hoàn 100% không bị làm tròn
});

// ---------------------------------------------------------------- Thành viên, điểm (QT-20, QT-21)
test('UT-13 QT-21: điểm tích lũy = số giờ × 10 × hệ số hạng', () => {
  assert.equal(diemTichLuy(2), 20);
  assert.equal(diemTichLuy(2, 1.5), 30);
  assert.equal(diemTichLuy(3, 2), 60);
});

test('UT-14 QT-20: gia hạn cộng nối tiếp, nâng hạng và mua mới tính từ hôm nay', () => {
  const vang = { id: 2, thoiHanNgay: 30 };
  assert.deepEqual(hanThanhVienMoi({ goiThanhVienId: 2, hanThanhVien: '2026-11-10' }, vang, '2026-10-25'),
    { loai: 'GIA_HAN', hanMoi: '2026-12-10' });
  assert.deepEqual(hanThanhVienMoi({ goiThanhVienId: 1, hanThanhVien: '2026-11-10' }, vang, '2026-10-25'),
    { loai: 'NANG_HANG', hanMoi: '2026-11-24' });
  assert.deepEqual(hanThanhVienMoi({ goiThanhVienId: 2, hanThanhVien: '2026-10-01' }, vang, '2026-10-25'),
    { loai: 'MUA_MOI', hanMoi: '2026-11-24' }); // hạng cũ đã hết hạn
});

// ---------------------------------------------------------------- Trạng thái đơn (Bảng 3.5i, Bảng 4.28)
test('UT-15 Bảng 4.28: đúng 8 chuyển trạng thái giữa các trạng thái, không thừa không thiếu', () => {
  const hopLe = [
    ['CHO_THANH_TOAN', 'DA_XAC_NHAN'], ['CHO_THANH_TOAN', 'HET_HAN'], ['CHO_THANH_TOAN', 'DA_HUY'],
    ['HET_HAN', 'DA_XAC_NHAN'], ['DA_XAC_NHAN', 'DANG_SU_DUNG'], ['DA_XAC_NHAN', 'DA_HUY'],
    ['DA_XAC_NHAN', 'KHONG_DEN'], ['DANG_SU_DUNG', 'DA_HOAN_THANH'],
  ];
  for (const [a, b] of hopLe) assert.ok(choPhepChuyen(a, b), `${a} → ${b}`);
  const tong = Object.values(CHUYEN_HOP_LE).reduce((s, x) => s + x.length, 0);
  assert.equal(tong, hopLe.length); // không có chuyển trạng thái nào ngoài bảng
});

test('UT-16 Bảng 4.28: trạng thái cuối không chuyển tiếp được', () => {
  for (const cuoi of ['DA_HOAN_THANH', 'DA_HUY', 'KHONG_DEN']) {
    for (const moi of Object.keys(CHUYEN_HOP_LE)) assert.ok(!choPhepChuyen(cuoi, moi), `${cuoi} → ${moi}`);
  }
  assert.ok(!choPhepChuyen('DANG_SU_DUNG', 'DA_HUY')); // đang chơi thì không hủy được
  assert.ok(!choPhepChuyen('HET_HAN', 'DA_HUY'));
});

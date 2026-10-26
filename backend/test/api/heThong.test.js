// Kiểm thử hệ thống qua API (hộp đen) trên backend thật + MySQL + dữ liệu mẫu. Mã ST-xx trùng Bảng 5.8 của báo cáo.
// Cách chạy (2 cửa sổ):  npm run db:setup  →  npm run dev   |   npm run test:api
// Đổi địa chỉ backend: đặt biến môi trường API_URL (mặc định http://localhost:3000/api/v1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const MAT_KHAU = 'MatKhau123';
const ngayVN = (cong = 0) => new Date(Date.now() + 7 * 3600000 + cong * 86400000).toISOString().slice(0, 10);
const N2 = ngayVN(2); // ngày kiểm thử: luôn cách giờ chơi ≥ 24 giờ nên được hoàn 100% (QT-11)
const N3 = ngayVN(3);

/** Một phiên trình duyệt: tự giữ cookie scl.sid */
class Phien {
  cookie = '';
  async goi(phuongThuc, duongDan, duLieu) {
    const t0 = performance.now();
    const res = await fetch(API + duongDan, {
      method: phuongThuc,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: duLieu === undefined ? undefined : JSON.stringify(duLieu),
    });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) if (c.startsWith('scl.sid=')) this.cookie = c.split(';')[0];
    const loai = res.headers.get('content-type') ?? '';
    const body = loai.includes('json') ? await res.json() : await res.text();
    return { status: res.status, body, ms: performance.now() - t0 };
  }
  get = (d) => this.goi('GET', d);
  post = (d, b = {}) => this.goi('POST', d, b);
  async dangNhap(dinhDanh, matKhau = MAT_KHAU) {
    const r = await this.post('/auth/dang-nhap', { dinhDanh, matKhau });
    assert.equal(r.status, 200, `Đăng nhập ${dinhDanh}: ${JSON.stringify(r.body)}`);
    return this;
  }
}

const loi = (r, status, code) => {
  assert.equal(r.status, status, JSON.stringify(r.body));
  if (code) assert.equal(r.body.code, code, JSON.stringify(r.body));
};

const khach = new Phien(); // Vũ Đức Long 0933333333 – chưa có hạng nên tổng tiền = tổng đơn giá
const leTan = new Phien();
const quanLy = new Phien();
const moi = []; // các khách đăng ký mới trong lúc kiểm thử
const donCanDon = new Set(); // đơn tạo ra trong lúc kiểm thử, hủy khi kết thúc
const suffix = String(Date.now()).slice(-7);

/** Tìm `so` khung liên tiếp còn trống của một sân hoạt động, bỏ qua các sân trong `boQua` */
async function timKhoiTrong(ngay, so, boQua = []) {
  const r = await new Phien().get(`/lich-san?ngay=${ngay}`);
  for (const s of r.body.san) {
    if (s.trangThai !== 'HOAT_DONG' || boQua.includes(s.id)) continue;
    for (let i = 0; i + so <= s.o.length; i++) {
      const o = s.o.slice(i, i + so);
      if (o.every((x) => x.trangThai === 'TRONG')) {
        return { sanId: s.id, danhSach: o.map((x) => ({ sanId: s.id, khungGioId: x.khungGioId })), donGia: o.map((x) => r.body.khungGio.find((k) => k.id === x.khungGioId).donGia) };
      }
    }
  }
  throw new Error(`Không còn ${so} khung trống liên tiếp ngày ${ngay} – hãy chạy lại npm run db:setup`);
}

async function datSan(phien, ngay, danhSach, them = {}) {
  const r = await phien.post('/don-dat-san', { ngayChoi: ngay, danhSach, ...them });
  if (r.status === 201) donCanDon.add(JSON.stringify([r.body.don.maDon, phien === leTan ? 'leTan' : moi.indexOf(phien)]));
  return r;
}

/** Thanh toán VNPAY ở chế độ giả lập: tạo giao dịch → lấy kết quả có chữ ký → gửi IPN như máy chủ VNPAY */
async function thanhToanVnpay(phien, maDon, { maGiamGia, ketQua = 'thanh-cong' } = {}) {
  const tao = await phien.post('/thanh-toan', { maDon, maGiamGia });
  assert.equal(tao.status, 201, JSON.stringify(tao.body));
  const thamSo = (await new Phien().get(`/thanh-toan/gia-lap?txnRef=${tao.body.maGiaoDich}&ketQua=${ketQua}`)).body;
  const ipn = await new Phien().get(`/thanh-toan/vnpay-ipn?${new URLSearchParams(thamSo)}`);
  return { tao, thamSo, ipn };
}

before(async () => {
  const r = await fetch(`${API}/san`).catch(() => null);
  if (!r?.ok) throw new Error(`Không gọi được ${API} – hãy chạy backend (npm run dev) trước`);
  await khach.dangNhap('0933333333');
  await leTan.dangNhap('0900000002');
  await quanLy.dangNhap('0900000001');
});

after(async () => {
  // Dọn: hủy mọi đơn còn hiệu lực đã tạo trong lúc kiểm thử (lễ tân hủy hộ)
  for (const x of donCanDon) {
    const [maDon] = JSON.parse(x);
    await leTan.post(`/don-dat-san/${maDon}/huy`, { lyDo: 'Dọn dữ liệu kiểm thử' });
  }
});

// ================================================================ UC01 Tài khoản
test('ST-01 UC01.1: đăng ký tài khoản hợp lệ', async () => {
  for (let i = 0; i < 6; i++) {
    const p = new Phien();
    const r = await p.post('/auth/dang-ky', {
      hoTen: 'Khách Kiểm Thử', soDienThoai: `08${i}${suffix}`, email: `kt${i}.${suffix}@vidu.vn`, matKhau: MAT_KHAU, xacNhanMatKhau: MAT_KHAU,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.vaiTro, 'KHACH_HANG');
    assert.equal(r.body.matKhauHash, undefined); // NFR-05: không trả mật khẩu băm ra ngoài
    await p.dangNhap(`08${i}${suffix}`);
    moi.push(p);
  }
});

test('ST-02 UC01.1 E: đăng ký trùng số điện thoại, mật khẩu yếu', async () => {
  const p = new Phien();
  loi(await p.post('/auth/dang-ky', { hoTen: 'Trùng Số', soDienThoai: '0933333333', email: `trung.${suffix}@vidu.vn`, matKhau: MAT_KHAU, xacNhanMatKhau: MAT_KHAU }), 409, 'SDT_DA_TON_TAI');
  const yeu = await p.post('/auth/dang-ky', { hoTen: 'Mật Khẩu Yếu', soDienThoai: `0799${suffix.slice(1)}`, email: `yeu.${suffix}@vidu.vn`, matKhau: '12345678', xacNhanMatKhau: '12345678' });
  loi(yeu, 400, 'DU_LIEU_KHONG_HOP_LE');
});

test('ST-03 UC01.2: đăng nhập sai mật khẩu bị từ chối; đăng nhập đúng nhận phiên', async () => {
  const p = new Phien();
  loi(await p.post('/auth/dang-nhap', { dinhDanh: '0933333333', matKhau: 'SaiMatKhau1' }), 401, 'SAI_THONG_TIN_DANG_NHAP');
  await p.dangNhap('long@sancaulong.vn'); // đăng nhập bằng email
  const toi = await p.get('/auth/toi');
  assert.equal(toi.body.user.soDienThoai, '0933333333');
});

test('ST-04 NFR-04, NFR-06: chưa đăng nhập không đặt được sân; khách và lễ tân không vào được chức năng quản trị', async () => {
  loi(await new Phien().post('/don-dat-san', { ngayChoi: N2, danhSach: [{ sanId: 1, khungGioId: 1 }] }), 401, 'CHUA_DANG_NHAP');
  loi(await khach.get('/quan-tri/tai-khoan'), 403, 'KHONG_DU_QUYEN');
  loi(await leTan.post('/quan-tri/ngay-le', { ngay: N3, tenNgayLe: 'Thử' }), 403, 'KHONG_DU_QUYEN');
  loi(await khach.get('/bao-cao/doanh-thu?tuNgay=2026-01-01&denNgay=2026-12-31'), 403, 'KHONG_DU_QUYEN');
});

// ================================================================ UC02 Đặt sân
test('ST-05 UC02.1: xem lịch sân trống không cần đăng nhập', async () => {
  const r = await new Phien().get(`/lich-san?ngay=${N2}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.khungGio.length, 18);
  assert.ok(r.body.san.length >= 8);
  assert.ok(r.body.khungGio.every((k) => k.donGia > 0));
  assert.ok(r.body.san.every((s) => s.o.length === 18 && s.o[0].maDon === undefined)); // khách không thấy thông tin đơn
});

let donA; // đơn chính của khách: 2 khung, dùng cho thanh toán và hủy
let khoiA;
test('ST-06 UC02.2: đặt 2 khung liên tiếp, đơn chờ thanh toán, giữ chỗ 10 phút', async () => {
  khoiA = await timKhoiTrong(N2, 2);
  const r = await datSan(khach, N2, khoiA.danhSach);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  donA = r.body.don;
  assert.equal(donA.trangThai, 'CHO_THANH_TOAN');
  assert.equal(donA.chiTiet.length, 2);
  assert.equal(donA.tongTien, khoiA.donGia[0] + khoiA.donGia[1]);
  const giu = (new Date(donA.hanGiuCho) - new Date(donA.ngayTao)) / 60000;
  assert.ok(giu > 9.9 && giu <= 10.1, `giữ chỗ ${giu} phút`);
  const lich = await new Phien().get(`/lich-san?ngay=${N2}`);
  const o = lich.body.san.find((s) => s.id === khoiA.sanId).o.find((x) => x.khungGioId === khoiA.danhSach[0].khungGioId);
  assert.equal(o.trangThai, 'DANG_GIU');
});

test('ST-07 UC02.2 E: QT-01 quá 4 khung hoặc khung không liên tiếp', async () => {
  const k5 = await timKhoiTrong(N3, 5);
  loi(await datSan(khach, N3, k5.danhSach), 422, 'SAI_SO_KHUNG');
  loi(await datSan(khach, N3, [k5.danhSach[0], k5.danhSach[2]]), 422, 'SAI_SO_KHUNG');
});

test('ST-08 UC02.2 E: QT-02 ngoài phạm vi 7 ngày, ngày đã qua', async () => {
  loi(await datSan(khach, ngayVN(7), [{ sanId: 1, khungGioId: 10 }]), 422, 'NGOAI_PHAM_VI_NGAY');
  loi(await datSan(khach, ngayVN(-1), [{ sanId: 1, khungGioId: 10 }]), 422, 'NGOAI_PHAM_VI_NGAY');
});

test('ST-09 UC02.2 E: QT-05 lịch định kỳ ít hơn 4 buổi', async () => {
  const k = await timKhoiTrong(N3, 1);
  loi(await datSan(khach, N3, k.danhSach, { dinhKy: { soBuoi: 3 } }), 422, 'SAI_DINH_KY');
});

test('ST-10 UC02.2 E: NFR-09 đặt trùng khung đã có người giữ', async () => {
  const r = await datSan(moi[0], N2, [khoiA.danhSach[1]]);
  loi(r, 409, 'TRUNG_LICH');
  assert.deepEqual(r.body.details, [khoiA.danhSach[1]]);
});

test('ST-11 NFR-09: 6 khách gửi đồng thời cùng một sân – khung, chỉ 1 yêu cầu thành công', async () => {
  const k = await timKhoiTrong(N3, 1);
  const ds = await Promise.all(moi.map((p) => datSan(p, N3, k.danhSach)));
  const thanhCong = ds.filter((r) => r.status === 201);
  const trung = ds.filter((r) => r.status === 409 && r.body.code === 'TRUNG_LICH');
  assert.equal(thanhCong.length, 1, ds.map((r) => r.status).join(','));
  assert.equal(trung.length, moi.length - 1);
});

let donB;
test('ST-12 UC02.2 E: QT-03 khách có 2 đơn chờ thanh toán không đặt thêm được', async () => {
  const k = await timKhoiTrong(N3, 1);
  const r = await datSan(khach, N3, k.danhSach);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  donB = r.body.don;
  const k2 = await timKhoiTrong(N3, 1, [k.sanId]);
  loi(await datSan(khach, N3, k2.danhSach), 422, 'VUOT_GIOI_HAN_DON_CHO');
});

test('ST-13 UC02.4: hủy đơn chưa thanh toán – không phát sinh hoàn tiền, khung được mở lại', async () => {
  const r = await khach.post(`/don-dat-san/${donB.maDon}/huy`, { lyDo: 'Đổi ý' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.tongHoan, 0);
  const ct = await khach.get(`/don-dat-san/${donB.maDon}`);
  assert.equal(ct.body.trangThai, 'DA_HUY');
  const lich = await new Phien().get(`/lich-san?ngay=${N3}`);
  const o = lich.body.san.find((s) => s.id === donB.chiTiet[0].sanId).o.find((x) => x.khungGioId === donB.chiTiet[0].khungGioId);
  assert.equal(o.trangThai, 'TRONG');
});

// ================================================================ UC03 Thanh toán
test('ST-14 UC03.1: tính tiền với mã GIAM20 (20%, tối đa 50.000 đ)', async () => {
  const r = await khach.post('/thanh-toan/tinh-tien', { maDon: donA.maDon, maGiamGia: 'giam20' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const b = r.body.bangTinhTien;
  const giam = Math.min(Math.floor(donA.tongTien * 0.2), 50000);
  assert.equal(b.giamMa, giam);
  assert.equal(b.phaiTra, Math.floor((donA.tongTien - giam) / 1000) * 1000);
  loi(await khach.post('/thanh-toan/tinh-tien', { maDon: donA.maDon, maGiamGia: 'KHONGCO99' }), 422, 'MA_GIAM_GIA_KHONG_HOP_LE');
  loi(await khach.post('/thanh-toan/tinh-tien', { maDon: donA.maDon, soDiem: 15 }), 422, 'DIEM_KHONG_HOP_LE');
});

let ketQuaA;
test('ST-15 UC03.1: thanh toán VNPAY thành công qua IPN – đơn Đã xác nhận, có hóa đơn', async () => {
  ketQuaA = await thanhToanVnpay(khach, donA.maDon, { maGiamGia: 'GIAM20' });
  assert.match(ketQuaA.tao.body.paymentUrl, /\/thanh-toan\/gia-lap\?/);
  assert.deepEqual(ketQuaA.ipn.body, { RspCode: '00', Message: 'Confirm Success' });
  const ct = await khach.get(`/don-dat-san/${donA.maDon}`);
  assert.equal(ct.body.trangThai, 'DA_XAC_NHAN');
  assert.equal(ct.body.conPhaiThu, 0);
  const tv = await new Phien().get(`/thanh-toan/vnpay-return?${new URLSearchParams(ketQuaA.thamSo)}`); // trình duyệt quay về sau IPN
  assert.equal(tv.body.thanhCong, true);
  assert.match(tv.body.maHoaDon, /^HD/);
});

test('ST-16 Bảng 4.22: IPN gửi lại lần 2 không ghi tiền lần nữa (lũy đẳng)', async () => {
  const lai = await new Phien().get(`/thanh-toan/vnpay-ipn?${new URLSearchParams(ketQuaA.thamSo)}`);
  assert.equal(lai.body.RspCode, '02');
  const ct = await khach.get(`/don-dat-san/${donA.maDon}`);
  assert.equal(ct.body.trangThai, 'DA_XAC_NHAN');
});

test('ST-17 NFR-07: kết quả bị sửa số tiền hoặc chữ ký sai bị từ chối (RspCode 97)', async () => {
  const sua = { ...ketQuaA.thamSo, vnp_Amount: '100' };
  assert.equal((await new Phien().get(`/thanh-toan/vnpay-ipn?${new URLSearchParams(sua)}`)).body.RspCode, '97');
  const k = await timKhoiTrong(N3, 1);
  const d = (await datSan(moi[1], N3, k.danhSach)).body.don;
  const { thamSo } = await thanhToanVnpay(moi[1], d.maDon, { ketQua: 'that-bai' });
  const gia = { ...thamSo, vnp_ResponseCode: '00', vnp_TransactionStatus: '00' }; // tự đổi kết quả thất bại thành thành công
  assert.equal((await new Phien().get(`/thanh-toan/vnpay-ipn?${new URLSearchParams(gia)}`)).body.RspCode, '97');
  const ct = await moi[1].get(`/don-dat-san/${d.maDon}`);
  assert.equal(ct.body.trangThai, 'CHO_THANH_TOAN'); // đơn không được xác nhận
});

test('ST-18 UC03.1 A: thanh toán thất bại – đơn vẫn chờ thanh toán, thanh toán lại được', async () => {
  const k = await timKhoiTrong(N3, 1);
  const d = (await datSan(moi[2], N3, k.danhSach)).body.don;
  const tb = await thanhToanVnpay(moi[2], d.maDon, { ketQua: 'that-bai' });
  assert.equal(tb.ipn.body.RspCode, '00');
  assert.equal((await moi[2].get(`/don-dat-san/${d.maDon}`)).body.trangThai, 'CHO_THANH_TOAN');
  const lai = await thanhToanVnpay(moi[2], d.maDon);
  assert.equal(lai.ipn.body.RspCode, '00');
  assert.equal((await moi[2].get(`/don-dat-san/${d.maDon}`)).body.trangThai, 'DA_XAC_NHAN');
});

// ================================================================ UC02.4 Hủy + hoàn tiền
test('ST-19 UC02.4: người khác không xem, không hủy được đơn của khách', async () => {
  loi(await moi[3].get(`/don-dat-san/${donA.maDon}`), 403, 'KHONG_PHAI_CHU_DON');
  loi(await moi[3].post(`/don-dat-san/${donA.maDon}/huy`, {}), 403, 'KHONG_PHAI_CHU_DON');
});

test('ST-20 UC02.4, QT-11, QT-12: hủy đơn đã thanh toán trước ≥ 24 giờ – hoàn 100% về VNPAY, khung mở lại', async () => {
  const ct = await khach.get(`/don-dat-san/${donA.maDon}`);
  const daTra = ketQuaA.tao.body.bangTinhTien.phaiTra;
  assert.equal(ct.body.duKienHoan.soTienHoan, daTra); // số tiền hiển thị trước khi xác nhận hủy
  const r = await khach.post(`/don-dat-san/${donA.maDon}/huy`, { lyDo: 'Bận việc' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.tongHoan, daTra);
  assert.ok(r.body.chiTietHoan.every((x) => x.phuongThuc === 'VNPAY'));
  const lich = await new Phien().get(`/lich-san?ngay=${N2}`);
  const s = lich.body.san.find((x) => x.id === khoiA.sanId);
  for (const d of khoiA.danhSach) assert.equal(s.o.find((x) => x.khungGioId === d.khungGioId).trangThai, 'TRONG');
});

test('ST-21 Bảng 4.28: hủy lại đơn đã hủy bị từ chối', async () => {
  loi(await khach.post(`/don-dat-san/${donA.maDon}/huy`, {}), 409, 'CHUYEN_TRANG_THAI_KHONG_HOP_LE');
});

// ================================================================ Lễ tân: đặt hộ, thu tại quầy, check-in
let donQuay;
test('ST-22 UC02.2, UC03.1 A1: lễ tân đặt hộ khách vãng lai và thu tiền mặt tại quầy', async () => {
  const k = await timKhoiTrong(N2, 2);
  const r = await datSan(leTan, N2, k.danhSach, { hoTenKhach: 'Khách Vãng Lai', sdtKhach: '0987654321', taiQuay: true });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  donQuay = r.body.don;
  assert.equal(donQuay.kenhDat, 'TAI_QUAY');
  const tt = await leTan.post('/thanh-toan/tai-quay', { maDon: donQuay.maDon, phuongThuc: 'TIEN_MAT', tienKhachDua: 500000 });
  assert.equal(tt.status, 201, JSON.stringify(tt.body));
  assert.equal(tt.body.tienThua, 500000 - tt.body.bangTinhTien.phaiTra);
  assert.equal(tt.body.don.trangThai, 'DA_XAC_NHAN');
  const lich = await leTan.get(`/lich-san?ngay=${N2}`);
  const o = lich.body.san.find((s) => s.id === k.sanId).o.find((x) => x.khungGioId === k.danhSach[0].khungGioId);
  assert.equal(o.tenKhach, 'Khách Vãng Lai'); // lễ tân thấy tên khách trên lưới
});

test('ST-23 UC05.1 E: check-in ngoài khung ±15 phút và check-in đơn chưa thanh toán bị từ chối', async () => {
  loi(await leTan.post('/van-hanh/check-in', { maDon: donQuay.maDon }), 422, 'NGOAI_GIO_CHECK_IN');
  const k = await timKhoiTrong(N2, 1);
  const chua = (await datSan(leTan, N2, k.danhSach, { hoTenKhach: 'Khách Gọi Điện', sdtKhach: '0987000111' })).body.don;
  const ct = await leTan.get(`/don-dat-san/${chua.maDon}`);
  const giu = (new Date(ct.body.hanGiuCho) - new Date(ct.body.ngayTao)) / 60000;
  assert.ok(giu > 29.9 && giu <= 30.1, `lễ tân giữ chỗ ${giu} phút`); // QT-04
  loi(await leTan.post('/van-hanh/check-in', { maDon: chua.maDon }), 422, 'CON_NO');
});

test('ST-24 UC02.4: lễ tân hủy hộ đơn đã thu tiền mặt – hoàn 100% bằng tiền mặt, có nhật ký', async () => {
  const r = await leTan.post(`/don-dat-san/${donQuay.maDon}/huy`, { lyDo: 'Khách gọi hủy' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.tongHoan > 0);
  assert.ok(r.body.chiTietHoan.every((x) => x.phuongThuc === 'TIEN_MAT'));
  const nk = await quanLy.get('/quan-tri/nhat-ky?hanhDong=HUY_DON');
  assert.equal(nk.status, 200);
  const dong = nk.body.find((n) => (n.noiDung ?? '').includes('Khách gọi hủy')); // NFR-08: có người thực hiện, thời gian, nội dung
  assert.ok(dong && dong.vaiTro === 'LE_TAN' && dong.thoiGian, JSON.stringify(nk.body[0]));
});

// ================================================================ UC05.4 Sự cố sân
test('ST-25 UC05.4: ghi nhận sự cố – sân chuyển bảo trì, không nhận đặt; khắc phục – sân hoạt động lại', async () => {
  const k = await timKhoiTrong(N3, 1);
  const sc = await leTan.post('/van-hanh/su-co', { sanId: k.sanId, moTa: 'Kiểm thử: dột mái' });
  assert.equal(sc.status, 201, JSON.stringify(sc.body));
  try {
    const lich = await new Phien().get(`/lich-san?ngay=${N3}`);
    const s = lich.body.san.find((x) => x.id === k.sanId);
    assert.equal(s.trangThai, 'BAO_TRI');
    assert.equal(s.o.find((x) => x.khungGioId === k.danhSach[0].khungGioId).trangThai, 'BAO_TRI');
    loi(await datSan(moi[4], N3, k.danhSach), 422, 'SAN_KHONG_HOAT_DONG');
  } finally {
    const kp = await leTan.post(`/van-hanh/su-co/${sc.body.suCoId}/khac-phuc`);
    assert.equal(kp.status, 200);
  }
  const r = await datSan(moi[4], N3, k.danhSach);
  assert.equal(r.status, 201, JSON.stringify(r.body));
});

// ================================================================ UC07 Báo cáo
test('ST-26 UC07.1: quản lý xem báo cáo doanh thu, tỷ lệ lấp đầy và xuất Excel', async () => {
  const q = `tuNgay=${ngayVN(-21)}&denNgay=${ngayVN(0)}`;
  const dt = await quanLy.get(`/bao-cao/doanh-thu?${q}`);
  assert.equal(dt.status, 200, JSON.stringify(dt.body));
  const ld = await quanLy.get(`/bao-cao/lap-day?${q}`);
  assert.equal(ld.status, 200, JSON.stringify(ld.body));
  const res = await fetch(`${API}/bao-cao/xuat?${q}`, { headers: { Cookie: quanLy.cookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /spreadsheetml/);
  assert.ok((await res.arrayBuffer()).byteLength > 1000);
});

// ================================================================ Phi chức năng
test('ST-27 NFR-02, NFR-03: 100 yêu cầu xem lịch sân đồng thời, không lỗi, phản hồi ≤ 3 giây', async () => {
  const ds = await Promise.all(Array.from({ length: 100 }, () => new Phien().get(`/lich-san?ngay=${N2}`)));
  assert.ok(ds.every((r) => r.status === 200));
  const ms = ds.map((r) => r.ms).sort((a, b) => a - b);
  const tb = ms.reduce((s, x) => s + x, 0) / ms.length;
  console.log(`# ST-27 thời gian phản hồi: trung bình ${tb.toFixed(0)} ms, p95 ${ms[94].toFixed(0)} ms, lớn nhất ${ms[99].toFixed(0)} ms`);
  assert.ok(ms[99] <= 3000, `lớn nhất ${ms[99]} ms`);
});

test('ST-28 NFR-02: đặt sân và tạo thanh toán phản hồi ≤ 3 giây', async () => {
  const k = await timKhoiTrong(N3, 1);
  const dat = await datSan(moi[5], N3, k.danhSach);
  const tt = await moi[5].post('/thanh-toan', { maDon: dat.body.don.maDon });
  console.log(`# ST-28 đặt sân ${dat.ms.toFixed(0)} ms, tạo thanh toán ${tt.ms.toFixed(0)} ms`);
  assert.ok(dat.ms <= 3000 && tt.ms <= 3000);
});

// ================================================================ Kịch bản bổ sung sau rà soát (Bảng 5.10)
test('ST-29 UC04.1, UC04.3: lễ tân thêm thiết bị cho đơn chưa đến giờ – giữ “Đã đặt”, chưa trừ tồn kho', async () => {
  const k = await timKhoiTrong(N2, 1);
  const d = (await datSan(leTan, N2, k.danhSach, { hoTenKhach: 'Khách Thuê Vợt', sdtKhach: '0987000222', taiQuay: true })).body.don;
  const dv = (await quanLy.get('/quan-tri/dich-vu')).body.find((x) => x.loai === 'THIET_BI' && x.trangThai === 'DANG_BAN' && x.soLuongTon > 0);
  const r = await leTan.post(`/don-dat-san/${d.maDon}/dich-vu`, { items: [{ dichVuId: dv.id, soLuong: 1 }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.dichVu.find((x) => x.tenDichVu === dv.tenDichVu).trangThai, 'DA_DAT');
  const sau = (await quanLy.get('/quan-tri/dich-vu')).body.find((x) => x.id === dv.id);
  assert.equal(sau.soLuongTon, dv.soLuongTon); // chỉ trừ kho khi giao lúc check-in (UC05.3)
});

test('ST-30 QT-27: khách được chuyển sân do sự cố hủy trong 30 phút – hoàn 100% dù còn dưới 24 giờ', async (t) => {
  // Tìm một khung bắt đầu sau 3 – 20 giờ nữa để mức hoàn thường chỉ là 50% tiền sân (QT-11)
  const now = Date.now();
  let chon = null;
  for (const ngay of [ngayVN(0), ngayVN(1)]) {
    const lich = (await new Phien().get(`/lich-san?ngay=${ngay}`)).body;
    for (const s of lich.san.filter((x) => x.trangThai === 'HOAT_DONG')) {
      for (const o of s.o) {
        if (o.trangThai !== 'TRONG') continue;
        const kg = lich.khungGio.find((x) => x.id === o.khungGioId);
        const bd = new Date(`${ngay}T${kg.gioBatDau}:00+07:00`).getTime();
        const thayThe = lich.san.filter((x) => x.id !== s.id && x.trangThai === 'HOAT_DONG' && x.loaiSan === s.loaiSan && x.o.find((y) => y.khungGioId === o.khungGioId).trangThai === 'TRONG');
        if (bd - now > 3 * 3600000 && bd - now < 20 * 3600000 && thayThe.length) { chon = { ngay, sanId: s.id, khungGioId: o.khungGioId, bd }; break; }
      }
      if (chon) break;
    }
    if (chon) break;
  }
  if (!chon) return t.skip('Không có khung phù hợp trong 3 – 20 giờ tới');
  const d = (await datSan(khach, chon.ngay, [{ sanId: chon.sanId, khungGioId: chon.khungGioId }])).body.don;
  const tt = await thanhToanVnpay(khach, d.maDon);
  assert.equal(tt.ipn.body.RspCode, '00');
  const daTra = tt.tao.body.bangTinhTien.phaiTra;
  assert.ok((await khach.get(`/don-dat-san/${d.maDon}`)).body.duKienHoan.soTienHoan < daTra); // trước khi chuyển sân: chỉ hoàn 50%
  const sc = await leTan.post('/van-hanh/su-co', { sanId: chon.sanId, moTa: 'Kiểm thử QT-27', denLuc: new Date(chon.bd + 3600000).toISOString() });
  try {
    const lich = sc.body.lichBiAnhHuong.find((x) => x.maDon === d.maDon);
    const xl = await leTan.post('/van-hanh/su-co/xu-ly-don', { maDon: d.maDon, sanSuCoId: chon.sanId, hanhDong: 'CHUYEN_SAN', sanMoiId: lich.goiYSan[0].id });
    assert.equal(xl.status, 200, JSON.stringify(xl.body));
  } finally {
    await leTan.post(`/van-hanh/su-co/${sc.body.suCoId}/khac-phuc`);
  }
  assert.equal((await khach.get(`/don-dat-san/${d.maDon}`)).body.duKienHoan.soTienHoan, daTra);
  const huy = await khach.post(`/don-dat-san/${d.maDon}/huy`, { lyDo: 'Không đồng ý sân thay thế' });
  assert.equal(huy.status, 200, JSON.stringify(huy.body));
  assert.equal(huy.body.tongHoan, daTra);
});

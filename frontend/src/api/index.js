// Các hàm gọi API theo phân hệ (mục 4.3.4, Bảng 4.19)
import client from './client.js';

export const authApi = {
  toi: () => client.get('/auth/toi'),
  dangNhap: (body) => client.post('/auth/dang-nhap', body),
  dangKy: (body) => client.post('/auth/dang-ky', body),
  dangXuat: () => client.post('/auth/dang-xuat'),
  quenMatKhau: (body) => client.post('/auth/quen-mat-khau', body),
  datLaiMatKhau: (body) => client.post('/auth/dat-lai-mat-khau', body),
  thongTin: () => client.get('/tai-khoan/toi'),
  capNhat: (body) => client.put('/tai-khoan/toi', body),
  doiMatKhau: (body) => client.put('/tai-khoan/toi/mat-khau', body),
  dsGoiThanhVien: () => client.get('/goi-thanh-vien'),
  dangKyGoiThanhVien: (id) => client.post(`/goi-thanh-vien/${id}/dang-ky`),
  dsLoaiGoiGio: () => client.get('/goi-gio-choi/loai'),
  muaGoiGio: (loaiGoiGioId) => client.post('/goi-gio-choi/mua', { loaiGoiGioId }),
  goiCuaToi: () => client.get('/tai-khoan/toi/goi-gio'),
};

export const datSanApi = {
  dsSan: () => client.get('/san'),
  lichSan: (ngay, loaiSan) => client.get('/lich-san', { params: { ngay, loaiSan: loaiSan || undefined } }),
  datSan: (body) => client.post('/don-dat-san', body),
  dsDon: (params) => client.get('/don-dat-san', { params }),
  chiTiet: (maDon) => client.get(`/don-dat-san/${maDon}`),
  huy: (maDon, lyDo) => client.post(`/don-dat-san/${maDon}/huy`, { lyDo }),
  doiLich: (maDon, body) => client.post(`/don-dat-san/${maDon}/doi-lich`, body),
  danhGia: (maDon, body) => client.post(`/don-dat-san/${maDon}/danh-gia`, body),
};

export const thanhToanApi = {
  tinhTien: (body) => client.post('/thanh-toan/tinh-tien', body),
  taoThanhToan: (body) => client.post('/thanh-toan', body),
  thuTaiQuay: (body) => client.post('/thanh-toan/tai-quay', body),
  banTaiQuay: (body) => client.post('/thanh-toan/tai-quay/ban-goi', body),
  ketQua: (params) => client.get('/thanh-toan/vnpay-return', { params }),
  giaLap: (txnRef, thanhCong) => client.get('/thanh-toan/gia-lap', { params: { txnRef, ketQua: thanhCong ? 'thanh-cong' : 'that-bai' } }),
  hoaDon: (ma) => client.get(`/hoa-don/${ma}`),
};

export const dichVuApi = {
  danhMuc: (params) => client.get('/dich-vu', { params }),
  themVaoDon: (maDon, items) => client.post(`/don-dat-san/${maDon}/dich-vu`, { items }),
  xoaKhoiDon: (maDon, id) => client.delete(`/don-dat-san/${maDon}/dich-vu/${id}`),
  dsHlv: () => client.get('/hlv'),
  lichRanhHlv: (id, tuNgay) => client.get(`/hlv/${id}/lich-ranh`, { params: { tuNgay } }),
  hlvChoDon: (maDon) => client.get(`/don-dat-san/${maDon}/hlv`),
  datLichHoc: (body) => client.post('/lich-hoc', body),
  lichDay: (params) => client.get('/hlv/toi/lich', { params }),
  themLichRanh: (body) => client.post('/hlv/toi/lich-ranh', body),
  xoaLichRanh: (id) => client.delete(`/hlv/toi/lich-ranh/${id}`),
};

export const vanHanhApi = {
  tinhTrangSan: () => client.get('/van-hanh/tinh-trang-san'),
  traCuu: (q) => client.get('/van-hanh/tra-cuu', { params: { q } }),
  timKhach: (q) => client.get('/van-hanh/khach', { params: { q } }),
  checkIn: (maDon) => client.post('/van-hanh/check-in', { maDon }),
  giaoThietBi: (chiTietDichVuId) => client.post('/van-hanh/thiet-bi/giao', { chiTietDichVuId }),
  nhanThietBi: (body) => client.post('/van-hanh/thiet-bi/nhan', body),
  dsSuCo: (params) => client.get('/van-hanh/su-co', { params }),
  ghiNhanSuCo: (body) => client.post('/van-hanh/su-co', body),
  lichAnhHuong: (sanId) => client.get(`/van-hanh/su-co/san/${sanId}/anh-huong`),
  xuLyDonSuCo: (body) => client.post('/van-hanh/su-co/xu-ly-don', body),
  khacPhuc: (id) => client.post(`/van-hanh/su-co/${id}/khac-phuc`),
};

export const quanTriApi = {
  dsSan: () => client.get('/quan-tri/san'),
  taoSan: (b) => client.post('/quan-tri/san', b),
  suaSan: (id, b) => client.put(`/quan-tri/san/${id}`, b),
  bangGia: () => client.get('/quan-tri/bang-gia'),
  luuBangGia: (b) => client.put('/quan-tri/bang-gia', b),
  themNgayLe: (b) => client.post('/quan-tri/ngay-le', b),
  xoaNgayLe: (id) => client.delete(`/quan-tri/ngay-le/${id}`),
  dsDichVu: () => client.get('/quan-tri/dich-vu'),
  taoDichVu: (b) => client.post('/quan-tri/dich-vu', b),
  suaDichVu: (id, b) => client.put(`/quan-tri/dich-vu/${id}`, b),
  nhapKho: (id, soLuong) => client.post(`/quan-tri/dich-vu/${id}/nhap-kho`, { soLuong }),
  xoaDichVu: (id) => client.delete(`/quan-tri/dich-vu/${id}`),
  dsUuDai: () => client.get('/quan-tri/uu-dai'),
  luuMa: (id, b) => (id ? client.put(`/quan-tri/uu-dai/ma-giam-gia/${id}`, b) : client.post('/quan-tri/uu-dai/ma-giam-gia', b)),
  ngungMa: (id) => client.post(`/quan-tri/uu-dai/ma-giam-gia/${id}/ngung`),
  luuHang: (id, b) => (id ? client.put(`/quan-tri/uu-dai/hang/${id}`, b) : client.post('/quan-tri/uu-dai/hang', b)),
  luuGoiGio: (id, b) => (id ? client.put(`/quan-tri/uu-dai/goi-gio/${id}`, b) : client.post('/quan-tri/uu-dai/goi-gio', b)),
  dsTaiKhoan: (params) => client.get('/quan-tri/tai-khoan', { params }),
  taoTaiKhoan: (b) => client.post('/quan-tri/tai-khoan', b),
  suaTaiKhoan: (id, b) => client.put(`/quan-tri/tai-khoan/${id}`, b),
  doiTrangThai: (id, b) => client.put(`/quan-tri/tai-khoan/${id}/trang-thai`, b),
  donKhongDen: (id) => client.get(`/quan-tri/tai-khoan/${id}/khong-den`),
  nhatKy: (params) => client.get('/quan-tri/nhat-ky', { params }),
  thamSo: () => client.get('/quan-tri/tham-so'),
  dsKhieuNai: (params) => client.get('/quan-tri/khieu-nai', { params }),
  chiTietKhieuNai: (id) => client.get(`/quan-tri/khieu-nai/${id}`),
  xuLyKhieuNai: (id, b) => client.put(`/quan-tri/khieu-nai/${id}`, b),
  diemSan: () => client.get('/quan-tri/danh-gia-san'),
};

export const baoCaoApi = {
  doanhThu: (params) => client.get('/bao-cao/doanh-thu', { params }),
  lapDay: (params) => client.get('/bao-cao/lap-day', { params }),
  giaoDich: (ngay) => client.get('/bao-cao/giao-dich', { params: { ngay } }),
  urlXuat: (params) => `/api/v1/bao-cao/xuat?${new URLSearchParams(params)}`,
};

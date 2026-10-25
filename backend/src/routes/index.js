// Khai báo toàn bộ API /api/v1 (Bảng 4.19). Mỗi route: middleware phân quyền → kiểm tra dữ liệu → controller.
import { Router } from 'express';
import { yeuCauDangNhap, phanQuyen } from '../middlewares/auth.js';
import { kiemTraDuLieu as kt } from '../middlewares/kiemTraDuLieu.js';
import { luat } from '../validators/index.js';
import { AuthController, TaiKhoanController } from '../controllers/authController.js';
import { DatSanController } from '../controllers/datSanController.js';
import { ThanhToanController } from '../controllers/thanhToanController.js';
import { DichVuController } from '../controllers/dichVuController.js';
import { VanHanhController } from '../controllers/vanHanhController.js';
import { QuanTriController } from '../controllers/quanTriController.js';
import { BaoCaoController } from '../controllers/baoCaoController.js';

const r = Router();
const KH = phanQuyen('KHACH_HANG');
const LT = phanQuyen('LE_TAN');
const QL = phanQuyen('QUAN_LY');
const HLV = phanQuyen('HLV');
const KH_LT = phanQuyen('KHACH_HANG', 'LE_TAN');
const KH_LT_QL = phanQuyen('KHACH_HANG', 'LE_TAN', 'QUAN_LY');
const LT_QL = phanQuyen('LE_TAN', 'QUAN_LY');

// ---------- UC01 Tài khoản & Thành viên
r.post('/auth/dang-ky', kt(luat.dangKy), AuthController.dangKy);
r.post('/auth/dang-nhap', kt(luat.dangNhap), AuthController.dangNhap);
r.post('/auth/dang-xuat', AuthController.dangXuat);
r.get('/auth/toi', AuthController.toi);
r.post('/auth/quen-mat-khau', kt(luat.quenMatKhau), AuthController.quenMatKhau);
r.post('/auth/dat-lai-mat-khau', kt(luat.datLaiMatKhau), AuthController.datLaiMatKhau);
r.get('/tai-khoan/toi', yeuCauDangNhap, TaiKhoanController.thongTin);
r.put('/tai-khoan/toi', yeuCauDangNhap, kt(luat.capNhatThongTin), TaiKhoanController.capNhat);
r.put('/tai-khoan/toi/mat-khau', yeuCauDangNhap, kt(luat.doiMatKhau), TaiKhoanController.doiMatKhau);
r.get('/tai-khoan/toi/goi-gio', KH, TaiKhoanController.goiGio);
r.get('/goi-thanh-vien', TaiKhoanController.dsGoiThanhVien);
r.post('/goi-thanh-vien/:id/dang-ky', KH, TaiKhoanController.dangKyGoiThanhVien);
r.get('/goi-gio-choi/loai', TaiKhoanController.dsLoaiGoiGio);
r.post('/goi-gio-choi/mua', KH, TaiKhoanController.muaGoiGio);

// ---------- UC02 Đặt sân & Lịch sân
r.get('/san', DatSanController.dsSan);
r.get('/lich-san', kt(luat.lichSan), DatSanController.layLichSan);
r.post('/don-dat-san', KH_LT, kt(luat.datSan), DatSanController.datSan);
r.get('/don-dat-san', KH_LT_QL, DatSanController.layDanhSachDon);
r.get('/don-dat-san/:maDon', KH_LT_QL, kt(luat.maDon), DatSanController.layChiTietDon);
r.post('/don-dat-san/:maDon/huy', KH_LT, kt([...luat.maDon, ...luat.huyDon]), DatSanController.huyDon);
r.post('/don-dat-san/:maDon/doi-lich', KH_LT, kt([...luat.maDon, ...luat.doiLich]), DatSanController.doiLich);

// ---------- UC03 Thanh toán & Ưu đãi
r.post('/thanh-toan/tinh-tien', KH_LT, kt(luat.thanhToan), ThanhToanController.tinhTien);
r.post('/thanh-toan', KH, kt(luat.thanhToan), ThanhToanController.taoThanhToan);
r.post('/thanh-toan/tai-quay', LT, kt([...luat.thanhToan, ...luat.thuTaiQuay]), ThanhToanController.thuTaiQuay);
r.post('/thanh-toan/tai-quay/ban-goi', LT, kt(luat.thuTaiQuay), ThanhToanController.banTaiQuay);
r.get('/thanh-toan/vnpay-ipn', ThanhToanController.nhanIpn);
r.get('/thanh-toan/vnpay-return', ThanhToanController.ketQuaTrinhDuyet);
r.get('/thanh-toan/gia-lap', ThanhToanController.giaLap);
r.get('/hoa-don/:maHoaDon', yeuCauDangNhap, ThanhToanController.layHoaDon);

// ---------- UC04 Dịch vụ đi kèm
r.get('/dich-vu', DichVuController.danhMuc);
r.post('/don-dat-san/:maDon/dich-vu', KH_LT, kt([...luat.maDon, ...luat.themDichVu]), DichVuController.themVaoDon);
r.delete('/don-dat-san/:maDon/dich-vu/:id', KH_LT, DichVuController.xoaKhoiDon);
r.get('/hlv', DichVuController.dsHlv);
r.get('/hlv/toi/lich', HLV, DichVuController.lichDayCuaToi);
r.post('/hlv/toi/lich-ranh', HLV, kt(luat.lichRanh), DichVuController.themLichRanh);
r.delete('/hlv/toi/lich-ranh/:id', HLV, DichVuController.xoaLichRanh);
r.get('/hlv/:id/lich-ranh', yeuCauDangNhap, DichVuController.lichRanhHlv);
r.get('/don-dat-san/:maDon/hlv', KH_LT, DichVuController.hlvChoDon);
r.post('/lich-hoc', KH_LT, kt(luat.lichHoc), DichVuController.datLichHoc);

// ---------- UC05 Vận hành sân
r.get('/van-hanh/tinh-trang-san', LT_QL, VanHanhController.tinhTrangSan);
r.get('/van-hanh/tra-cuu', LT, VanHanhController.traCuu);
r.get('/van-hanh/khach', LT, VanHanhController.timKhach);
r.post('/van-hanh/check-in', LT, VanHanhController.checkIn);
r.post('/van-hanh/thiet-bi/giao', LT, VanHanhController.giaoThietBi);
r.post('/van-hanh/thiet-bi/nhan', LT, VanHanhController.nhanThietBi);
r.get('/van-hanh/su-co', LT_QL, VanHanhController.dsSuCo);
r.post('/van-hanh/su-co', LT, kt(luat.suCo), VanHanhController.ghiNhanSuCo);
r.get('/van-hanh/su-co/san/:sanId/anh-huong', LT, VanHanhController.lichAnhHuong);
r.post('/van-hanh/su-co/xu-ly-don', LT, VanHanhController.xuLyDonSuCo);
r.post('/van-hanh/su-co/:id/khac-phuc', LT, VanHanhController.khacPhuc);

// ---------- UC06 Quản trị hệ thống, UC08.2 Xử lý khiếu nại
r.get('/quan-tri/san', QL, QuanTriController.dsSan);
r.post('/quan-tri/san', QL, kt(luat.san), QuanTriController.taoSan);
r.put('/quan-tri/san/:id', QL, QuanTriController.capNhatSan);
r.get('/quan-tri/bang-gia', QL, QuanTriController.bangGia);
r.put('/quan-tri/bang-gia', QL, kt(luat.bangGia), QuanTriController.luuBangGia);
r.post('/quan-tri/ngay-le', QL, kt(luat.ngayLe), QuanTriController.themNgayLe);
r.delete('/quan-tri/ngay-le/:id', QL, QuanTriController.xoaNgayLe);
r.get('/quan-tri/dich-vu', QL, QuanTriController.dsDichVu);
r.post('/quan-tri/dich-vu', QL, kt(luat.dichVu), QuanTriController.taoDichVu);
r.put('/quan-tri/dich-vu/:id', QL, QuanTriController.capNhatDichVu);
r.post('/quan-tri/dich-vu/:id/nhap-kho', QL, QuanTriController.nhapKho);
r.delete('/quan-tri/dich-vu/:id', QL, QuanTriController.xoaDichVu);
r.get('/quan-tri/uu-dai', QL, QuanTriController.dsUuDai);
r.post('/quan-tri/uu-dai/ma-giam-gia', QL, kt(luat.maGiamGia), QuanTriController.luuMaGiamGia);
r.put('/quan-tri/uu-dai/ma-giam-gia/:id', QL, kt(luat.maGiamGia), QuanTriController.luuMaGiamGia);
r.post('/quan-tri/uu-dai/ma-giam-gia/:id/ngung', QL, QuanTriController.ngungMaGiamGia);
r.post('/quan-tri/uu-dai/hang', QL, kt(luat.hang), QuanTriController.luuHang);
r.put('/quan-tri/uu-dai/hang/:id', QL, kt(luat.hang), QuanTriController.luuHang);
r.post('/quan-tri/uu-dai/goi-gio', QL, kt(luat.loaiGoiGio), QuanTriController.luuLoaiGoiGio);
r.put('/quan-tri/uu-dai/goi-gio/:id', QL, kt(luat.loaiGoiGio), QuanTriController.luuLoaiGoiGio);
r.get('/quan-tri/tai-khoan', QL, QuanTriController.dsTaiKhoan);
r.post('/quan-tri/tai-khoan', QL, kt(luat.taoTaiKhoan), QuanTriController.taoTaiKhoan);
r.put('/quan-tri/tai-khoan/:id', QL, QuanTriController.capNhatTaiKhoan);
r.put('/quan-tri/tai-khoan/:id/trang-thai', QL, kt(luat.trangThaiTaiKhoan), QuanTriController.doiTrangThaiTaiKhoan);
r.get('/quan-tri/tai-khoan/:id/khong-den', QL, QuanTriController.donKhongDen);
r.get('/quan-tri/nhat-ky', QL, QuanTriController.nhatKy);
r.get('/quan-tri/tham-so', QL, QuanTriController.thamSo);
r.get('/quan-tri/khieu-nai', QL, QuanTriController.dsKhieuNai);
r.get('/quan-tri/khieu-nai/:id', QL, QuanTriController.chiTietKhieuNai);
r.put('/quan-tri/khieu-nai/:id', QL, kt(luat.xuLyKhieuNai), QuanTriController.xuLyKhieuNai);
r.get('/quan-tri/danh-gia-san', QL, QuanTriController.diemTrungBinhSan);

// ---------- UC07 Báo cáo & Thống kê
r.get('/bao-cao/doanh-thu', QL, kt(luat.khoangNgay), BaoCaoController.doanhThu);
r.get('/bao-cao/lap-day', QL, kt(luat.khoangNgay), BaoCaoController.lapDay);
r.get('/bao-cao/giao-dich', QL, BaoCaoController.giaoDich);
r.get('/bao-cao/xuat', QL, kt(luat.khoangNgay), BaoCaoController.xuat);

// ---------- UC08.1 Đánh giá
r.post('/don-dat-san/:maDon/danh-gia', KH, kt(luat.danhGia), DatSanController.danhGia);

export default r;

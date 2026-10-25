import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import DatSanPage from './pages/khach/DatSanPage.jsx';
import DangNhapPage from './pages/auth/DangNhapPage.jsx';
import DangKyPage from './pages/auth/DangKyPage.jsx';
import QuenMatKhauPage from './pages/auth/QuenMatKhauPage.jsx';
import LichDatCuaToiPage from './pages/khach/LichDatCuaToiPage.jsx';
import ThanhToanPage from './pages/khach/ThanhToanPage.jsx';
import KetQuaThanhToanPage from './pages/khach/KetQuaThanhToanPage.jsx';
import GiaLapVnpayPage from './pages/khach/GiaLapVnpayPage.jsx';
import CaNhanPage from './pages/khach/CaNhanPage.jsx';
import UuDaiPage from './pages/khach/UuDaiPage.jsx';
import HoaDonPage from './pages/khach/HoaDonPage.jsx';
import VanHanhSanPage from './pages/leTan/VanHanhSanPage.jsx';
import QuanLyDonPage from './pages/leTan/QuanLyDonPage.jsx';
import BanGoiTaiQuayPage from './pages/leTan/BanGoiTaiQuayPage.jsx';
import LichDayPage from './pages/hlv/LichDayPage.jsx';
import SanPage from './pages/quanLy/SanPage.jsx';
import BangGiaPage from './pages/quanLy/BangGiaPage.jsx';
import DichVuPage from './pages/quanLy/DichVuPage.jsx';
import UuDaiQuanLyPage from './pages/quanLy/UuDaiQuanLyPage.jsx';
import TaiKhoanPage from './pages/quanLy/TaiKhoanPage.jsx';
import BaoCaoPage from './pages/quanLy/BaoCaoPage.jsx';
import KhieuNaiPage from './pages/quanLy/KhieuNaiPage.jsx';
import NhatKyPage from './pages/quanLy/NhatKyPage.jsx';

/** Chỉ cho vào khi đã đăng nhập đúng vai trò (phân quyền phía giao diện; backend kiểm tra lại) */
function YeuCau({ vaiTro, children }) {
  const { user, dangTai } = useAuth();
  const loc = useLocation();
  if (dangTai) return <Spin style={{ margin: 80, display: 'block' }} />;
  if (!user) return <Navigate to="/dang-nhap" replace state={{ tu: loc.pathname + loc.search }} />;
  if (vaiTro && !vaiTro.includes(user.vaiTro)) return <Navigate to={user.trangMacDinh || '/'} replace />;
  return children;
}

export default function App() {
  const KH = (el) => <YeuCau vaiTro={['KHACH_HANG']}>{el}</YeuCau>;
  const LT = (el) => <YeuCau vaiTro={['LE_TAN']}>{el}</YeuCau>;
  const QL = (el) => <YeuCau vaiTro={['QUAN_LY']}>{el}</YeuCau>;
  return (
    <Routes>
      <Route path="/dang-nhap" element={<DangNhapPage />} />
      <Route path="/dang-ky" element={<DangKyPage />} />
      <Route path="/quen-mat-khau" element={<QuenMatKhauPage />} />
      <Route path="/thanh-toan/gia-lap" element={<GiaLapVnpayPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<DatSanPage />} />
        <Route path="/don-cua-toi" element={KH(<LichDatCuaToiPage />)} />
        <Route path="/thanh-toan/ket-qua" element={<KetQuaThanhToanPage />} />
        <Route path="/thanh-toan/:maDon" element={<YeuCau vaiTro={['KHACH_HANG']}><ThanhToanPage /></YeuCau>} />
        <Route path="/ca-nhan" element={<YeuCau><CaNhanPage /></YeuCau>} />
        <Route path="/uu-dai" element={<UuDaiPage />} />
        <Route path="/hoa-don/:maHoaDon" element={<YeuCau><HoaDonPage /></YeuCau>} />
        <Route path="/le-tan/van-hanh" element={LT(<VanHanhSanPage />)} />
        <Route path="/le-tan/lich-san" element={LT(<DatSanPage cheDoNhanVien />)} />
        <Route path="/le-tan/don" element={LT(<QuanLyDonPage />)} />
        <Route path="/le-tan/ban-goi" element={LT(<BanGoiTaiQuayPage />)} />
        <Route path="/hlv/lich-day" element={<YeuCau vaiTro={['HLV']}><LichDayPage /></YeuCau>} />
        <Route path="/quan-ly/san" element={QL(<SanPage />)} />
        <Route path="/quan-ly/bang-gia" element={QL(<BangGiaPage />)} />
        <Route path="/quan-ly/dich-vu" element={QL(<DichVuPage />)} />
        <Route path="/quan-ly/uu-dai" element={QL(<UuDaiQuanLyPage />)} />
        <Route path="/quan-ly/tai-khoan" element={QL(<TaiKhoanPage />)} />
        <Route path="/quan-ly/bao-cao" element={QL(<BaoCaoPage />)} />
        <Route path="/quan-ly/khieu-nai" element={QL(<KhieuNaiPage />)} />
        <Route path="/quan-ly/nhat-ky" element={QL(<NhatKyPage />)} />
        <Route path="/quan-ly/don" element={QL(<QuanLyDonPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

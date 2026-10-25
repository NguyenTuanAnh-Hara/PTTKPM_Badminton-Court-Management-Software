import { Typography } from 'antd';
import { tien } from '../utils/format.js';

// Bảng tính tiền (UC03.1 bước 2–3, QT-09 → QT-10, QT-22, QT-23)
// bang: bangTinhTien trả về từ POST /thanh-toan/tinh-tien
export default function BangTinhTien({ bang }) {
  if (!bang) return null;
  const Dong = ({ ten, gia, am = false, nho = false }) => (
    <div className="dong-tien" style={nho ? { color: '#8c8c8c', fontSize: 13 } : undefined}>
      <span>{ten}</span>
      <span style={am ? { color: '#cf1322' } : undefined}>{am ? `− ${tien(gia)}` : tien(gia)}</span>
    </div>
  );
  return (
    <div>
      <Dong ten="Tiền sân" gia={bang.tienSan} />
      {bang.tienDichVu > 0 && <Dong ten="Dịch vụ đi kèm" gia={bang.tienDichVu} />}
      {bang.hocPhi > 0 && <Dong ten="Học phí huấn luyện viên" gia={bang.hocPhi} />}
      <Dong ten="Tạm tính" gia={bang.tamTinh} nho />
      {bang.giamHang > 0 && <Dong ten={`Ưu đãi hạng ${bang.tenHang ?? ''} (trên tiền sân)`} gia={bang.giamHang} am />}
      {bang.giamMa > 0 && <Dong ten={`Mã giảm giá ${bang.maGiamGia ?? ''}`} gia={bang.giamMa} am />}
      <Dong ten="Tổng tiền đơn" gia={bang.tongSauGiam} />
      {bang.daThanhToan > 0 && <Dong ten="Đã thanh toán trước đó" gia={bang.daThanhToan} am />}
      {bang.truDiem > 0 && <Dong ten={`Dùng ${bang.soDiem} điểm thưởng`} gia={bang.truDiem} am />}
      {bang.truGoi > 0 && (
        <Dong ten={`Trừ vào gói giờ / thẻ${bang.gioSuDung ? ` (${bang.gioSuDung} giờ)` : ''}`} gia={bang.truGoi} am />
      )}
      <div className="dong-tien tong">
        <span>Cần thanh toán</span>
        <Typography.Text strong style={{ color: '#0f7b5f', fontSize: 18 }}>{tien(bang.phaiTra)}</Typography.Text>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Số tiền được làm tròn đến 1.000 đ.</Typography.Text>
    </div>
  );
}

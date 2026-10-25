import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { thanhToanApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MUC_DICH, tien } from '../../utils/format.js';

// Trang trình duyệt quay về sau khi thanh toán (vnp_ReturnUrl): GET /thanh-toan/vnpay-return xác minh chữ ký và ghi nhận
export default function KetQuaThanhToanPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { taiLai } = useAuth();
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState(null);
  const daGoi = useRef(false);

  useEffect(() => {
    if (daGoi.current) return; // StrictMode gọi effect 2 lần – API lũy đẳng nhưng tránh gọi thừa
    daGoi.current = true;
    const params = Object.fromEntries(sp.entries());
    thanhToanApi
      .ketQua(params)
      .then((r) => {
        setKq(r);
        taiLai();
      })
      .catch(setLoi);
  }, []);

  if (loi) return <Result status="error" title="Không xác nhận được kết quả thanh toán" subTitle={loi.message} extra={<Button onClick={() => nav('/')}>Về trang chủ</Button>} />;
  if (!kq) return <Spin size="large" tip="Đang xác nhận kết quả thanh toán…" style={{ display: 'block', margin: 80 }}><div /></Spin>;

  const nutDon = kq.maDon ? <Button key="don" type="primary" onClick={() => nav('/don-cua-toi')}>Xem lịch đặt của tôi</Button> : <Button key="ud" type="primary" onClick={() => nav('/uu-dai')}>Về thành viên & gói giờ</Button>;

  if (!kq.thanhCong) {
    return (
      <Result
        status="warning"
        title="Thanh toán chưa thành công"
        subTitle={`Giao dịch ${kq.maGiaoDich} (${MUC_DICH[kq.mucDich]}) không thành công hoặc đã bị hủy. ${kq.maDon ? 'Bạn có thể thử lại trong thời gian giữ chỗ.' : ''}`}
        extra={[kq.maDon && <Button key="lai" onClick={() => nav(`/thanh-toan/${kq.maDon}`)}>Thử thanh toán lại</Button>, nutDon]}
      />
    );
  }
  return (
    <Result
      status="success"
      title={`Thanh toán thành công ${tien(kq.soTien)}`}
      subTitle={kq.ghiChu || `${MUC_DICH[kq.mucDich]}${kq.maDon ? ` – đơn ${kq.maDon} đã được xác nhận` : ''}. Mã giao dịch ${kq.maGiaoDich}.`}
      extra={[kq.maHoaDon && <Button key="hd" onClick={() => nav(`/hoa-don/${kq.maHoaDon}`)}>Xem hóa đơn {kq.maHoaDon}</Button>, nutDon]}
    />
  );
}

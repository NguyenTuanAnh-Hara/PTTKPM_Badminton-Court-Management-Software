import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, Descriptions, Divider, Radio, Space, Typography } from 'antd';
import { thanhToanApi } from '../../api/index.js';
import { tien } from '../../utils/format.js';

// Trang giả lập cổng VNPAY (chỉ dùng khi backend chạy VNPAY_MODE=mock).
// Lấy bộ tham số kết quả đã ký từ GET /thanh-toan/gia-lap rồi chuyển sang /thanh-toan/ket-qua như VNPAY thật.
export default function GiaLapVnpayPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const txnRef = sp.get('txnRef');
  const soTien = Number(sp.get('soTien'));
  const noiDung = sp.get('noiDung');
  const [nganHang, setNganHang] = useState('NCB');
  const [dangGui, setDangGui] = useState(null);

  const ketThuc = async (thanhCong) => {
    setDangGui(thanhCong ? 'ok' : 'huy');
    try {
      const params = await thanhToanApi.giaLap(txnRef, thanhCong);
      nav(`/thanh-toan/ket-qua?${new URLSearchParams(params)}`, { replace: true });
    } catch (e) {
      message.error(e.message);
      setDangGui(null);
    }
  };

  return (
    <div className="nen-vnpay">
      <Card style={{ width: '100%', maxWidth: 520 }}>
        <div className="logo-vnpay"><span className="vn">VN</span><span className="pay">PAY</span> <Typography.Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>Cổng thanh toán (giả lập)</Typography.Text></div>
        <Alert type="warning" showIcon style={{ margin: '12px 0' }} message="Môi trường thử nghiệm – không trừ tiền thật. Chọn kết quả giao dịch để quay về hệ thống." />
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Mã giao dịch">{txnRef}</Descriptions.Item>
          <Descriptions.Item label="Nội dung">{noiDung}</Descriptions.Item>
          <Descriptions.Item label="Số tiền"><b style={{ fontSize: 18, color: '#005baa' }}>{tien(soTien)}</b></Descriptions.Item>
        </Descriptions>
        <Divider orientation="left" plain>Ngân hàng</Divider>
        <Radio.Group value={nganHang} onChange={(e) => setNganHang(e.target.value)} optionType="button" options={['NCB', 'Vietcombank', 'BIDV', 'VietinBank', 'Ví VNPAY']} />
        <Space style={{ marginTop: 24, width: '100%', justifyContent: 'flex-end' }}>
          <Button danger loading={dangGui === 'huy'} disabled={Boolean(dangGui)} onClick={() => ketThuc(false)}>Hủy giao dịch</Button>
          <Button type="primary" loading={dangGui === 'ok'} disabled={!txnRef || Boolean(dangGui)} onClick={() => ketThuc(true)} style={{ background: '#005baa' }}>
            Thanh toán thành công
          </Button>
        </Space>
      </Card>
    </div>
  );
}

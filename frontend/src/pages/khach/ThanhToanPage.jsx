import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, Col, Descriptions, Result, Row, Skeleton, Space, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { datSanApi, thanhToanApi } from '../../api/index.js';
import BangTinhTien from '../../components/BangTinhTien.jsx';
import ChonUuDai, { useTinhTien } from '../../components/ChonUuDai.jsx';
import DongHoGiuCho from '../../components/DongHoGiuCho.jsx';
import TrangThaiDon from '../../components/TrangThaiDon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { gio, moTaKhung, ngayChoiCuaDon, ngayVN, tien } from '../../utils/format.js';

// UC03.1 Thanh toán trực tuyến: chọn ưu đãi → bảng tính tiền → POST /thanh-toan → chuyển sang VNPAY
export default function ThanhToanPage() {
  const { maDon } = useParams();
  const { message } = App.useApp();
  const nav = useNavigate();
  const { taiLai } = useAuth();
  const [don, setDon] = useState(null);
  const [loiDon, setLoiDon] = useState(null);
  const [hetHan, setHetHan] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [daXong, setDaXong] = useState(null);
  const tinh = useTinhTien(don?.coTheThanhToan && !hetHan ? maDon : null);
  const bang = tinh.ketQua?.bangTinhTien;

  useEffect(() => {
    datSanApi.chiTiet(maDon).then(setDon).catch(setLoiDon);
  }, [maDon]);

  const thanhToan = async () => {
    setDangGui(true);
    try {
      const r = await thanhToanApi.taoThanhToan({
        maDon,
        maGiamGia: tinh.luaChon.maGiamGia || undefined,
        soDiem: tinh.luaChon.soDiem || undefined,
        goiGioChoiId: tinh.luaChon.goiGioChoiId || undefined,
      });
      if (r.daThanhToan) {
        taiLai();
        setDaXong(r);
        return;
      }
      window.location.href = r.paymentUrl;
    } catch (e) {
      message.error(e.message);
      if (e.code === 'DON_HET_HAN_GIU_CHO') setHetHan(true);
      setDangGui(false);
    }
  };

  if (loiDon) return <Result status="404" title="Không xem được đơn" subTitle={loiDon.message} extra={<Button onClick={() => nav('/don-cua-toi')}>Về lịch đặt của tôi</Button>} />;
  if (!don) return <Skeleton active />;
  if (daXong) {
    return (
      <Result
        status="success"
        title="Thanh toán thành công"
        subTitle="Ưu đãi đã phủ toàn bộ số tiền, đơn được xác nhận ngay."
        extra={[
          daXong.hoaDon && <Button key="hd" onClick={() => nav(`/hoa-don/${daXong.hoaDon}`)}>Xem hóa đơn</Button>,
          <Button key="ds" type="primary" onClick={() => nav('/don-cua-toi')}>Về lịch đặt của tôi</Button>,
        ]}
      />
    );
  }
  if (!don.coTheThanhToan) {
    return (
      <Result
        status={don.conPhaiThu ? 'warning' : 'success'}
        title={don.conPhaiThu ? 'Đơn không còn ở trạng thái thanh toán được' : 'Đơn đã được thanh toán đủ'}
        subTitle={`Đơn ${don.maDon} – ${don.tenTrangThai}`}
        extra={<Button type="primary" onClick={() => nav('/don-cua-toi')}>Về lịch đặt của tôi</Button>}
      />
    );
  }

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Thanh toán đơn {don.maDon}</Typography.Title>
        <Space>
          <TrangThaiDon trangThai={don.trangThai} />
          {don.trangThai === 'CHO_THANH_TOAN' && <DongHoGiuCho han={don.hanGiuCho} onHet={() => setHetHan(true)} />}
        </Space>
      </div>
      {hetHan && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Đơn đã quá thời gian giữ chỗ"
          description="Khung giờ đã được trả lại cho hệ thống (QT-04). Vui lòng đặt lại."
          action={<Button onClick={() => nav('/')}>Đặt lại</Button>}
        />
      )}
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="Thông tin đặt sân" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Ngày chơi">{ngayVN(ngayChoiCuaDon(don))}, {gio(don.batDau)} – {gio(don.ketThuc)}</Descriptions.Item>
              <Descriptions.Item label="Sân">{moTaKhung(don.chiTiet).join('; ')}</Descriptions.Item>
              {don.dichVu.length > 0 && (
                <Descriptions.Item label="Dịch vụ">{don.dichVu.map((d) => `${d.tenDichVu} ×${d.soLuong}`).join(', ')}</Descriptions.Item>
              )}
              {don.buoiHoc.length > 0 && (
                <Descriptions.Item label="Huấn luyện viên">{don.buoiHoc.filter((b) => b.trangThai !== 'DA_HUY').map((b) => `${b.hlv} ${b.gioBatDau}–${b.gioKetThuc}`).join(', ')}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>
          <Card title="Ưu đãi" size="small">
            <ChonUuDai tinh={tinh} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Bảng tính tiền" size="small">
            {bang ? <BangTinhTien bang={bang} /> : <Skeleton active />}
            <Button
              type="primary"
              size="large"
              block
              style={{ marginTop: 16 }}
              icon={<SafetyCertificateOutlined />}
              loading={dangGui}
              disabled={!bang || Boolean(tinh.loi) || tinh.dangTinh || hetHan}
              onClick={thanhToan}
            >
              {bang?.phaiTra === 0 ? 'Xác nhận (không cần trả thêm)' : `Thanh toán ${tien(bang?.phaiTra)} qua VNPAY`}
            </Button>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
              Bạn sẽ được chuyển sang cổng VNPAY. Đơn được xác nhận ngay khi hệ thống nhận kết quả thanh toán thành công.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </>
  );
}

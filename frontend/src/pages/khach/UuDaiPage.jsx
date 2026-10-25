import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Col, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { CrownOutlined, FieldTimeOutlined, CreditCardOutlined, CheckOutlined } from '@ant-design/icons';
import { authApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ngayVN, tien } from '../../utils/format.js';

// UC01.4 Đăng ký gói thành viên + UC03.2 Mua gói giờ chơi / thẻ trả trước (thanh toán qua VNPAY)
export default function UuDaiPage() {
  const { message, modal } = App.useApp();
  const nav = useNavigate();
  const { user } = useAuth();
  const [hang, setHang] = useState(null);
  const [goi, setGoi] = useState(null);
  const [dangMua, setDangMua] = useState(null);
  const laKhach = user?.vaiTro === 'KHACH_HANG';
  const hangHienTai = hang?.find((h) => h.laHangHienTai);

  useEffect(() => {
    authApi.dsGoiThanhVien().then(setHang).catch((e) => message.error(e.message));
    authApi.dsLoaiGoiGio().then(setGoi).catch((e) => message.error(e.message));
  }, [user?.id]);

  const yeuCauKhach = () => {
    if (!user) {
      nav('/dang-nhap', { state: { tu: '/uu-dai' } });
      return false;
    }
    if (!laKhach) {
      message.info('Chức năng dành cho khách hàng. Lễ tân bán gói tại quầy ở mục “Bán gói tại quầy”.');
      return false;
    }
    return true;
  };

  const chuyenThanhToan = (r) => {
    window.location.href = r.paymentUrl;
  };

  const dangKyHang = (h) => {
    if (!yeuCauKhach()) return;
    const loai = h.laHangHienTai ? 'Gia hạn' : hangHienTai ? (h.phi > hangHienTai.phi ? 'Nâng hạng' : 'Đổi hạng') : 'Đăng ký';
    modal.confirm({
      title: `${loai} hạng ${h.tenGoi}?`,
      content: `Phí ${tien(h.phi)} cho ${h.thoiHanNgay} ngày. ${h.laHangHienTai ? 'Thời hạn được cộng nối tiếp hạn hiện tại.' : ''} Bạn sẽ được chuyển sang VNPAY để thanh toán.`,
      okText: 'Thanh toán',
      onOk: async () => {
        setDangMua(`h${h.id}`);
        try {
          chuyenThanhToan(await authApi.dangKyGoiThanhVien(h.id));
        } catch (e) {
          message.error(e.message);
          setDangMua(null);
        }
      },
    });
  };

  const muaGoi = (g) => {
    if (!yeuCauKhach()) return;
    modal.confirm({
      title: `Mua ${g.tenGoi}?`,
      content: `Giá ${tien(g.giaBan)}, hạn sử dụng ${g.thoiHanNgay} ngày kể từ khi thanh toán thành công.`,
      okText: 'Thanh toán',
      onOk: async () => {
        setDangMua(`g${g.id}`);
        try {
          chuyenThanhToan(await authApi.muaGoiGio(g.id));
        } catch (e) {
          message.error(e.message);
          setDangMua(null);
        }
      },
    });
  };

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Thành viên & gói giờ</Typography.Title>
        {laKhach && hangHienTai && <Tag color="gold" icon={<CrownOutlined />}>Hạng hiện tại: {hangHienTai.tenGoi} – đến {ngayVN(hangHienTai.hanHienTai)}</Tag>}
      </div>

      <Typography.Title level={5}><CrownOutlined /> Hạng thành viên</Typography.Title>
      <Typography.Paragraph type="secondary">Giảm giá tiền sân mỗi lần đặt và tích điểm nhanh hơn (QT-20, QT-21). 1 điểm = 100 đ, dùng tối đa 50% số tiền đơn.</Typography.Paragraph>
      {!hang ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {hang.map((h) => (
            <Col xs={24} sm={12} lg={8} key={h.id}>
              <Card className={`the-uu-dai ${h.laHangHienTai ? 'hien-tai' : ''}`} title={<Space>{h.tenGoi}{h.laHangHienTai && <Tag color="green">Đang dùng</Tag>}</Space>}>
                <div className="gia-lon">{tien(h.phi)}</div>
                <Typography.Text type="secondary">/ {h.thoiHanNgay} ngày</Typography.Text>
                <ul style={{ paddingLeft: 18, margin: '12px 0' }}>
                  <li>Giảm <b>{h.phanTramGiam}%</b> tiền sân</li>
                  <li>Tích điểm × <b>{h.heSoTichDiem}</b> (10 điểm mỗi giờ chơi)</li>
                </ul>
                <Button type={h.laHangHienTai ? 'default' : 'primary'} block loading={dangMua === `h${h.id}`} onClick={() => dangKyHang(h)}>
                  {h.laHangHienTai ? 'Gia hạn' : hangHienTai ? 'Chuyển sang hạng này' : 'Đăng ký'}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Typography.Title level={5}><FieldTimeOutlined /> Gói giờ chơi & thẻ trả trước</Typography.Title>
      <Typography.Paragraph type="secondary">
        Dùng ở bước thanh toán. Gói giờ trừ 1 giờ/khung ngày thường, 1,5 giờ/khung giờ cao điểm, cuối tuần, ngày lễ; thẻ trả trước trừ theo số tiền (QT-23).
      </Typography.Paragraph>
      {!goi ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {goi.map((g) => (
            <Col xs={24} sm={12} lg={8} key={g.id}>
              <Card className="the-uu-dai" title={<Space>{g.loai === 'GOI_GIO' ? <FieldTimeOutlined /> : <CreditCardOutlined />}{g.tenGoi}</Space>}>
                <div className="gia-lon">{tien(g.giaBan)}</div>
                <ul style={{ paddingLeft: 18, margin: '12px 0' }}>
                  {g.loai === 'GOI_GIO' ? <li><CheckOutlined /> {g.soGio} giờ chơi</li> : <li><CheckOutlined /> Số dư {tien(g.menhGia)}</li>}
                  {g.loai === 'THE_TRA_TRUOC' && g.menhGia > g.giaBan && <li>Tặng thêm {tien(g.menhGia - g.giaBan)}</li>}
                  <li>Hạn dùng {g.thoiHanNgay} ngày</li>
                </ul>
                <Button type="primary" ghost block loading={dangMua === `g${g.id}`} onClick={() => muaGoi(g)}>Mua</Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}

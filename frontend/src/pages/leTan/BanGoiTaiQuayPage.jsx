import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Card, Col, Descriptions, Empty, Radio, Result, Row, Select, Space, Tag, Typography } from 'antd';
import { authApi, thanhToanApi, vanHanhApi } from '../../api/index.js';
import { TRANG_THAI_TK, tien } from '../../utils/format.js';

// UC03.2 – A1, UC01.4: lễ tân bán gói giờ / thẻ trả trước hoặc hạng thành viên tại quầy (POST /thanh-toan/tai-quay/ban-goi)
export default function BanGoiTaiQuayPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [dsKhach, setDsKhach] = useState([]);
  const [khach, setKhach] = useState(null);
  const [dsHang, setDsHang] = useState([]);
  const [dsGoi, setDsGoi] = useState([]);
  const [chon, setChon] = useState(null); // 'h:1' | 'g:2'
  const [phuongThuc, setPhuongThuc] = useState('TIEN_MAT');
  const [dangGui, setDangGui] = useState(false);
  const [ketQua, setKetQua] = useState(null);
  const hen = useRef(null);

  useEffect(() => {
    authApi.dsGoiThanhVien().then(setDsHang).catch(() => {});
    authApi.dsLoaiGoiGio().then(setDsGoi).catch(() => {});
  }, []);

  const tim = (q) => {
    clearTimeout(hen.current);
    if (!q || q.length < 3) return;
    hen.current = setTimeout(() => vanHanhApi.timKhach(q).then(setDsKhach).catch(() => setDsKhach([])), 300);
  };

  const [loai, id] = chon ? chon.split(':') : [null, null];
  const mon = loai === 'h' ? dsHang.find((h) => h.id === Number(id)) : dsGoi.find((g) => g.id === Number(id));
  const gia = loai === 'h' ? mon?.phi : mon?.giaBan;

  const ban = async () => {
    setDangGui(true);
    try {
      const r = await thanhToanApi.banTaiQuay({
        khachHangId: khach.id,
        phuongThuc,
        ...(loai === 'h' ? { goiThanhVienId: Number(id) } : { loaiGoiGioId: Number(id) }),
      });
      setKetQua(r);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  if (ketQua) {
    return (
      <Result
        status="success"
        title="Đã bán thành công"
        subTitle={ketQua.thongBao}
        extra={[
          <Button key="hd" onClick={() => nav(`/hoa-don/${ketQua.hoaDon}`)}>In hóa đơn {ketQua.hoaDon}</Button>,
          <Button key="moi" type="primary" onClick={() => { setKetQua(null); setChon(null); setKhach(null); }}>Bán tiếp</Button>,
        ]}
      />
    );
  }

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Bán gói tại quầy</Typography.Title>
      </div>
      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card size="small" title="1. Khách hàng" style={{ marginBottom: 16 }}>
            <Select
              showSearch
              allowClear
              style={{ width: '100%' }}
              placeholder="Tìm tài khoản khách theo SĐT, tên hoặc email (≥ 3 ký tự)"
              filterOption={false}
              onSearch={tim}
              notFoundContent={null}
              value={khach?.id}
              onChange={(v) => setKhach(dsKhach.find((k) => k.id === v) ?? null)}
              options={dsKhach.map((k) => ({ value: k.id, label: `${k.hoTen} – ${k.soDienThoai}` }))}
            />
            {khach && (
              <Descriptions size="small" column={2} style={{ marginTop: 12 }}>
                <Descriptions.Item label="Email">{khach.email}</Descriptions.Item>
                <Descriptions.Item label="Điểm thưởng">{khach.diemThuong}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{TRANG_THAI_TK[khach.trangThai]}</Descriptions.Item>
              </Descriptions>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Khách chưa có tài khoản cần đăng ký trước (gói gắn với tài khoản).</Typography.Text>
          </Card>
          <Card size="small" title="2. Chọn gói">
            <Radio.Group value={chon} onChange={(e) => setChon(e.target.value)} style={{ width: '100%' }}>
              <Typography.Text strong>Hạng thành viên</Typography.Text>
              <Space direction="vertical" style={{ width: '100%', margin: '8px 0 16px' }}>
                {dsHang.map((h) => (
                  <Radio key={h.id} value={`h:${h.id}`}>
                    <b>{h.tenGoi}</b> – {tien(h.phi)} / {h.thoiHanNgay} ngày · giảm {h.phanTramGiam}% tiền sân · tích điểm ×{h.heSoTichDiem}
                  </Radio>
                ))}
              </Space>
              <Typography.Text strong>Gói giờ / thẻ trả trước</Typography.Text>
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                {dsGoi.map((g) => (
                  <Radio key={g.id} value={`g:${g.id}`}>
                    <b>{g.tenGoi}</b> – {tien(g.giaBan)} · {g.loai === 'GOI_GIO' ? `${g.soGio} giờ` : `số dư ${tien(g.menhGia)}`} · hạn {g.thoiHanNgay} ngày
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
            {!dsHang.length && !dsGoi.length && <Empty />}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="3. Thanh toán" className="khung-dat">
            {mon ? (
              <>
                <div className="dong-tien"><span>{loai === 'h' ? `Hạng ${mon.tenGoi}` : mon.tenGoi}</span><span>{tien(gia)}</span></div>
                <div className="dong-tien tong"><span>Cần thu</span><span>{tien(gia)}</span></div>
              </>
            ) : (
              <Typography.Text type="secondary">Chưa chọn gói</Typography.Text>
            )}
            <Radio.Group style={{ marginTop: 12 }} value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="TIEN_MAT">Tiền mặt</Radio.Button>
              <Radio.Button value="CHUYEN_KHOAN">Chuyển khoản</Radio.Button>
            </Radio.Group>
            {khach && khach.trangThai === 'KHOA' && <Alert type="error" style={{ marginTop: 12 }} message="Tài khoản khách đang bị khóa" />}
            <Button type="primary" block size="large" style={{ marginTop: 16 }} disabled={!khach || !mon} loading={dangGui} onClick={ban}>
              Xác nhận đã thu {gia ? tien(gia) : ''}
            </Button>
            {khach && mon && <Tag style={{ marginTop: 8 }}>Bán cho {khach.hoTen}</Tag>}
          </Card>
        </Col>
      </Row>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Card, Col, Descriptions, Empty, Form, Input, Row, Statistic, Table, Tag, Typography } from 'antd';
import { authApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TRANG_THAI_TK, VAI_TRO, ngayVN, tien } from '../../utils/format.js';

const MAT_KHAU = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// UC01.3 Quản lý thông tin cá nhân: sửa họ tên / email, đổi mật khẩu; khách xem hạng, điểm, gói giờ
export default function CaNhanPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const { user, taiLai } = useAuth();
  const [form] = Form.useForm();
  const [formMk] = Form.useForm();
  const [dangLuu, setDangLuu] = useState(false);
  const [dangDoi, setDangDoi] = useState(false);
  const [goiGio, setGoiGio] = useState([]);
  const kh = user.khachHang;

  useEffect(() => {
    form.setFieldsValue({ hoTen: user.hoTen, email: user.email });
    if (user.vaiTro === 'KHACH_HANG') authApi.goiCuaToi().then(setGoiGio).catch(() => {});
  }, [user]);

  const luu = async (v) => {
    setDangLuu(true);
    try {
      await authApi.capNhat({ hoTen: v.hoTen.trim(), email: v.email.trim() });
      await taiLai();
      message.success('Đã cập nhật thông tin');
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  const doiMk = async (v) => {
    setDangDoi(true);
    try {
      await authApi.doiMatKhau({ matKhauCu: v.matKhauCu, matKhauMoi: v.matKhauMoi });
      formMk.resetFields();
      message.success('Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.');
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangDoi(false);
    }
  };

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Tài khoản của tôi</Typography.Title>
        <Tag color="green">{VAI_TRO[user.vaiTro]}</Tag>
      </div>

      {kh && (
        <>
          {user.trangThai === 'KHOA_DAT_TRUC_TUYEN' && (
            <Alert type="error" showIcon style={{ marginBottom: 16 }} message="Tài khoản đang bị khóa đặt sân trực tuyến" description={`Bạn có ${kh.soLanNoShow30Ngay} lần không đến trong 30 ngày gần nhất. Vui lòng liên hệ quản lý để mở khóa.`} />
          )}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Hạng thành viên" value={kh.hang?.tenGoi ?? 'Chưa có'} valueStyle={{ fontSize: 20 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {kh.hang ? `Giảm ${kh.hang.phanTramGiam}% tiền sân · đến ${ngayVN(kh.hanThanhVien)}` : <a onClick={() => nav('/uu-dai')}>Đăng ký ngay</a>}
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Điểm thưởng" value={kh.diemThuong} suffix="điểm" />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>≈ {tien(kh.diemThuong * 100)}</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Gói giờ còn hạn" value={goiGio.filter((g) => g.conHan).length} suffix="gói" />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}><a onClick={() => nav('/uu-dai')}>Mua thêm</a></Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Không đến (30 ngày)" value={kh.soLanNoShow30Ngay} suffix="/ 3 lần" valueStyle={{ color: kh.soLanNoShow30Ngay >= 2 ? '#cf1322' : undefined }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đủ 3 lần sẽ bị khóa đặt online</Typography.Text>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Thông tin cá nhân" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Số điện thoại">{user.soDienThoai}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{TRANG_THAI_TK[user.trangThai]}</Descriptions.Item>
              {user.hlv && <Descriptions.Item label="Chuyên môn">{user.hlv.chuyenMon || '—'} · {tien(user.hlv.hocPhiGio)}/giờ</Descriptions.Item>}
            </Descriptions>
            <Form form={form} layout="vertical" onFinish={luu} requiredMark={false}>
              <Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }, { pattern: /^[\p{L} ]{2,100}$/u, message: 'Họ tên 2–100 ký tự, chỉ gồm chữ' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không đúng định dạng' }]}>
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={dangLuu}>Lưu thay đổi</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Đổi mật khẩu" size="small" style={{ marginBottom: 16 }}>
            <Form form={formMk} layout="vertical" onFinish={doiMk} requiredMark={false}>
              <Form.Item name="matKhauCu" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item name="matKhauMoi" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { pattern: MAT_KHAU, message: 'Tối thiểu 8 ký tự, có cả chữ và số' }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="xacNhan"
                label="Nhập lại mật khẩu mới"
                dependencies={['matKhauMoi']}
                rules={[
                  { required: true, message: 'Nhập lại mật khẩu mới' },
                  ({ getFieldValue }) => ({ validator: (_, v) => (!v || v === getFieldValue('matKhauMoi') ? Promise.resolve() : Promise.reject(new Error('Không khớp'))) }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button htmlType="submit" loading={dangDoi}>Đổi mật khẩu</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      {kh && (
        <Card title="Gói giờ / thẻ trả trước đã mua" size="small">
          {!goiGio.length ? (
            <Empty description="Bạn chưa mua gói giờ nào" />
          ) : (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={goiGio}
              columns={[
                { title: 'Gói', dataIndex: 'tenGoi' },
                { title: 'Còn lại', render: (_, g) => (g.loai === 'GOI_GIO' ? `${g.soGioConLai} giờ` : tien(g.soDuConLai)) },
                { title: 'Ngày mua', dataIndex: 'ngayMua', render: ngayVN },
                { title: 'Hạn sử dụng', dataIndex: 'hanSuDung', render: (v, g) => <Tag color={g.conHan ? 'green' : 'default'}>{ngayVN(v)}{g.conHan ? '' : ' (hết hạn)'}</Tag> },
              ]}
            />
          )}
        </Card>
      )}
    </>
  );
}

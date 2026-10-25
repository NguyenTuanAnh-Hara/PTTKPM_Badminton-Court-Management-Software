import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Collapse, Form, Input, Table, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext.jsx';
import KhungAuth from './KhungAuth.jsx';

const TAI_KHOAN_MAU = [
  { vaiTro: 'Quản lý', sdt: '0900000001' },
  { vaiTro: 'Lễ tân', sdt: '0900000002' },
  { vaiTro: 'Huấn luyện viên', sdt: '0900000004' },
  { vaiTro: 'Khách hạng Vàng', sdt: '0911111111' },
  { vaiTro: 'Khách', sdt: '0922222222' },
];

// UC01.2 Đăng nhập (POST /auth/dang-nhap) bằng số điện thoại hoặc email
export default function DangNhapPage() {
  const { user, dangNhap } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form] = Form.useForm();
  const [loi, setLoi] = useState(null);
  const [dangGui, setDangGui] = useState(false);

  if (user) return <Navigate to={loc.state?.tu || user.trangMacDinh || '/'} replace />;

  const gui = async ({ dinhDanh, matKhau }) => {
    setDangGui(true);
    setLoi(null);
    try {
      const u = await dangNhap(dinhDanh.trim(), matKhau);
      nav(loc.state?.tu || u?.trangMacDinh || '/', { replace: true });
    } catch (e) {
      setLoi(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <KhungAuth tieuDe="Đăng nhập" moTa="Đặt sân trực tuyến, theo dõi lịch và ưu đãi của bạn.">
      {loi && <Alert type="error" showIcon message={loi} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" onFinish={gui} requiredMark={false}>
        <Form.Item name="dinhDanh" label="Số điện thoại hoặc email" rules={[{ required: true, message: 'Nhập số điện thoại hoặc email' }]}>
          <Input prefix={<UserOutlined />} size="large" autoFocus autoComplete="username" />
        </Form.Item>
        <Form.Item name="matKhau" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
          <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
        </Form.Item>
        <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
          <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
        </div>
        <Button type="primary" htmlType="submit" size="large" block loading={dangGui}>Đăng nhập</Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
        Chưa có tài khoản? <Link to="/dang-ky">Đăng ký ngay</Link> · <Link to="/">Xem lịch sân</Link>
      </Typography.Paragraph>
      <Collapse
        size="small"
        items={[
          {
            key: 'mau',
            label: 'Tài khoản dùng thử (mật khẩu MatKhau123)',
            children: (
              <Table
                size="small"
                pagination={false}
                rowKey="sdt"
                dataSource={TAI_KHOAN_MAU}
                onRow={(r) => ({ onClick: () => form.setFieldsValue({ dinhDanh: r.sdt, matKhau: 'MatKhau123' }), style: { cursor: 'pointer' } })}
                columns={[
                  { title: 'Vai trò', dataIndex: 'vaiTro' },
                  { title: 'Số điện thoại', dataIndex: 'sdt' },
                ]}
              />
            ),
          },
        ]}
      />
    </KhungAuth>
  );
}

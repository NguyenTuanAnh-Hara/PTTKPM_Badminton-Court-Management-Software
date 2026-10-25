import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Typography } from 'antd';
import { authApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import KhungAuth from './KhungAuth.jsx';

const HO_TEN = /^[\p{L} ]{2,100}$/u;
const SDT = /^0\d{9}$/;
const MAT_KHAU = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// UC01.1 Đăng ký tài khoản khách hàng (POST /auth/dang-ky), sau đó đăng nhập luôn
export default function DangKyPage() {
  const { message } = App.useApp();
  const { dangNhap } = useAuth();
  const nav = useNavigate();
  const [loi, setLoi] = useState(null);
  const [dangGui, setDangGui] = useState(false);

  const gui = async (v) => {
    setDangGui(true);
    setLoi(null);
    try {
      await authApi.dangKy({ ...v, hoTen: v.hoTen.trim(), email: v.email.trim() });
      await dangNhap(v.soDienThoai, v.matKhau);
      message.success('Đăng ký thành công. Chào mừng bạn!');
      nav('/', { replace: true });
    } catch (e) {
      setLoi(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <KhungAuth tieuDe="Đăng ký tài khoản" moTa="Tạo tài khoản để đặt sân, tích điểm và nhận ưu đãi thành viên." rong={460}>
      {loi && <Alert type="error" showIcon message={loi} style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={gui} requiredMark={false}>
        <Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }, { pattern: HO_TEN, message: 'Họ tên 2–100 ký tự, chỉ gồm chữ và khoảng trắng' }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="soDienThoai" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }, { pattern: SDT, message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' }]}>
          <Input maxLength={10} inputMode="numeric" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không đúng định dạng' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="matKhau" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }, { pattern: MAT_KHAU, message: 'Tối thiểu 8 ký tự, có cả chữ và số' }]} hasFeedback>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="xacNhanMatKhau"
          label="Nhập lại mật khẩu"
          dependencies={['matKhau']}
          hasFeedback
          rules={[
            { required: true, message: 'Nhập lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || getFieldValue('matKhau') === v ? Promise.resolve() : Promise.reject(new Error('Xác nhận mật khẩu không khớp'))),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={dangGui}>Đăng ký</Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
        Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link>
      </Typography.Paragraph>
    </KhungAuth>
  );
}

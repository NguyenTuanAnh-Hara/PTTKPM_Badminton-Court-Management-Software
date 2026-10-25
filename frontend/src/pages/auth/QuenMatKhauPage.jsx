import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Steps, Typography } from 'antd';
import { authApi } from '../../api/index.js';
import KhungAuth from './KhungAuth.jsx';

const MAT_KHAU = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// UC01.2 – A1 Quên mật khẩu: gửi OTP 6 số (hiệu lực 5 phút) → nhập OTP và mật khẩu mới
export default function QuenMatKhauPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [buoc, setBuoc] = useState(0);
  const [dinhDanh, setDinhDanh] = useState('');
  const [loi, setLoi] = useState(null);
  const [dangGui, setDangGui] = useState(false);

  const guiOtp = async (v) => {
    setDangGui(true);
    setLoi(null);
    try {
      await authApi.quenMatKhau({ dinhDanh: v.dinhDanh.trim() });
      setDinhDanh(v.dinhDanh.trim());
      setBuoc(1);
    } catch (e) {
      setLoi(e.message);
    } finally {
      setDangGui(false);
    }
  };

  const datLai = async (v) => {
    setDangGui(true);
    setLoi(null);
    try {
      await authApi.datLaiMatKhau({ otp: v.otp, matKhauMoi: v.matKhauMoi });
      message.success('Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
      nav('/dang-nhap', { replace: true });
    } catch (e) {
      setLoi(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <KhungAuth tieuDe="Quên mật khẩu">
      <Steps size="small" current={buoc} style={{ marginBottom: 20 }} items={[{ title: 'Nhận mã OTP' }, { title: 'Đặt mật khẩu mới' }]} />
      {loi && <Alert type="error" showIcon message={loi} style={{ marginBottom: 16 }} />}
      {buoc === 0 ? (
        <Form layout="vertical" onFinish={guiOtp} requiredMark={false}>
          <Form.Item name="dinhDanh" label="Số điện thoại hoặc email đã đăng ký" rules={[{ required: true, message: 'Nhập số điện thoại hoặc email' }]}>
            <Input autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={dangGui}>Gửi mã OTP</Button>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={datLai} requiredMark={false}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Nếu tài khoản ${dinhDanh} tồn tại, mã OTP đã được gửi tới email đăng ký (hiệu lực 5 phút). Khi chưa cấu hình email, mã được in ra cửa sổ chạy backend.`}
          />
          <Form.Item name="otp" label="Mã OTP" rules={[{ required: true, message: 'Nhập mã OTP' }, { pattern: /^\d{6}$/, message: 'Mã OTP gồm 6 chữ số' }]}>
            <Input maxLength={6} inputMode="numeric" autoFocus style={{ letterSpacing: 6, fontSize: 18 }} />
          </Form.Item>
          <Form.Item name="matKhauMoi" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { pattern: MAT_KHAU, message: 'Tối thiểu 8 ký tự, có cả chữ và số' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={dangGui}>Đặt lại mật khẩu</Button>
          <Button type="link" block onClick={() => setBuoc(0)}>Gửi lại mã</Button>
        </Form>
      )}
      <Typography.Paragraph style={{ marginTop: 12, textAlign: 'center' }}>
        <Link to="/dang-nhap">Quay lại đăng nhập</Link>
      </Typography.Paragraph>
    </KhungAuth>
  );
}

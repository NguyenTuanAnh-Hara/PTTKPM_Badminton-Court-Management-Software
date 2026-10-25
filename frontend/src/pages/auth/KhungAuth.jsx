import { Link } from 'react-router-dom';
import { Card, Typography } from 'antd';

// Khung chung cho các trang đăng nhập / đăng ký / quên mật khẩu
export default function KhungAuth({ tieuDe, moTa, children, rong = 420 }) {
  return (
    <div className="nen-auth">
      <div style={{ width: '100%', maxWidth: rong }}>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginBottom: 16, color: '#fff', fontSize: 22, fontWeight: 700 }}>
          🏸 Sân cầu lông
        </Link>
        <Card>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>{tieuDe}</Typography.Title>
          {moTa && <Typography.Paragraph type="secondary">{moTa}</Typography.Paragraph>}
          {children}
        </Card>
      </div>
    </div>
  );
}

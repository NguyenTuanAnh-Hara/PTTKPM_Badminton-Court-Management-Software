import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Divider, Result, Skeleton, Space, Table, Typography } from 'antd';
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { thanhToanApi } from '../../api/index.js';
import { PHUONG_THUC, ngayGio, tien } from '../../utils/format.js';

// FR-23 Xuất hóa đơn – bản in (GET /hoa-don/:ma)
export default function HoaDonPage() {
  const { maHoaDon } = useParams();
  const nav = useNavigate();
  const [hd, setHd] = useState(null);
  const [loi, setLoi] = useState(null);

  useEffect(() => {
    thanhToanApi.hoaDon(maHoaDon).then(setHd).catch(setLoi);
  }, [maHoaDon]);

  if (loi) return <Result status="404" title="Không tìm thấy hóa đơn" subTitle={loi.message} />;
  if (!hd) return <Skeleton active />;
  const tongDong = hd.dong.reduce((s, d) => s + d.soLuong * d.donGia, 0);

  return (
    <>
      <Space className="khong-in" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>Quay lại</Button>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>In hóa đơn</Button>
      </Space>
      <div className="hoa-don">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0, color: '#0f7b5f' }}>🏸 SÂN CẦU LÔNG</Typography.Title>
            <Typography.Text type="secondary">Hệ thống quản lý sân cầu lông</Typography.Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Typography.Title level={3} style={{ margin: 0 }}>HÓA ĐƠN</Typography.Title>
            <div>Số: <b>{hd.maHoaDon}</b></div>
            <div>Ngày lập: {ngayGio(hd.ngayLap)}</div>
          </div>
        </div>
        <Divider />
        <div>Khách hàng: <b>{hd.khach?.hoTen}</b></div>
        <div>Số điện thoại: {hd.khach?.soDienThoai}</div>
        {hd.khach?.email && <div>Email: {hd.khach.email}</div>}
        {hd.maDon && <div>Mã đơn đặt sân: <b>{hd.maDon}</b></div>}
        <Table
          style={{ marginTop: 16 }}
          size="small"
          bordered
          pagination={false}
          rowKey="stt"
          dataSource={hd.dong.map((d, i) => ({ ...d, stt: i + 1 }))}
          columns={[
            { title: 'STT', dataIndex: 'stt', width: 50, align: 'center' },
            { title: 'Nội dung', dataIndex: 'noiDung' },
            { title: 'SL', dataIndex: 'soLuong', align: 'center', width: 60 },
            { title: 'Đơn giá', dataIndex: 'donGia', align: 'right', render: tien },
            { title: 'Thành tiền', align: 'right', render: (_, d) => tien(d.soLuong * d.donGia) },
          ]}
        />
        <div style={{ maxWidth: 340, marginLeft: 'auto', marginTop: 12 }}>
          {hd.tongTienDon != null && tongDong !== hd.tongTienDon && (
            <>
              <div className="dong-tien"><span>Cộng tiền hàng</span><span>{tien(tongDong)}</span></div>
              <div className="dong-tien"><span>Tổng giá trị đơn (sau ưu đãi)</span><span>{tien(hd.tongTienDon)}</span></div>
            </>
          )}
          <div className="dong-tien tong"><span>Số tiền thanh toán</span><span>{tien(hd.tongTien)}</span></div>
          <div className="dong-tien"><span>Phương thức</span><span>{PHUONG_THUC[hd.phuongThuc]}</span></div>
        </div>
        <Divider />
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 0 }}>Cảm ơn quý khách đã sử dụng dịch vụ!</Typography.Paragraph>
      </div>
    </>
  );
}

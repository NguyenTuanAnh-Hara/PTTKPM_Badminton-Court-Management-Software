import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Form, Input, InputNumber, Rate, Segmented, Space, Spin, Switch, Table, Tag, Typography } from 'antd';
import { quanTriApi } from '../../api/index.js';
import { ngayGio, ngayVN } from '../../utils/format.js';

// UC08.2 Xử lý khiếu nại: danh sách (đánh dấu quá 48 giờ), xem chi tiết «include», phản hồi và đền bù bằng mã giảm giá
export default function KhieuNaiPage() {
  const { message } = App.useApp();
  const [loc, setLoc] = useState('CHO_XU_LY');
  const [ds, setDs] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [chon, setChon] = useState(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setDs(await quanTriApi.dsKhieuNai({ trangThai: loc === 'TAT_CA' ? undefined : loc }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [loc]);

  useEffect(() => {
    tai();
  }, [tai]);

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Khiếu nại</Typography.Title>
        <Segmented value={loc} onChange={setLoc} options={[{ value: 'CHO_XU_LY', label: 'Chờ xử lý' }, { value: 'DA_GIAI_QUYET', label: 'Đã giải quyết' }, { value: 'TAT_CA', label: 'Tất cả' }]} />
      </div>
      <Table
        rowKey="id"
        loading={dangTai}
        dataSource={ds}
        onRow={(r) => ({ onClick: () => setChon(r.id), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Đơn', dataIndex: 'maDon', render: (v) => <b>{v}</b> },
          { title: 'Khách', dataIndex: 'khach' },
          { title: 'Đánh giá', dataIndex: 'soSao', render: (v) => <Rate disabled value={v} style={{ fontSize: 13 }} /> },
          { title: 'Nội dung', dataIndex: 'noiDung', ellipsis: true },
          { title: 'Gửi lúc', dataIndex: 'thoiGianTao', render: ngayGio },
          {
            title: 'Trạng thái',
            render: (_, k) =>
              k.trangThai === 'DA_GIAI_QUYET' ? <Tag color="green">Đã giải quyết · {k.quanLy}</Tag> : k.quaHan ? <Tag color="red">Quá 48 giờ</Tag> : <Tag color="orange">Chờ xử lý</Tag>,
          },
        ]}
      />
      <ChiTietKhieuNai key={chon ?? 'dong'} id={chon} onClose={() => setChon(null)} onXong={tai} />
    </>
  );
}

function ChiTietKhieuNai({ id, onClose, onXong }) {
  const { message } = App.useApp();
  const [kn, setKn] = useState(null);
  const [denBu, setDenBu] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setKn(null);
    setDenBu(false);
    if (id) quanTriApi.chiTietKhieuNai(id).then(setKn).catch((e) => message.error(e.message));
  }, [id]);

  const gui = async () => {
    const v = await form.validateFields();
    setDangGui(true);
    try {
      const r = await quanTriApi.xuLyKhieuNai(id, {
        noiDungXuLy: v.noiDungXuLy.trim(),
        denBu: denBu ? { phanTramGiam: v.phanTramGiam, giamToiDa: v.giamToiDa || undefined } : undefined,
      });
      message.success(r.maDenBu ? `Đã phản hồi khách, tạo mã đền bù ${r.maDenBu}` : 'Đã phản hồi khách');
      form.resetFields();
      onXong();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} width={620} title="Chi tiết khiếu nại">
      {!kn ? (
        <Spin />
      ) : (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Đánh giá"><Rate disabled value={kn.danhGia.soSao} /> <Typography.Text type="secondary">{ngayGio(kn.danhGia.thoiGian)}</Typography.Text></Descriptions.Item>
            <Descriptions.Item label="Nội dung">{kn.danhGia.noiDung}</Descriptions.Item>
            <Descriptions.Item label="Đơn">{kn.don.maDon} · {ngayVN(kn.don.ngayChoi)}</Descriptions.Item>
            <Descriptions.Item label="Khách">{kn.don.khach} · {kn.don.email}</Descriptions.Item>
            <Descriptions.Item label="Sân / khung">{kn.don.khung.join('; ')}</Descriptions.Item>
            <Descriptions.Item label="HLV">{kn.don.hlv.length ? kn.don.hlv.join(', ') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Lễ tân thu tiền">{kn.don.leTan.length ? kn.don.leTan.join(', ') : '—'}</Descriptions.Item>
          </Descriptions>
          {kn.suCo.length > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="Sự cố ghi nhận trong ngày chơi"
              description={<span style={{ whiteSpace: 'pre-line' }}>{kn.suCo.map((s) => `${s.san}: ${s.moTa} (${ngayGio(s.thoiGianGhiNhan)})`).join('\n')}</span>}
            />
          )}
          {kn.trangThai === 'DA_GIAI_QUYET' ? (
            <Alert style={{ marginTop: 16 }} type="success" message="Đã giải quyết" description={<span style={{ whiteSpace: 'pre-line' }}>{kn.noiDungXuLy}</span>} />
          ) : (
            <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ phanTramGiam: 20 }}>
              <Form.Item name="noiDungXuLy" label="Nội dung phản hồi gửi khách" rules={[{ required: true, message: 'Nhập nội dung giải quyết' }, { max: 2000 }]}>
                <Input.TextArea rows={4} showCount maxLength={2000} placeholder="Xin lỗi khách, giải thích nguyên nhân và cách khắc phục…" />
              </Form.Item>
              <Space style={{ marginBottom: 12 }}>
                <Switch checked={denBu} onChange={setDenBu} /> <span>Đền bù bằng mã giảm giá dùng một lần (30 ngày)</span>
              </Space>
              {denBu && (
                <Space wrap>
                  <Form.Item name="phanTramGiam" label="Giảm" rules={[{ required: true }]}>
                    <InputNumber min={1} max={100} addonAfter="%" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item name="giamToiDa" label="Tối đa (không bắt buộc)">
                    <InputNumber min={1000} step={10000} addonAfter="đ" style={{ width: 170 }} />
                  </Form.Item>
                </Space>
              )}
              <Button type="primary" block loading={dangGui} onClick={gui}>Gửi phản hồi & hoàn tất</Button>
            </Form>
          )}
        </>
      )}
    </Drawer>
  );
}

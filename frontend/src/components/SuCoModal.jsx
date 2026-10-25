import { useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Input, Modal, Select, Space, Spin, Table, Tag, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { vanHanhApi } from '../api/index.js';
import TrangThaiDon from './TrangThaiDon.jsx';

/**
 * UC05.4 Ghi nhận sự cố sân (QT-27): bước 1 nhập mô tả → sân chuyển “Bảo trì”;
 * bước 2 «extend» xử lý từng lịch bị ảnh hưởng: chuyển sân thay thế hoặc hủy và hoàn 100%.
 * Mở thẳng bước 2 khi truyền chiXuLy (sân đã bảo trì).
 */
export default function SuCoModal({ san, chiXuLy = false, onClose, onXong }) {
  const { message } = App.useApp();
  const [buoc, setBuoc] = useState(chiXuLy ? 2 : 1);
  const [moTa, setMoTa] = useState('');
  const [denLuc, setDenLuc] = useState(null);
  const [dsLich, setDsLich] = useState(null);
  const [sanMoi, setSanMoi] = useState({});
  const [dangGui, setDangGui] = useState(null);

  const taiLich = async () => {
    try {
      setDsLich(await vanHanhApi.lichAnhHuong(san.id));
    } catch (e) {
      message.error(e.message);
      setDsLich([]);
    }
  };

  useEffect(() => {
    if (chiXuLy) taiLich();
  }, []);

  const ghiNhan = async () => {
    setDangGui('ghi');
    try {
      const den = denLuc ? dayjs().hour(denLuc.hour()).minute(denLuc.minute()).second(0).toISOString() : undefined;
      const r = await vanHanhApi.ghiNhanSuCo({ sanId: san.id, moTa: moTa.trim(), denLuc: den });
      message.success(`Đã ghi nhận sự cố, ${san.tenSan} chuyển sang bảo trì`);
      setDsLich(r.lichBiAnhHuong);
      setBuoc(2);
      onXong?.();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(null);
    }
  };

  const xuLy = async (maDon, hanhDong) => {
    setDangGui(`${maDon}${hanhDong}`);
    try {
      const r = await vanHanhApi.xuLyDonSuCo({ maDon, sanSuCoId: san.id, hanhDong, sanMoiId: sanMoi[maDon] });
      message.success(`${maDon}: ${r.ketQua}`);
      await taiLich();
      onXong?.();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(null);
    }
  };

  return (
    <Modal open width={820} title={`Sự cố ${san.tenSan}`} onCancel={onClose} footer={buoc === 1 ? undefined : <Button onClick={onClose}>Đóng</Button>}
      okText="Ghi nhận sự cố" okButtonProps={{ danger: true, disabled: !moTa.trim(), loading: dangGui === 'ghi' }} onOk={ghiNhan}>
      {buoc === 1 ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert type="warning" showIcon message="Sân sẽ chuyển sang “Bảo trì” và không nhận đặt mới cho đến khi khắc phục." />
          <Input.TextArea rows={3} maxLength={255} showCount placeholder="Mô tả sự cố (ví dụ: thảm bị bong, đèn hỏng…)" value={moTa} onChange={(e) => setMoTa(e.target.value)} autoFocus />
          <Space>
            <span>Dự kiến khắc phục lúc (hôm nay):</span>
            <TimePicker format="HH:mm" minuteStep={15} value={denLuc} onChange={setDenLuc} placeholder="Hết ngày" />
          </Space>
        </Space>
      ) : !dsLich ? (
        <Spin />
      ) : !dsLich.length ? (
        <Empty description="Không có lịch đặt nào bị ảnh hưởng" />
      ) : (
        <>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Chuyển sang sân cùng loại còn trống (giữ nguyên giá, không thu thêm) hoặc hủy và hoàn 100% cho khách (QT-15, QT-27)." />
          <Table
            size="small"
            rowKey="maDon"
            pagination={false}
            dataSource={dsLich}
            columns={[
              { title: 'Đơn', dataIndex: 'maDon', render: (v, r) => <Space direction="vertical" size={0}><b>{v}</b><TrangThaiDon trangThai={r.trangThai} /></Space> },
              { title: 'Khung bị ảnh hưởng', dataIndex: 'khung', render: (ds) => ds.map((k) => <Tag key={k}>{k}</Tag>) },
              {
                title: 'Sân thay thế',
                render: (_, r) =>
                  r.goiYSan.length ? (
                    <Select style={{ width: 130 }} placeholder="Chọn sân" value={sanMoi[r.maDon]} onChange={(v) => setSanMoi((x) => ({ ...x, [r.maDon]: v }))} options={r.goiYSan.map((s) => ({ value: s.id, label: s.tenSan }))} />
                  ) : (
                    <Tag>Không còn sân trống</Tag>
                  ),
              },
              {
                title: '',
                align: 'right',
                render: (_, r) => (
                  <Space>
                    <Button size="small" type="primary" disabled={!sanMoi[r.maDon]} loading={dangGui === `${r.maDon}CHUYEN_SAN`} onClick={() => xuLy(r.maDon, 'CHUYEN_SAN')}>Chuyển sân</Button>
                    <Button size="small" danger loading={dangGui === `${r.maDon}HUY`} onClick={() => xuLy(r.maDon, 'HUY')}>Hủy & hoàn</Button>
                  </Space>
                ),
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { App, Input, Modal, Radio, Space, Typography } from 'antd';
import { vanHanhApi } from '../../api/index.js';
import { tien } from '../../utils/format.js';

// UC05.3 Giao/nhận thiết bị – nhận lại: nguyên vẹn hoàn cọc, hỏng / mất giữ cọc (QT-25)
export default function NhanThietBiModal({ dv, onClose, onXong }) {
  const { message } = App.useApp();
  const [tinhTrang, setTinhTrang] = useState('NGUYEN_VEN');
  const [ghiChu, setGhiChu] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const nhan = async () => {
    setDangGui(true);
    try {
      const r = await vanHanhApi.nhanThietBi({ chiTietDichVuId: dv.id, tinhTrang, ghiChu });
      message.success(r.tienCocHoan ? `Đã nhận lại. Hoàn cọc ${tien(r.tienCocHoan)} cho khách.` : `Đã nhận lại. Giữ cọc ${tien(r.tienCocGiuLai)}.`);
      onXong?.();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Modal open title={`Nhận lại ${dv.tenDichVu} (×${dv.soLuong})`} onCancel={onClose} okText="Xác nhận nhận lại" okButtonProps={{ loading: dangGui }} onOk={nhan}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>Tiền cọc đã thu: <b>{tien(dv.tienCoc)}</b></Typography.Text>
        <Radio.Group value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value)}>
          <Radio value="NGUYEN_VEN">Nguyên vẹn – hoàn cọc</Radio>
          <Radio value="HONG">Hỏng – giữ cọc</Radio>
          <Radio value="MAT">Mất – giữ cọc</Radio>
        </Radio.Group>
        {tinhTrang !== 'NGUYEN_VEN' && <Input.TextArea rows={2} placeholder="Ghi chú tình trạng" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />}
      </Space>
    </Modal>
  );
}

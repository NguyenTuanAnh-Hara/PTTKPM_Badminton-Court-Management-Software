import { useState } from 'react';
import { Alert, App, Descriptions, Input, Modal } from 'antd';
import { datSanApi } from '../../api/index.js';
import { tien } from '../../utils/format.js';

// UC02.4 Hủy lịch đặt sân – hiện số tiền dự kiến hoàn (QT-11) trước khi xác nhận
export default function HuyDonModal({ don, onClose, onXong }) {
  const { message } = App.useApp();
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const dk = don.duKienHoan ?? {};

  const huy = async () => {
    setDangGui(true);
    try {
      const r = await datSanApi.huy(don.maDon, lyDo || undefined);
      message.success(
        r.tongHoan || r.diemHoan
          ? `Đã hủy đơn. Hoàn ${tien(r.tongHoan)}${r.diemHoan ? ` và ${r.diemHoan} điểm` : ''} về kênh đã thanh toán.`
          : 'Đã hủy đơn',
      );
      onXong?.();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Modal
      open
      title={`Hủy đơn ${don.maDon}`}
      onCancel={onClose}
      okText="Xác nhận hủy"
      okButtonProps={{ danger: true, loading: dangGui, disabled: !dk.duocHuy }}
      cancelText="Không hủy"
      onOk={huy}
    >
      {!dk.duocHuy ? (
        <Alert type="warning" showIcon message={dk.lyDo || 'Đơn không thể hủy'} />
      ) : (
        <>
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Đã thanh toán">{tien(don.daThanhToan)}</Descriptions.Item>
            <Descriptions.Item label="Dự kiến hoàn">
              <b style={{ color: '#0f7b5f' }}>{tien(dk.soTienHoan)}</b>
              {dk.diemHoan ? ` + ${dk.diemHoan} điểm thưởng` : ''}
            </Descriptions.Item>
          </Descriptions>
          {dk.ghiChu && <Alert type="info" showIcon message={dk.ghiChu} style={{ marginBottom: 12 }} />}
          <Alert
            type="warning"
            message="Quy định hủy (QT-11): trước giờ chơi ≥ 24 giờ hoàn 100%; từ 2 đến dưới 24 giờ hoàn 50% tiền sân (dịch vụ chưa giao và học phí hoàn 100%); dưới 2 giờ không được hủy."
            style={{ marginBottom: 12 }}
          />
          <Input.TextArea rows={2} maxLength={255} placeholder="Lý do hủy (không bắt buộc)" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
        </>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { Alert, App, Checkbox, Input, Modal, Rate, Space, Typography } from 'antd';
import { datSanApi } from '../../api/index.js';

const TIEU_CHI = ['Chất lượng sân', 'Ánh sáng', 'Vệ sinh', 'Thái độ nhân viên', 'Thiết bị cho thuê', 'Huấn luyện viên'];
const MO_TA_SAO = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

// UC08.1 Đánh giá sau buổi chơi; dưới 3 sao có thể gửi kèm khiếu nại («extend» UC08.2)
export default function DanhGiaModal({ don, onClose, onXong }) {
  const { message } = App.useApp();
  const [soSao, setSoSao] = useState(5);
  const [noiDung, setNoiDung] = useState('');
  const [tieuChi, setTieuChi] = useState([]);
  const [khieuNai, setKhieuNai] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const thieuNhanXet = soSao < 3 && !noiDung.trim();

  const gui = async () => {
    setDangGui(true);
    try {
      const r = await datSanApi.danhGia(don.maDon, { soSao, noiDung: noiDung.trim() || undefined, tieuChi, guiKhieuNai: soSao < 3 && khieuNai });
      message.success(r.coKhieuNai ? 'Cảm ơn bạn! Khiếu nại đã được chuyển tới quản lý.' : 'Cảm ơn bạn đã đánh giá!');
      onXong?.();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Modal open title={`Đánh giá buổi chơi – đơn ${don.maDon}`} onCancel={onClose} okText="Gửi đánh giá" okButtonProps={{ disabled: thieuNhanXet, loading: dangGui }} onOk={gui}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Rate value={soSao} onChange={(v) => setSoSao(v || 1)} tooltips={MO_TA_SAO} />
          <Typography.Text style={{ marginLeft: 12 }}>{MO_TA_SAO[soSao - 1]}</Typography.Text>
        </div>
        {soSao < 4 && (
          <div>
            <Typography.Text type="secondary">Bạn chưa hài lòng về:</Typography.Text>
            <Checkbox.Group style={{ marginTop: 6 }} options={TIEU_CHI} value={tieuChi} onChange={setTieuChi} />
          </div>
        )}
        <Input.TextArea rows={4} maxLength={1000} showCount placeholder={soSao < 3 ? 'Vui lòng cho biết điều bạn chưa hài lòng (bắt buộc)' : 'Nhận xét của bạn (không bắt buộc)'} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} />
        {soSao < 3 && (
          <>
            <Checkbox checked={khieuNai} onChange={(e) => setKhieuNai(e.target.checked)}>Gửi khiếu nại để quản lý liên hệ giải quyết</Checkbox>
            {thieuNhanXet && <Alert type="warning" showIcon message="Đánh giá dưới 3 sao cần có nhận xét" />}
          </>
        )}
      </Space>
    </Modal>
  );
}

import { Tag } from 'antd';
import { TRANG_THAI_DON } from '../utils/format.js';

// Nhãn trạng thái đơn theo Bảng 3.5i (QT-30)
export default function TrangThaiDon({ trangThai }) {
  const t = TRANG_THAI_DON[trangThai] ?? { ten: trangThai, mau: 'default' };
  return <Tag color={t.mau}>{t.ten}</Tag>;
}

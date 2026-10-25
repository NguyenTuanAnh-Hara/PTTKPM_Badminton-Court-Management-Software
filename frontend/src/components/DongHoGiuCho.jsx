import { useEffect, useRef, useState } from 'react';
import { Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

// Đồng hồ đếm ngược thời gian giữ chỗ (QT-04). Gọi onHet một lần khi hết giờ.
export default function DongHoGiuCho({ han, onHet, nhan = 'Giữ chỗ còn' }) {
  const [conLai, setConLai] = useState(() => (han ? new Date(han) - Date.now() : 0));
  const daBao = useRef(false);

  useEffect(() => {
    if (!han) return undefined;
    daBao.current = false;
    const capNhat = () => {
      const x = new Date(han) - Date.now();
      setConLai(x);
      if (x <= 0 && !daBao.current) {
        daBao.current = true;
        onHet?.();
      }
    };
    capNhat();
    const t = setInterval(capNhat, 1000);
    return () => clearInterval(t);
  }, [han, onHet]);

  if (!han) return null;
  if (conLai <= 0) return <Tag color="red">Đã hết thời gian giữ chỗ</Tag>;
  const tongGiay = Math.floor(conLai / 1000);
  const gio = Math.floor(tongGiay / 3600);
  const phut = Math.floor((tongGiay % 3600) / 60);
  const giay = tongGiay % 60;
  const hai = (n) => String(n).padStart(2, '0');
  const chu = gio > 0 ? `${gio} giờ ${hai(phut)} phút` : `${hai(phut)}:${hai(giay)}`;
  return (
    <Tag icon={<ClockCircleOutlined />} color={tongGiay < 120 ? 'red' : 'orange'}>
      {nhan} {chu}
    </Tag>
  );
}

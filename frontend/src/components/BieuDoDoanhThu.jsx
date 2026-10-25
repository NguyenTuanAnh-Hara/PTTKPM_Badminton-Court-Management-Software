import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { tien } from '../utils/format.js';

// Biểu đồ cột chồng doanh thu theo kỳ và theo nguồn (UC07.1, QT-28)
export const MAU_NGUON = {
  tienSan: '#0f7b5f',
  thietBi: '#4e8fd6',
  doUongDichVu: '#e0a030',
  hocPhi: '#9b6cd1',
  phiThanhVien: '#d9576b',
  banGoiGio: '#5bb8b0',
};

const nhanKy = (ky, nhomTheo) => {
  if (nhomTheo === 'thang') return dayjs(`${ky}-01`).format('MM/YYYY');
  if (nhomTheo === 'tuan') return `Tuần ${dayjs(ky).format('DD/MM')}`;
  return dayjs(ky).format('DD/MM');
};

export default function BieuDoDoanhThu({ duLieu, onChonKy }) {
  if (!duLieu) return null;
  const { theoKy, tenNguon, nhomTheo } = duLieu;
  const ds = theoKy.map((r) => ({ ...r, nhan: nhanKy(r.ky, nhomTheo) }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={ds} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} onClick={(e) => e?.activePayload && onChonKy?.(e.activePayload[0].payload.ky)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="nhan" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('vi-VN')} tr` : `${Math.round(v / 1000)}k`)} width={60} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v, ten) => [tien(v), tenNguon[ten] ?? ten]} labelFormatter={(l) => `Kỳ ${l}`} />
        <Legend formatter={(v) => tenNguon[v] ?? v} />
        {Object.keys(MAU_NGUON).map((k) => (
          <Bar key={k} dataKey={k} stackId="dt" fill={MAU_NGUON[k]} cursor={onChonKy ? 'pointer' : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

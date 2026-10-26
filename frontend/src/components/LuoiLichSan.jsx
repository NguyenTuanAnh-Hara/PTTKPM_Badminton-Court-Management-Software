import { Empty, Tooltip } from 'antd';

// Lưới lịch sân (UC02.1): hàng là sân, cột là 18 khung giờ 60 phút.
// Lớp CSS của ô theo trạng thái: TRONG / CHON / DANG_GIU / DA_DAT / CUA_TOI / BAO_TRI / DA_QUA (styles.css)
const TEN_O = {
  TRONG: 'Còn trống',
  CHON: 'Đang chọn',
  DANG_GIU: 'Đang giữ chỗ (chờ thanh toán)',
  DA_DAT: 'Đã đặt',
  CUA_TOI: 'Lịch của bạn',
  BAO_TRI: 'Sân bảo trì',
  DA_QUA: 'Đã qua giờ đặt',
};

export function ChuThichLuoi({ cheDoNhanVien = false }) {
  const ds = cheDoNhanVien ? ['TRONG', 'CHON', 'DANG_GIU', 'DA_DAT', 'BAO_TRI', 'DA_QUA'] : ['TRONG', 'CHON', 'DANG_GIU', 'DA_DAT', 'CUA_TOI', 'BAO_TRI', 'DA_QUA'];
  return (
    <div className="chu-thich">
      {ds.map((k) => (
        <span key={k} className={k}>{TEN_O[k]}</span>
      ))}
    </div>
  );
}

/**
 * props:
 * - lich: kết quả GET /lich-san ({ khungGio, san })
 * - laChon(sanId, khungGioId) → boolean
 * - onBatTat(sanId, khungGioId): chọn / bỏ chọn ô trống
 * - onXemDon(maDon): (lễ tân) bấm vào ô đã đặt để xem đơn
 * - cheDoNhanVien: hiện tên khách trong ô đã đặt
 */
export default function LuoiLichSan({ lich, laChon = () => false, onBatTat, onXemDon, cheDoNhanVien = false }) {
  if (!lich) return null;
  if (!lich.san.length) return <Empty description="Không có sân nào" />;
  const ngan = (v) => (v == null ? '—' : `${Math.round(v / 1000)}k`);

  return (
    <div className="luoi-wrap">
      <table className="luoi">
        <thead>
          <tr>
            <th className="cot-san">Sân</th>
            {lich.khungGio.map((k, i) => (
              <th key={k.id} className={lich.san.length && lich.san.every((s) => s.o[i]?.trangThai === 'DA_QUA') ? 'qua' : undefined}>
                {k.gioBatDau}
                <span className="gia">{ngan(k.donGia)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lich.san.map((s) => (
            <tr key={s.id}>
              <td className="cot-san">
                {s.tenSan}
                <span className="gia">{s.trangThai === 'BAO_TRI' ? <span style={{ color: '#d46b08' }}>Đang bảo trì</span> : s.loaiSan}</span>
              </td>
              {s.o.map((o, i) => {
                const k = lich.khungGio[i];
                const dangChon = laChon(s.id, o.khungGioId);
                let lop = o.trangThai;
                if (dangChon) lop = 'CHON';
                else if (o.cuaToi && !cheDoNhanVien) lop = 'CUA_TOI';
                const chonDuoc = o.trangThai === 'TRONG' && onBatTat;
                const xemDuoc = cheDoNhanVien && o.maDon && onXemDon;
                const bam = () => {
                  if (chonDuoc) onBatTat(s.id, o.khungGioId);
                  else if (xemDuoc) onXemDon(o.maDon);
                };
                const goiY = [
                  `${s.tenSan} · ${k.gioBatDau}–${k.gioKetThuc}`,
                  TEN_O[lop],
                  k.donGia != null && (o.trangThai === 'TRONG' || dangChon) ? `${k.donGia.toLocaleString('vi-VN')} đ` : null,
                  o.maDon ? `Đơn ${o.maDon} – ${o.tenKhach ?? ''} ${o.sdtKhach ?? ''}` : null,
                ].filter(Boolean).join('\n');
                return (
                  <Tooltip key={o.khungGioId} title={<span style={{ whiteSpace: 'pre-line' }}>{goiY}</span>} mouseEnterDelay={0.4}>
                    <td className={`o ${lop}`} onClick={bam} style={{ cursor: chonDuoc || xemDuoc ? 'pointer' : undefined }}>
                      {cheDoNhanVien && o.tenKhach && <span className="nho">{o.tenKhach}</span>}
                      {!cheDoNhanVien && lop === 'CUA_TOI' && <span className="nho">Của tôi</span>}
                      {dangChon && <span className="nho">✓</span>}
                    </td>
                  </Tooltip>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

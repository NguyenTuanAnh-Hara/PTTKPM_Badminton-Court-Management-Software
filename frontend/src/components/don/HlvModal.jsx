import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Empty, Modal, Radio, Select, Space, Spin, Typography } from 'antd';
import { dichVuApi } from '../../api/index.js';
import { ngayVN, tien } from '../../utils/format.js';

const gioSo = (g) => Number(g.slice(0, 2));
const hai = (n) => `${String(n).padStart(2, '0')}:00`;

// UC04.4 Đặt lịch học với HLV (QT-26): chọn HLV rảnh trùng giờ sân của đơn, buổi học theo giờ chẵn ≥ 1 giờ
export default function HlvModal({ don, onClose, onXong }) {
  const { message } = App.useApp();
  const [ds, setDs] = useState(null);
  const [chon, setChon] = useState(null); // `${hlvId}|${chiSoKhung}`
  const [tu, setTu] = useState(null);
  const [den, setDen] = useState(null);
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    dichVuApi.hlvChoDon(don.maDon).then(setDs).catch((e) => { message.error(e.message); setDs([]); });
  }, [don.maDon]);

  const [hlvId, iKhung] = chon ? chon.split('|').map(Number) : [null, null];
  const hlv = ds?.find((h) => h.id === hlvId);
  const khung = hlv?.khungCoThe[iKhung];
  const dsGio = useMemo(() => {
    if (!khung) return [];
    const a = gioSo(khung.gioBatDau);
    const b = gioSo(khung.gioKetThuc);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }, [khung]);

  useEffect(() => {
    if (khung) {
      setTu(gioSo(khung.gioBatDau));
      setDen(Math.min(gioSo(khung.gioBatDau) + 1, gioSo(khung.gioKetThuc)));
    }
  }, [khung]);

  const hocPhi = hlv && tu != null && den != null ? hlv.hocPhiGio * (den - tu) : 0;

  const dat = async () => {
    setDangGui(true);
    try {
      await dichVuApi.datLichHoc({ maDon: don.maDon, hlvId, ngay: khung.ngay, gioBatDau: hai(tu), gioKetThuc: hai(den) });
      message.success('Đã đặt lịch học. Học phí được cộng vào đơn.');
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
      width={640}
      title={`Đặt huấn luyện viên cho đơn ${don.maDon}`}
      onCancel={onClose}
      okText={hocPhi ? `Đặt lịch (${tien(hocPhi)})` : 'Đặt lịch'}
      okButtonProps={{ disabled: !khung || den <= tu, loading: dangGui }}
      onOk={dat}
    >
      {!ds ? (
        <Spin />
      ) : !ds.length ? (
        <Empty description="Không có huấn luyện viên nào rảnh trong khung giờ sân của đơn này" />
      ) : (
        <>
          <Typography.Paragraph type="secondary">Chọn huấn luyện viên và khoảng giờ rảnh trùng với giờ sân bạn đã đặt.</Typography.Paragraph>
          <Radio.Group value={chon} onChange={(e) => setChon(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {ds.map((h) => (
                <div key={h.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 10 }}>
                  <Typography.Text strong>{h.hoTen}</Typography.Text>{' '}
                  <Typography.Text type="secondary">· {h.chuyenMon || 'Huấn luyện viên'} · {tien(h.hocPhiGio)}/giờ</Typography.Text>
                  <div style={{ marginTop: 6 }}>
                    {h.khungCoThe.map((k, i) => (
                      <Radio key={i} value={`${h.id}|${i}`}>
                        {ngayVN(k.ngay)} {k.gioBatDau}–{k.gioKetThuc}
                      </Radio>
                    ))}
                  </div>
                </div>
              ))}
            </Space>
          </Radio.Group>
          {khung && (
            <Space style={{ marginTop: 16 }} wrap>
              <span>Học từ</span>
              <Select style={{ width: 100 }} value={tu} onChange={setTu} options={dsGio.slice(0, -1).map((g) => ({ value: g, label: hai(g) }))} />
              <span>đến</span>
              <Select style={{ width: 100 }} value={den} onChange={setDen} options={dsGio.filter((g) => g > tu).map((g) => ({ value: g, label: hai(g) }))} />
            </Space>
          )}
          {khung && den <= tu && <Alert style={{ marginTop: 8 }} type="error" message="Buổi học dài tối thiểu 1 giờ" />}
        </>
      )}
    </Modal>
  );
}

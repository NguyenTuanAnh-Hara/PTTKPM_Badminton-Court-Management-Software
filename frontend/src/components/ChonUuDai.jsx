import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import { thanhToanApi } from '../api/index.js';
import { ngayVN, tien } from '../utils/format.js';

/**
 * Hook tính tiền cho một đơn: gọi POST /thanh-toan/tinh-tien mỗi khi lựa chọn ưu đãi thay đổi.
 * Trả về { ketQua, luaChon, setLuaChon, loi, dangTinh, tinhLai }
 */
export function useTinhTien(maDon) {
  const [luaChon, setLuaChon] = useState({ maGiamGia: '', soDiem: 0, goiGioChoiId: null });
  const [ketQua, setKetQua] = useState(null);
  const [loi, setLoi] = useState(null);
  const [dangTinh, setDangTinh] = useState(false);
  const [lan, setLan] = useState(0);
  const lanGoi = useRef(0);

  useEffect(() => {
    if (!maDon) return undefined;
    const id = ++lanGoi.current;
    const t = setTimeout(async () => {
      setDangTinh(true);
      try {
        const r = await thanhToanApi.tinhTien({
          maDon,
          maGiamGia: luaChon.maGiamGia || undefined,
          soDiem: luaChon.soDiem || undefined,
          goiGioChoiId: luaChon.goiGioChoiId || undefined,
        });
        if (id === lanGoi.current) {
          setKetQua(r);
          setLoi(null);
        }
      } catch (e) {
        if (id === lanGoi.current) setLoi(e);
      } finally {
        if (id === lanGoi.current) setDangTinh(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [maDon, luaChon, lan]);

  return { ketQua, luaChon, setLuaChon, loi, dangTinh, tinhLai: () => setLan((x) => x + 1) };
}

/**
 * Ô nhập ưu đãi (extend của UC03.1): mã giảm giá, điểm thưởng, gói giờ / thẻ trả trước.
 * Thứ tự áp dụng theo QT-10: hạng → mã → điểm → gói giờ.
 */
export default function ChonUuDai({ tinh, coTaiKhoan = true }) {
  const { ketQua, luaChon, setLuaChon, loi } = tinh;
  const [ma, setMa] = useState('');
  const bang = ketQua?.bangTinhTien;
  const maDaGan = bang?.maGiamGia && bang.daThanhToan > 0 && !luaChon.maGiamGia;

  return (
    <Form layout="vertical">
      <Form.Item label="Mã giảm giá" help={maDaGan ? `Đơn đã dùng mã ${bang.maGiamGia} ở lần thanh toán trước` : undefined}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Nhập mã, ví dụ GIAM20"
            value={ma}
            onChange={(e) => setMa(e.target.value.toUpperCase())}
            onPressEnter={() => setLuaChon((x) => ({ ...x, maGiamGia: ma.trim() }))}
            disabled={maDaGan}
          />
          {luaChon.maGiamGia ? (
            <Button onClick={() => { setMa(''); setLuaChon((x) => ({ ...x, maGiamGia: '' })); }}>Bỏ mã</Button>
          ) : (
            <Button type="primary" ghost disabled={!ma.trim() || maDaGan} onClick={() => setLuaChon((x) => ({ ...x, maGiamGia: ma.trim() }))}>
              Áp dụng
            </Button>
          )}
        </Space.Compact>
      </Form.Item>

      {coTaiKhoan && (
        <>
          <Form.Item
            label="Dùng điểm thưởng"
            extra={
              bang && (
                <span>
                  Đang có <b>{ketQua.diemHienCo}</b> điểm (1 điểm = 100 đ). Đơn này dùng tối đa <b>{Math.min(bang.diemToiDa, ketQua.diemHienCo - (ketQua.diemHienCo % 10))}</b> điểm, theo bội số 10.
                </span>
              )
            }
          >
            <InputNumber
              min={0}
              step={10}
              style={{ width: 200 }}
              value={luaChon.soDiem}
              disabled={!ketQua?.diemHienCo}
              onChange={(v) => setLuaChon((x) => ({ ...x, soDiem: Number(v) || 0 }))}
              addonAfter="điểm"
            />
          </Form.Item>
          <Form.Item label="Gói giờ / thẻ trả trước">
            <Select
              allowClear
              placeholder={ketQua?.goiGioDungDuoc?.length ? 'Chọn gói để trừ' : 'Không có gói còn hạn'}
              disabled={!ketQua?.goiGioDungDuoc?.length}
              value={luaChon.goiGioChoiId}
              onChange={(v) => setLuaChon((x) => ({ ...x, goiGioChoiId: v ?? null }))}
              options={(ketQua?.goiGioDungDuoc ?? []).map((g) => ({
                value: g.id,
                label: `${g.tenGoi} – ${g.loai === 'GOI_GIO' ? `còn ${g.soGioConLai} giờ` : `số dư ${tien(g.soDuConLai)}`} (HSD ${ngayVN(g.hanSuDung)})`,
              }))}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Gói giờ trừ 1 giờ/khung ngày thường, 1,5 giờ/khung cao điểm 17:00–22:00, cuối tuần và ngày lễ.
            </Typography.Text>
          </Form.Item>
        </>
      )}
      {loi && <Alert type="error" showIcon message={loi.message} style={{ marginBottom: 12 }} />}
    </Form>
  );
}

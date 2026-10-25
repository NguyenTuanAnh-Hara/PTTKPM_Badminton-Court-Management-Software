import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Popconfirm, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { LeftOutlined, RightOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { dichVuApi } from '../../api/index.js';
import { GIO_CHAN, THU, tien } from '../../utils/format.js';

const dauTuan = (d) => d.subtract((d.day() + 6) % 7, 'day').startOf('day'); // thứ Hai

// UC04.5 Quản lý lịch dạy của HLV: xem tuần, khai báo / xóa lịch rảnh (xóa = báo nghỉ, QT-26)
export default function LichDayPage() {
  const { message } = App.useApp();
  const [tuan, setTuan] = useState(dauTuan(dayjs()));
  const [du, setDu] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [ngay, setNgay] = useState(dayjs());
  const [tu, setTu] = useState('17:00');
  const [den, setDen] = useState('21:00');
  const [dangThem, setDangThem] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setDu(await dichVuApi.lichDay({ tuNgay: tuan.format('YYYY-MM-DD'), denNgay: tuan.add(6, 'day').format('YYYY-MM-DD') }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [tuan]);

  useEffect(() => {
    tai();
  }, [tai]);

  const them = async () => {
    setDangThem(true);
    try {
      await dichVuApi.themLichRanh({ ngay: ngay.format('YYYY-MM-DD'), gioBatDau: tu, gioKetThuc: den });
      message.success('Đã thêm lịch rảnh');
      if (!ngay.isBefore(tuan) && !ngay.isAfter(tuan.add(6, 'day'))) tai();
      else setTuan(dauTuan(ngay));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangThem(false);
    }
  };

  const xoa = async (r) => {
    try {
      const kq = await dichVuApi.xoaLichRanh(r.id);
      message.success(kq.soBuoiHuy ? `Đã báo nghỉ, hủy ${kq.soBuoiHuy} buổi học và hoàn học phí cho khách` : 'Đã xóa lịch rảnh');
      tai();
    } catch (e) {
      message.error(e.message);
    }
  };

  const ngays = Array.from({ length: 7 }, (_, i) => tuan.add(i, 'day'));
  const buoiDat = du?.buoiHoc.filter((b) => b.trangThai !== 'DA_HUY') ?? [];
  const tongGio = buoiDat.reduce((s, b) => s + (Number(b.gioKetThuc.slice(0, 2)) - Number(b.gioBatDau.slice(0, 2))), 0);

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Lịch dạy</Typography.Title>
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => setTuan(tuan.subtract(7, 'day'))} />
          <Typography.Text strong>{tuan.format('DD/MM')} – {tuan.add(6, 'day').format('DD/MM/YYYY')}</Typography.Text>
          <Button icon={<RightOutlined />} onClick={() => setTuan(tuan.add(7, 'day'))} />
          <Button onClick={() => setTuan(dauTuan(dayjs()))}>Tuần này</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small"><Statistic title="Buổi dạy trong tuần" value={buoiDat.length} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Số giờ dạy" value={tongGio} suffix="giờ" /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Học phí" value={tien(buoiDat.reduce((s, b) => s + b.hocPhi, 0))} /></Card></Col>
      </Row>

      <Card size="small" title="Khai báo lịch rảnh" style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker value={ngay} onChange={(d) => d && setNgay(d)} format="DD/MM/YYYY" allowClear={false} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          <span>từ</span>
          <Select style={{ width: 100 }} value={tu} onChange={setTu} options={GIO_CHAN.slice(0, -1).map((g) => ({ value: g, label: g }))} />
          <span>đến</span>
          <Select style={{ width: 100 }} value={den} onChange={setDen} options={GIO_CHAN.filter((g) => g > tu).map((g) => ({ value: g, label: g }))} />
          <Button type="primary" icon={<PlusOutlined />} loading={dangThem} disabled={den <= tu} onClick={them}>Thêm</Button>
        </Space>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 6 }}>
          Khách chỉ đặt được buổi học trong lịch rảnh trùng giờ sân đã đặt. Xóa lịch rảnh có buổi học = báo nghỉ: chỉ được khi còn ≥ 24 giờ, học phí hoàn 100% cho khách.
        </div>
      </Card>

      <div className="luoi-tuan" style={{ opacity: dangTai ? 0.6 : 1 }}>
        {ngays.map((d) => {
          const k = d.format('YYYY-MM-DD');
          const ranh = du?.lichRanh.filter((r) => r.ngay === k) ?? [];
          const buoi = du?.buoiHoc.filter((b) => b.ngay === k) ?? [];
          const qua = d.isBefore(dayjs(), 'day');
          return (
            <div key={k} className={`cot-ngay ${d.isSame(dayjs(), 'day') ? 'hom-nay' : ''}`}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{THU[d.day()]} <span style={{ color: '#8c8c8c', fontWeight: 400 }}>{d.format('DD/MM')}</span></div>
                <div style={{ marginBottom: 8 }}>
                  {ranh.length ? (
                    ranh.map((r) => (
                      <Tag color="green" key={r.id} style={{ marginBottom: 4 }}>
                        {r.gioBatDau}–{r.gioKetThuc}
                        {!qua && (
                          <Popconfirm
                            title="Xóa khung rảnh này?"
                            description="Nếu có buổi học trong khung, buổi học sẽ bị hủy và hoàn học phí cho khách."
                            onConfirm={() => xoa(r)}
                          >
                            <DeleteOutlined style={{ marginLeft: 6, cursor: 'pointer' }} />
                          </Popconfirm>
                        )}
                      </Tag>
                    ))
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa khai báo rảnh</Typography.Text>
                  )}
                </div>
                {buoi.map((b) => (
                  <div key={b.id} className={`buoi-hoc ${b.trangThai}`}>
                    <b>{b.gioBatDau}–{b.gioKetThuc}</b> · {b.san}
                    <div>{b.khach} · {b.sdt}</div>
                    <div style={{ color: '#8c8c8c' }}>Đơn {b.maDon} · {tien(b.hocPhi)}</div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Empty, Modal, Row, Segmented, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { baoCaoApi } from '../../api/index.js';
import BieuDoDoanhThu, { MAU_NGUON } from '../../components/BieuDoDoanhThu.jsx';
import { MUC_DICH, PHUONG_THUC, ngayGio, tien } from '../../utils/format.js';

const NHANH = {
  '7 ngày': () => [dayjs().subtract(6, 'day'), dayjs()],
  '30 ngày': () => [dayjs().subtract(29, 'day'), dayjs()],
  'Tháng này': () => [dayjs().startOf('month'), dayjs()],
  'Tháng trước': () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')],
};

const mauNhiet = (t) => {
  // 0 → trắng, 1 → xanh đậm
  const a = Math.min(1, Math.max(0, t));
  return `rgba(15, 123, 95, ${0.08 + a * 0.85})`;
};

// UC07.1 Xem báo cáo thống kê: doanh thu theo nguồn (QT-28), tỷ lệ lấp đầy (QT-29), khung cao điểm, xuất Excel
export default function BaoCaoPage() {
  const { message } = App.useApp();
  const [khoang, setKhoang] = useState(NHANH['30 ngày']());
  const [nhomTheo, setNhomTheo] = useState('ngay');
  const [dt, setDt] = useState(null);
  const [ld, setLd] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [giaoDich, setGiaoDich] = useState(null); // { ngay, ds }

  const thamSo = { tuNgay: khoang[0].format('YYYY-MM-DD'), denNgay: khoang[1].format('YYYY-MM-DD') };

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const [a, b] = await Promise.all([baoCaoApi.doanhThu({ ...thamSo, nhomTheo }), baoCaoApi.lapDay(thamSo)]);
      setDt(a);
      setLd(b);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [thamSo.tuNgay, thamSo.denNgay, nhomTheo]);

  useEffect(() => {
    tai();
  }, [tai]);

  const xemGiaoDich = async (ky) => {
    if (nhomTheo !== 'ngay') return;
    try {
      setGiaoDich({ ngay: ky, ds: await baoCaoApi.giaoDich(ky) });
    } catch (e) {
      message.error(e.message);
    }
  };

  const tang = dt && dt.kyTruoc.tong ? ((dt.tong - dt.kyTruoc.tong) / dt.kyTruoc.tong) * 100 : null;

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Báo cáo thống kê</Typography.Title>
        <Space wrap>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            allowClear={false}
            value={khoang}
            onChange={(v) => v && setKhoang(v)}
            presets={Object.entries(NHANH).map(([label, f]) => ({ label, value: f() }))}
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          />
          <Segmented value={nhomTheo} onChange={setNhomTheo} options={[{ value: 'ngay', label: 'Ngày' }, { value: 'tuan', label: 'Tuần' }, { value: 'thang', label: 'Tháng' }]} />
          <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai} />
          <Button type="primary" icon={<DownloadOutlined />} href={baoCaoApi.urlXuat({ ...thamSo, nhomTheo })}>Xuất Excel</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="Doanh thu thực thu" value={dt ? tien(dt.tong) : '—'} />
            {tang !== null && (
              <Typography.Text type={tang >= 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>
                {tang >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(tang).toFixed(1)}% so với kỳ trước ({tien(dt.kyTruoc.tong)})
              </Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="Tiền sân" value={dt ? tien(dt.theoNguon.tienSan) : '—'} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dt && dt.tong ? `${Math.round((dt.theoNguon.tienSan / dt.tong) * 100)}% tổng doanh thu` : ''}</Typography.Text>
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="Tỷ lệ lấp đầy" value={ld ? (ld.tyLeChung * 100).toFixed(1) : '—'} suffix="%" />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{ld ? `${ld.soNgay} ngày, sân đang hoạt động` : ''}</Typography.Text>
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="Số giao dịch" value={dt?.soGiaoDich ?? '—'} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Không tính trả bằng gói giờ / điểm</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} xl={16}>
          <Card size="small" title="Doanh thu theo kỳ và nguồn" extra={nhomTheo === 'ngay' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Bấm vào cột để xem giao dịch trong ngày</Typography.Text>} style={{ marginBottom: 16 }}>
            {dt?.theoKy.length ? <BieuDoDoanhThu duLieu={dt} onChonKy={xemGiaoDich} /> : <Empty description="Chưa có doanh thu trong khoảng này" />}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card size="small" title="Cơ cấu doanh thu" style={{ marginBottom: 16 }}>
            {dt &&
              Object.keys(MAU_NGUON).map((k) => {
                const v = dt.theoNguon[k] ?? 0;
                const pt = dt.tong ? (v / dt.tong) * 100 : 0;
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div className="dong-tien" style={{ padding: 0 }}>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: MAU_NGUON[k], marginRight: 8 }} />{dt.tenNguon[k]}</span>
                      <span>{tien(v)}</span>
                    </div>
                    <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}>
                      <div style={{ width: `${Math.max(0, pt)}%`, height: 6, background: MAU_NGUON[k], borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
          </Card>
          <Card size="small" title="5 khung giờ cao điểm" style={{ marginBottom: 16 }}>
            {ld?.caoDiem.map((k, i) => (
              <div key={k.khungGioId} className="dong-tien">
                <span><Tag color={i === 0 ? 'gold' : 'default'}>{i + 1}</Tag>{k.khung}</span>
                <span><b>{(k.tyLe * 100).toFixed(1)}%</b> <Typography.Text type="secondary">({k.daBan}/{k.khaDung})</Typography.Text></span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Bản đồ nhiệt tỷ lệ lấp đầy (sân × khung giờ)">
        {!ld ? null : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ban-do-nhiet" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingRight: 8 }}>Sân</th>
                  {ld.khungGio.map((g) => (
                    <th key={g} style={{ fontSize: 11, fontWeight: 500 }}>{g.slice(0, 2)}h</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ld.banDoNhiet.map((s) => (
                  <tr key={s.sanId}>
                    <td style={{ textAlign: 'left', whiteSpace: 'nowrap', paddingRight: 8, width: 'auto' }}>{s.tenSan}</td>
                    {s.tyLe.map((t, i) => (
                      <Tooltip key={i} title={`${s.tenSan} · ${ld.khungGio[i]}: ${(t * 100).toFixed(0)}%`}>
                        <td style={{ background: mauNhiet(t), color: t > 0.55 ? '#fff' : '#262626', border: '1px solid #fff' }}>{Math.round(t * 100)}</td>
                      </Tooltip>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Số trong ô = % số ngày khung đó được bán (gồm cả đơn không đến). Sân bảo trì / ngừng không tính.</Typography.Text>
          </div>
        )}
      </Card>

      {giaoDich && (
        <Modal open width={760} footer={null} onCancel={() => setGiaoDich(null)} title={`Giao dịch ngày ${dayjs(giaoDich.ngay).format('DD/MM/YYYY')}`}>
          <Table
            size="small"
            rowKey="maGiaoDich"
            dataSource={giaoDich.ds}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Mã', dataIndex: 'maGiaoDich' },
              { title: 'Thời gian', dataIndex: 'thoiGian', render: ngayGio },
              { title: 'Mục đích', dataIndex: 'mucDich', render: (v, r) => <>{MUC_DICH[v]}{r.maDon ? ` · ${r.maDon}` : ''}</> },
              { title: 'Phương thức', dataIndex: 'phuongThuc', render: (v) => PHUONG_THUC[v] },
              { title: 'Số tiền', dataIndex: 'soTien', align: 'right', render: (v, r) => <span style={{ color: r.loai === 'HOAN_TIEN' ? '#cf1322' : undefined }}>{r.loai === 'HOAN_TIEN' ? '− ' : ''}{tien(v)}</span> },
            ]}
          />
        </Modal>
      )}
    </>
  );
}

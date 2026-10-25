import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Badge, Button, Card, Col, Empty, Input, Popconfirm, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { LoginOutlined, ToolOutlined, ReloadOutlined, CheckCircleOutlined, WarningOutlined, PlusOutlined } from '@ant-design/icons';
import { vanHanhApi } from '../../api/index.js';
import ChiTietDon from '../../components/ChiTietDon.jsx';
import SuCoModal from '../../components/SuCoModal.jsx';
import TrangThaiDon from '../../components/TrangThaiDon.jsx';
import { gio, moTaKhung, tien } from '../../utils/format.js';

const TEN_TT = { TRONG: 'Trống', CHO_CHECK_IN: 'Chờ check-in', DANG_SU_DUNG: 'Đang sử dụng', BAO_TRI: 'Bảo trì' };
const MAU_TT = { TRONG: 'green', CHO_CHECK_IN: 'orange', DANG_SU_DUNG: 'blue', BAO_TRI: 'default' };

// UC05.1 Check-in, UC05.2 Theo dõi tình trạng sân (tự làm mới 30 giây), UC05.3 Giao/nhận thiết bị, UC05.4 Sự cố sân
export default function VanHanhSanPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [ds, setDs] = useState(null);
  const [capNhatLuc, setCapNhatLuc] = useState(null);
  const [q, setQ] = useState('');
  const [ketQuaTim, setKetQuaTim] = useState(null);
  const [dangTim, setDangTim] = useState(false);
  const [maDon, setMaDon] = useState(null);
  const [suCo, setSuCo] = useState(null); // { san, chiXuLy }
  const [dangLam, setDangLam] = useState(null);

  const tai = useCallback(async () => {
    try {
      const r = await vanHanhApi.tinhTrangSan();
      setDs(r.san);
      setCapNhatLuc(new Date());
    } catch (e) {
      message.error(e.message);
    }
  }, []);

  useEffect(() => {
    tai();
    const t = setInterval(tai, 30000);
    return () => clearInterval(t);
  }, [tai]);

  const traCuu = async (giaTri = q) => {
    if (!giaTri.trim()) return;
    setDangTim(true);
    try {
      setKetQuaTim(await vanHanhApi.traCuu(giaTri.trim()));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTim(false);
    }
  };

  const lam = async (khoa, fn, thongBao) => {
    setDangLam(khoa);
    try {
      const r = await fn();
      message.success(typeof thongBao === 'function' ? thongBao(r) : thongBao);
      tai();
      if (ketQuaTim) traCuu();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLam(null);
    }
  };

  const checkIn = (ma) =>
    lam(`ci${ma}`, () => vanHanhApi.checkIn(ma), (r) =>
      r.thietBiCanGiao?.length ? `Check-in ${ma} thành công. Cần giao: ${r.thietBiCanGiao.map((d) => `${d.tenDichVu} ×${d.soLuong}`).join(', ')}` : `Check-in ${ma} thành công`,
    );

  const dem = (tt) => ds?.filter((s) => s.trangThai === tt).length ?? 0;

  const theBuoi = (nhan, b) =>
    b && (
      <div style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{nhan}</Typography.Text>
        <div>
          <Typography.Link strong onClick={() => setMaDon(b.maDon)}>{b.maDon}</Typography.Link> · {gio(b.batDau)}–{gio(b.ketThuc)}
        </div>
        <div style={{ fontSize: 13 }}>{b.khach} · {b.sdt}</div>
        <Space size={4} style={{ marginTop: 4 }} wrap>
          <TrangThaiDon trangThai={b.trangThai} />
          {b.trangThai === 'DANG_SU_DUNG' && <Tag>Còn {b.conLaiPhut} phút</Tag>}
          {b.trangThai === 'DA_XAC_NHAN' && (
            <Button size="small" type="primary" icon={<LoginOutlined />} loading={dangLam === `ci${b.maDon}`} onClick={() => checkIn(b.maDon)}>Check-in</Button>
          )}
          {b.trangThai === 'CHO_THANH_TOAN' && <Button size="small" onClick={() => setMaDon(b.maDon)}>Thu tiền</Button>}
        </Space>
      </div>
    );

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Vận hành sân hôm nay</Typography.Title>
        <Space wrap>
          {capNhatLuc && <Typography.Text type="secondary">Cập nhật {gio(capNhatLuc)} · tự làm mới 30 giây</Typography.Text>}
          <Button icon={<ReloadOutlined />} onClick={tai}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/le-tan/lich-san')}>Đặt sân cho khách</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {['TRONG', 'CHO_CHECK_IN', 'DANG_SU_DUNG', 'BAO_TRI'].map((tt) => (
          <Col xs={12} md={6} key={tt}>
            <Card size="small"><Statistic title={<Badge color={MAU_TT[tt] === 'default' ? '#8c8c8c' : MAU_TT[tt]} text={TEN_TT[tt]} />} value={dem(tt)} suffix="sân" /></Card>
          </Col>
        ))}
      </Row>

      <Card size="small" title="Tra cứu đơn hôm nay để check-in" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Nhập mã đặt chỗ (DS…) hoặc số điện thoại khách"
          enterButton="Tra cứu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={(v) => traCuu(v)}
          loading={dangTim}
          allowClear
          onClear={() => setKetQuaTim(null)}
          style={{ maxWidth: 520 }}
        />
        {ketQuaTim && (
          <Table
            style={{ marginTop: 12 }}
            size="small"
            rowKey="maDon"
            pagination={false}
            dataSource={ketQuaTim}
            locale={{ emptyText: 'Không có đơn hôm nay khớp với thông tin này' }}
            columns={[
              { title: 'Mã đơn', dataIndex: 'maDon', render: (v) => <Typography.Link strong onClick={() => setMaDon(v)}>{v}</Typography.Link> },
              { title: 'Khách', render: (_, r) => `${r.khach.hoTen} · ${r.khach.soDienThoai}` },
              { title: 'Sân / giờ', render: (_, r) => moTaKhung(r.chiTiet).join('; ') },
              { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <TrangThaiDon trangThai={v} /> },
              { title: 'Còn phải thu', dataIndex: 'conPhaiThu', align: 'right', render: (v) => (v ? <b style={{ color: '#cf1322' }}>{tien(v)}</b> : '—') },
              {
                title: '',
                align: 'right',
                render: (_, r) => (
                  <Space>
                    {r.conPhaiThu > 0 && <Button size="small" onClick={() => setMaDon(r.maDon)}>Thu tiền</Button>}
                    {r.trangThai === 'DA_XAC_NHAN' && !r.conPhaiThu && (
                      <Button size="small" type="primary" loading={dangLam === `ci${r.maDon}`} onClick={() => checkIn(r.maDon)}>Check-in</Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      {!ds ? null : !ds.length ? (
        <Empty description="Chưa có sân nào" />
      ) : (
        <Row gutter={[16, 16]}>
          {ds.map((s) => (
            <Col xs={24} sm={12} lg={8} xxl={6} key={s.id}>
              <Card
                size="small"
                className={`the-san ${s.trangThai}`}
                title={<Space>{s.tenSan}<Tag color={MAU_TT[s.trangThai]}>{TEN_TT[s.trangThai]}</Tag></Space>}
                extra={
                  s.trangThai === 'BAO_TRI' ? (
                    <Button size="small" type="link" onClick={() => setSuCo({ san: s, chiXuLy: true })}>Xử lý lịch</Button>
                  ) : (
                    <Button size="small" type="text" danger icon={<ToolOutlined />} onClick={() => setSuCo({ san: s })}>Sự cố</Button>
                  )
                }
              >
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.loaiSan}</Typography.Text>
                {theBuoi('Hiện tại', s.hienTai)}
                {theBuoi('Kế tiếp', s.keTiep)}
                {!s.hienTai && !s.keTiep && <div style={{ color: '#8c8c8c', margin: '8px 0' }}>Không còn lịch trong hôm nay</div>}
                {s.canhBao.map((c) => (
                  <Alert key={c} type="warning" showIcon icon={<WarningOutlined />} message={c} style={{ padding: '2px 8px', marginTop: 4, fontSize: 12 }} />
                ))}
                {s.suCo.map((sc) => (
                  <Alert
                    key={sc.id}
                    type="error"
                    style={{ padding: '4px 8px', marginTop: 6, fontSize: 12 }}
                    message={`Sự cố: ${sc.moTa}`}
                    action={
                      <Popconfirm title="Xác nhận sự cố đã được khắc phục?" onConfirm={() => lam(`kp${sc.id}`, () => vanHanhApi.khacPhuc(sc.id), `${s.tenSan} hoạt động trở lại`)}>
                        <Button size="small" icon={<CheckCircleOutlined />} loading={dangLam === `kp${sc.id}`}>Đã khắc phục</Button>
                      </Popconfirm>
                    }
                  />
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <ChiTietDon maDon={maDon} open={Boolean(maDon)} onClose={() => setMaDon(null)} onThayDoi={tai} cheDoNhanVien />
      {suCo && <SuCoModal san={suCo.san} chiXuLy={suCo.chiXuLy} onClose={() => setSuCo(null)} onXong={tai} />}
    </>
  );
}

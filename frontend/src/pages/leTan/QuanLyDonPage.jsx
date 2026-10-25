import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { datSanApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ChiTietDon from '../../components/ChiTietDon.jsx';
import TrangThaiDon from '../../components/TrangThaiDon.jsx';
import { TRANG_THAI_DON, gio, moTaKhung, ngayChoiCuaDon, ngayGio, ngayVN, tien } from '../../utils/format.js';

// Quản lý đơn đặt sân (lễ tân: tìm theo mã / SĐT, thu tiền tại quầy, hủy hộ; quản lý: chỉ xem) – GET /don-dat-san
export default function QuanLyDonPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const laQuanLy = user.vaiTro === 'QUAN_LY';
  const [boLoc, setBoLoc] = useState({ q: '', trangThai: [], khoang: null });
  const [apDung, setApDung] = useState(boLoc);
  const [trang, setTrang] = useState(0);
  const [kq, setKq] = useState({ items: [], tong: 0 });
  const [dangTai, setDangTai] = useState(false);
  const [maDon, setMaDon] = useState(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setKq(
        await datSanApi.dsDon({
          q: apDung.q.trim() || undefined,
          trangThai: apDung.trangThai.length ? apDung.trangThai.join(',') : undefined,
          tuNgay: apDung.khoang?.[0]?.format('YYYY-MM-DD'),
          denNgay: apDung.khoang?.[1]?.format('YYYY-MM-DD'),
          trang,
          kichThuoc: 15,
        }),
      );
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [apDung, trang]);

  useEffect(() => {
    tai();
  }, [tai]);

  const tim = () => {
    setTrang(0);
    setApDung({ ...boLoc });
  };

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Đơn đặt sân</Typography.Title>
        <Typography.Text type="secondary">{kq.tong} đơn</Typography.Text>
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Mã đơn hoặc SĐT khách"
            style={{ width: 240 }}
            value={boLoc.q}
            onChange={(e) => setBoLoc((x) => ({ ...x, q: e.target.value }))}
            onPressEnter={tim}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Trạng thái"
            style={{ minWidth: 240 }}
            value={boLoc.trangThai}
            onChange={(v) => setBoLoc((x) => ({ ...x, trangThai: v }))}
            options={Object.entries(TRANG_THAI_DON).map(([k, v]) => ({ value: k, label: v.ten }))}
          />
          <DatePicker.RangePicker format="DD/MM/YYYY" value={boLoc.khoang} onChange={(v) => setBoLoc((x) => ({ ...x, khoang: v }))} placeholder={['Chơi từ ngày', 'đến ngày']} />
          <Button type="primary" onClick={tim}>Lọc</Button>
          <Button
            onClick={() => {
              const rong = { q: '', trangThai: [], khoang: null };
              setBoLoc(rong);
              setApDung(rong);
              setTrang(0);
            }}
          >
            Xóa lọc
          </Button>
        </Space>
      </Card>
      <Table
        rowKey="maDon"
        loading={dangTai}
        dataSource={kq.items}
        scroll={{ x: 1000 }}
        onRow={(r) => ({ onDoubleClick: () => setMaDon(r.maDon) })}
        pagination={{ current: trang + 1, pageSize: 15, total: kq.tong, onChange: (p) => setTrang(p - 1), showSizeChanger: false }}
        columns={[
          { title: 'Mã đơn', dataIndex: 'maDon', render: (v, r) => <Space direction="vertical" size={0}><Typography.Link strong onClick={() => setMaDon(v)}>{v}</Typography.Link>{r.laDinhKy && <Tag color="purple">Định kỳ</Tag>}</Space> },
          { title: 'Khách', render: (_, r) => <>{r.khach.hoTen}{!r.khach.coTaiKhoan && <Tag style={{ marginLeft: 4 }}>Vãng lai</Tag>}<br /><Typography.Text type="secondary">{r.khach.soDienThoai}</Typography.Text></> },
          { title: 'Ngày chơi', render: (_, r) => <>{ngayVN(ngayChoiCuaDon(r))}<br />{r.batDau ? `${gio(r.batDau)}–${gio(r.ketThuc)}` : ''}</> },
          { title: 'Sân', render: (_, r) => moTaKhung(r.chiTiet).map((x) => <div key={x}>{x}</div>) },
          { title: 'Kênh', dataIndex: 'kenhDat', render: (v) => (v === 'TAI_QUAY' ? 'Tại quầy' : 'Online') },
          { title: 'Tổng tiền', dataIndex: 'tongTien', align: 'right', render: tien },
          { title: 'Còn thu', dataIndex: 'conPhaiThu', align: 'right', render: (v) => (v ? <b style={{ color: '#cf1322' }}>{tien(v)}</b> : '—') },
          { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <TrangThaiDon trangThai={v} /> },
          { title: 'Tạo lúc', dataIndex: 'ngayTao', render: ngayGio },
          { title: '', align: 'right', render: (_, r) => <Button size="small" onClick={() => setMaDon(r.maDon)}>{laQuanLy ? 'Xem' : 'Xử lý'}</Button> },
        ]}
      />
      <ChiTietDon maDon={maDon} open={Boolean(maDon)} onClose={() => setMaDon(null)} onThayDoi={tai} cheDoNhanVien={!laQuanLy} chiXem={laQuanLy} />
    </>
  );
}

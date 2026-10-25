import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Space, Table, Tabs, Tag, Typography } from 'antd';
import { CreditCardOutlined, PlusOutlined } from '@ant-design/icons';
import { datSanApi } from '../../api/index.js';
import TrangThaiDon from '../../components/TrangThaiDon.jsx';
import DongHoGiuCho from '../../components/DongHoGiuCho.jsx';
import ChiTietDon from '../../components/ChiTietDon.jsx';
import { moTaKhung, ngayChoiCuaDon, ngayVN, gio, tien, THU } from '../../utils/format.js';
import dayjs from 'dayjs';

const TAB = {
  sapToi: { label: 'Sắp tới', trangThai: 'CHO_THANH_TOAN,DA_XAC_NHAN,DANG_SU_DUNG' },
  hoanThanh: { label: 'Đã hoàn thành', trangThai: 'DA_HOAN_THANH' },
  huy: { label: 'Đã hủy / hết hạn / không đến', trangThai: 'DA_HUY,HET_HAN,KHONG_DEN' },
  tatCa: { label: 'Tất cả', trangThai: undefined },
};

// UC02.3 Quản lý lịch đặt sân của khách hàng (GET /don-dat-san)
export default function LichDatCuaToiPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [tab, setTab] = useState('sapToi');
  const [trang, setTrang] = useState(0);
  const [kq, setKq] = useState({ items: [], tong: 0 });
  const [dangTai, setDangTai] = useState(false);
  const [maDon, setMaDon] = useState(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setKq(await datSanApi.dsDon({ trangThai: TAB[tab].trangThai, trang, kichThuoc: 10 }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [tab, trang]);

  useEffect(() => {
    tai();
  }, [tai]);

  const cot = [
    { title: 'Mã đơn', dataIndex: 'maDon', render: (v, r) => <Space direction="vertical" size={0}><Typography.Link strong onClick={() => setMaDon(v)}>{v}</Typography.Link>{r.laDinhKy && <Tag color="purple">Định kỳ</Tag>}</Space> },
    {
      title: 'Ngày chơi',
      render: (_, r) => {
        const n = ngayChoiCuaDon(r);
        return n ? <>{THU[dayjs(n).day()]}<br />{ngayVN(n)}</> : '—';
      },
    },
    { title: 'Giờ', render: (_, r) => (r.batDau ? `${gio(r.batDau)}–${gio(r.ketThuc)}` : '—') },
    { title: 'Sân', render: (_, r) => moTaKhung(r.chiTiet).map((x) => <div key={x}>{x}</div>) },
    { title: 'Tổng tiền', dataIndex: 'tongTien', align: 'right', render: tien },
    {
      title: 'Trạng thái',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <TrangThaiDon trangThai={r.trangThai} />
          {r.trangThai === 'CHO_THANH_TOAN' && r.hanGiuCho && <DongHoGiuCho han={r.hanGiuCho} onHet={tai} nhan="Còn" />}
          {r.conPhaiThu > 0 && r.trangThai !== 'CHO_THANH_TOAN' && <Tag color="red">Còn nợ {tien(r.conPhaiThu)}</Tag>}
        </Space>
      ),
    },
    {
      title: '',
      align: 'right',
      render: (_, r) => (
        <Space>
          {r.coTheThanhToan && (
            <Button type="primary" size="small" icon={<CreditCardOutlined />} onClick={() => nav(`/thanh-toan/${r.maDon}`)}>Thanh toán</Button>
          )}
          <Button size="small" onClick={() => setMaDon(r.maDon)}>Chi tiết</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Lịch đặt của tôi</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/')}>Đặt sân mới</Button>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(k) => {
          setTab(k);
          setTrang(0);
        }}
        items={Object.entries(TAB).map(([key, t]) => ({ key, label: t.label }))}
      />
      <Table
        rowKey="maDon"
        loading={dangTai}
        dataSource={kq.items}
        columns={cot}
        scroll={{ x: 900 }}
        pagination={{ current: trang + 1, pageSize: 10, total: kq.tong, onChange: (p) => setTrang(p - 1), showTotal: (t) => `${t} đơn` }}
      />
      <ChiTietDon maDon={maDon} open={Boolean(maDon)} onClose={() => setMaDon(null)} onThayDoi={tai} />
    </>
  );
}

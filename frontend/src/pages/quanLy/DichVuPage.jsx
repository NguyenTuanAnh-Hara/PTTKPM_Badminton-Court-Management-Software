import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { quanTriApi } from '../../api/index.js';
import { LOAI_DICH_VU, tien } from '../../utils/format.js';

const soTien = { formatter: (v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), parser: (v) => v.replace(/\./g, '') };

// UC06.3 Quản lý danh mục dịch vụ: thiết bị cho thuê, đồ uống, dịch vụ khác; nhập kho; ngừng kinh doanh
export default function DichVuPage() {
  const { message } = App.useApp();
  const [ds, setDs] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [loc, setLoc] = useState(null);
  const [sua, setSua] = useState(null);
  const [nhap, setNhap] = useState(null);
  const [soNhap, setSoNhap] = useState(10);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setDs(await quanTriApi.dsDichVu());
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    tai();
  }, [tai]);

  const mo = (d) => setSua(d ?? {});

  const goi = async (fn, thongBao) => {
    try {
      const r = await fn();
      message.success(typeof thongBao === 'function' ? thongBao(r) : thongBao);
      tai();
      return true;
    } catch (e) {
      message.error(e.message);
      return false;
    }
  };

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Danh mục dịch vụ</Typography.Title>
        <Space>
          <Select allowClear placeholder="Tất cả loại" style={{ width: 160 }} value={loc} onChange={setLoc} options={Object.entries(LOAI_DICH_VU).map(([value, label]) => ({ value, label }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => mo(null)}>Thêm dịch vụ</Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={dangTai}
        dataSource={ds.filter((d) => !loc || d.loai === loc)}
        pagination={false}
        columns={[
          { title: 'Tên dịch vụ', dataIndex: 'tenDichVu', render: (v, d) => <span style={{ color: d.trangThai === 'NGUNG' ? '#8c8c8c' : undefined }}>{v}</span> },
          { title: 'Loại', dataIndex: 'loai', render: (v) => <Tag>{LOAI_DICH_VU[v]}</Tag> },
          { title: 'Đơn giá', dataIndex: 'donGia', align: 'right', render: tien },
          { title: 'Tiền cọc', dataIndex: 'tienCoc', align: 'right', render: (v, d) => (d.loai === 'THIET_BI' ? tien(v) : '—') },
          { title: 'Tồn kho', dataIndex: 'soLuongTon', align: 'center', render: (v) => <Tag color={v <= 5 ? 'red' : 'default'}>{v}</Tag> },
          {
            title: 'Kinh doanh',
            dataIndex: 'trangThai',
            render: (v, d) => <Switch size="small" checked={v === 'DANG_BAN'} onChange={(on) => goi(() => quanTriApi.suaDichVu(d.id, { trangThai: on ? 'DANG_BAN' : 'NGUNG' }), on ? 'Đã mở bán' : 'Đã ngừng kinh doanh')} />,
          },
          {
            title: '',
            align: 'right',
            render: (_, d) => (
              <Space>
                <Button size="small" icon={<InboxOutlined />} onClick={() => { setNhap(d); setSoNhap(10); }}>Nhập kho</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => mo(d)} />
                <Popconfirm
                  title={d.daDung ? 'Dịch vụ đã từng được dùng nên sẽ chuyển sang ngừng kinh doanh. Tiếp tục?' : 'Xóa hẳn dịch vụ này?'}
                  onConfirm={() => goi(() => quanTriApi.xoaDichVu(d.id), (r) => (r.ketQua === 'DA_XOA' ? 'Đã xóa' : 'Đã ngừng kinh doanh'))}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {sua && <SuaDichVuModal dv={sua} goi={goi} onClose={() => setSua(null)} />}

      {nhap && (
        <Modal open title={`Nhập kho – ${nhap.tenDichVu}`} onCancel={() => setNhap(null)} okText="Nhập kho"
          onOk={async () => { if (await goi(() => quanTriApi.nhapKho(nhap.id, soNhap), `Đã nhập thêm ${soNhap}`)) setNhap(null); }}>
          <Space>
            <span>Tồn hiện tại: <b>{nhap.soLuongTon}</b>. Nhập thêm</span>
            <InputNumber min={1} value={soNhap} onChange={(v) => setSoNhap(v || 1)} />
          </Space>
        </Modal>
      )}
    </>
  );
}

function SuaDichVuModal({ dv, goi, onClose }) {
  const [form] = Form.useForm();
  const loai = Form.useWatch('loai', form);
  const [dangLuu, setDangLuu] = useState(false);

  const luu = async () => {
    const v = await form.validateFields();
    setDangLuu(true);
    const ok = await goi(() => (dv.id ? quanTriApi.suaDichVu(dv.id, v) : quanTriApi.taoDichVu(v)), 'Đã lưu dịch vụ');
    setDangLuu(false);
    if (ok) onClose();
  };

  return (
    <Modal open title={dv.id ? `Sửa ${dv.tenDichVu}` : 'Thêm dịch vụ'} onCancel={onClose} onOk={luu} okText="Lưu" okButtonProps={{ loading: dangLuu }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={dv.id ? { tenDichVu: dv.tenDichVu, loai: dv.loai, donGia: dv.donGia, soLuongTon: dv.soLuongTon, tienCoc: dv.tienCoc } : { tenDichVu: '', loai: 'DO_UONG', donGia: 10000, soLuongTon: 0, tienCoc: 0 }}
      >
        <Form.Item name="tenDichVu" label="Tên dịch vụ" rules={[{ required: true, message: 'Nhập tên' }, { max: 100 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="loai" label="Loại" rules={[{ required: true }]}>
          <Select options={Object.entries(LOAI_DICH_VU).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Space wrap>
          <Form.Item name="donGia" label="Đơn giá" rules={[{ required: true, message: 'Nhập giá' }]}>
            <InputNumber min={1} step={1000} style={{ width: 160 }} addonAfter="đ" {...soTien} />
          </Form.Item>
          <Form.Item name="soLuongTon" label="Số lượng tồn" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>
          {loai === 'THIET_BI' && (
            <Form.Item name="tienCoc" label="Tiền cọc / cái" extra="Thu khi giao, hoàn khi trả nguyên vẹn (QT-25)">
              <InputNumber min={0} step={10000} style={{ width: 160 }} addonAfter="đ" {...soTien} />
            </Form.Item>
          )}
        </Space>
      </Form>
    </Modal>
  );
}

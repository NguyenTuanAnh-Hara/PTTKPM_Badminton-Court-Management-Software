import { useCallback, useEffect, useState } from 'react';
import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { quanTriApi } from '../../api/index.js';
import { ngayVN, tien } from '../../utils/format.js';

const soTien = { formatter: (v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), parser: (v) => v.replace(/\./g, '') };

// UC06.4 Quản lý ưu đãi: mã giảm giá, hạng thành viên, loại gói giờ / thẻ trả trước
export default function UuDaiQuanLyPage() {
  const { message } = App.useApp();
  const [du, setDu] = useState(null);
  const [tab, setTab] = useState('ma');
  const [sua, setSua] = useState(null); // { loai: 'ma'|'hang'|'goi', duLieu }

  const tai = useCallback(async () => {
    try {
      setDu(await quanTriApi.dsUuDai());
    } catch (e) {
      message.error(e.message);
    }
  }, []);

  useEffect(() => {
    tai();
  }, [tai]);

  const ngung = async (id) => {
    try {
      await quanTriApi.ngungMa(id);
      message.success('Đã ngừng phát hành mã');
      tai();
    } catch (e) {
      message.error(e.message);
    }
  };

  const nutThem = { ma: 'Thêm mã giảm giá', hang: 'Thêm hạng thành viên', goi: 'Thêm loại gói giờ' }[tab];

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Ưu đãi</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSua({ loai: tab, duLieu: {} })}>{nutThem}</Button>
      </div>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'ma',
            label: 'Mã giảm giá',
            children: (
              <Table
                rowKey="id"
                loading={!du}
                dataSource={du?.maGiamGia ?? []}
                columns={[
                  { title: 'Mã', dataIndex: 'ma', render: (v) => <Typography.Text code strong>{v}</Typography.Text> },
                  { title: 'Giảm', render: (_, m) => `${m.phanTramGiam}%${m.giamToiDa ? ` (tối đa ${tien(m.giamToiDa)})` : ''}` },
                  { title: 'Hiệu lực', render: (_, m) => `${ngayVN(m.ngayBatDau)} – ${ngayVN(m.ngayKetThuc)}` },
                  { title: 'Đã dùng', render: (_, m) => <Space><Progress percent={Math.round((m.soLuotDaDung / m.soLuotToiDa) * 100)} size="small" style={{ width: 90 }} showInfo={false} />{m.soLuotDaDung}/{m.soLuotToiDa}</Space> },
                  { title: 'Trạng thái', dataIndex: 'conHieuLuc', render: (v) => (v ? <Tag color="green">Đang hiệu lực</Tag> : <Tag>Hết hiệu lực</Tag>) },
                  {
                    title: '',
                    align: 'right',
                    render: (_, m) => (
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => setSua({ loai: 'ma', duLieu: m })} />
                        {m.conHieuLuc && (
                          <Popconfirm title="Ngừng phát hành mã này ngay?" onConfirm={() => ngung(m.id)}>
                            <Button size="small" danger icon={<StopOutlined />}>Ngừng</Button>
                          </Popconfirm>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'hang',
            label: 'Hạng thành viên',
            children: (
              <Table
                rowKey="id"
                loading={!du}
                pagination={false}
                dataSource={du?.hangThanhVien ?? []}
                columns={[
                  { title: 'Hạng', dataIndex: 'tenGoi', render: (v) => <b>{v}</b> },
                  { title: 'Phí', dataIndex: 'phi', align: 'right', render: tien },
                  { title: 'Thời hạn', dataIndex: 'thoiHanNgay', render: (v) => `${v} ngày` },
                  { title: 'Giảm tiền sân', dataIndex: 'phanTramGiam', render: (v) => `${v}%` },
                  { title: 'Hệ số tích điểm', dataIndex: 'heSoTichDiem', render: (v) => `×${v}` },
                  { title: 'Khách đang dùng', dataIndex: 'soKhach', align: 'center' },
                  { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => (v === 'DANG_BAN' ? <Tag color="green">Đang bán</Tag> : <Tag>Ngừng</Tag>) },
                  { title: '', align: 'right', render: (_, h) => <Button size="small" icon={<EditOutlined />} onClick={() => setSua({ loai: 'hang', duLieu: h })} /> },
                ]}
              />
            ),
          },
          {
            key: 'goi',
            label: 'Gói giờ / thẻ trả trước',
            children: (
              <Table
                rowKey="id"
                loading={!du}
                pagination={false}
                dataSource={du?.loaiGoiGio ?? []}
                columns={[
                  { title: 'Tên gói', dataIndex: 'tenGoi', render: (v) => <b>{v}</b> },
                  { title: 'Loại', dataIndex: 'loai', render: (v) => (v === 'GOI_GIO' ? <Tag color="blue">Gói giờ</Tag> : <Tag color="purple">Thẻ trả trước</Tag>) },
                  { title: 'Giá trị', render: (_, g) => (g.loai === 'GOI_GIO' ? `${g.soGio} giờ` : tien(g.menhGia)) },
                  { title: 'Giá bán', dataIndex: 'giaBan', align: 'right', render: tien },
                  { title: 'Thời hạn', dataIndex: 'thoiHanNgay', render: (v) => `${v} ngày` },
                  { title: 'Đã bán', dataIndex: 'daBan', align: 'center' },
                  { title: '', align: 'right', render: (_, g) => <Button size="small" icon={<EditOutlined />} onClick={() => setSua({ loai: 'goi', duLieu: g })} /> },
                ]}
              />
            ),
          },
        ]}
      />
      {sua && <SuaUuDaiModal {...sua} onClose={() => setSua(null)} onXong={tai} />}
    </>
  );
}

function SuaUuDaiModal({ loai, duLieu, onClose, onXong }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [dangLuu, setDangLuu] = useState(false);
  const kieu = Form.useWatch('loai', form);
  const id = duLieu.id;

  const giaTriDau = {
    ma: id
      ? { ...duLieu, khoang: [dayjs(duLieu.ngayBatDau), dayjs(duLieu.ngayKetThuc)] }
      : { ma: '', phanTramGiam: 10, giamToiDa: null, soLuotToiDa: 100, khoang: [dayjs(), dayjs().add(30, 'day')] },
    hang: id ? duLieu : { tenGoi: '', phi: 100000, thoiHanNgay: 30, phanTramGiam: 5, heSoTichDiem: 1, trangThai: 'DANG_BAN' },
    goi: id ? duLieu : { tenGoi: '', loai: 'GOI_GIO', soGio: 10, menhGia: null, giaBan: 700000, thoiHanNgay: 90 },
  }[loai];

  const luu = async () => {
    const v = await form.validateFields();
    setDangLuu(true);
    try {
      if (loai === 'ma') {
        await quanTriApi.luuMa(id, {
          ma: v.ma.trim().toUpperCase(), phanTramGiam: v.phanTramGiam, giamToiDa: v.giamToiDa ?? null, soLuotToiDa: v.soLuotToiDa,
          ngayBatDau: v.khoang[0].format('YYYY-MM-DD'), ngayKetThuc: v.khoang[1].format('YYYY-MM-DD'),
        });
      } else if (loai === 'hang') {
        await quanTriApi.luuHang(id, v);
      } else {
        await quanTriApi.luuGoiGio(id, v);
      }
      message.success('Đã lưu');
      onXong();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  const tieuDe = { ma: 'mã giảm giá', hang: 'hạng thành viên', goi: 'loại gói giờ' }[loai];
  return (
    <Modal open title={`${id ? 'Sửa' : 'Thêm'} ${tieuDe}`} onCancel={onClose} onOk={luu} okText="Lưu" okButtonProps={{ loading: dangLuu }}>
      <Form form={form} layout="vertical" initialValues={giaTriDau}>
        {loai === 'ma' && (
          <>
            <Form.Item name="ma" label="Mã" rules={[{ required: true, message: 'Nhập mã' }, { pattern: /^[A-Za-z0-9]{4,20}$/, message: '4–20 ký tự chữ và số' }]} normalize={(v) => v?.toUpperCase()}>
              <Input placeholder="VD: HE2026" />
            </Form.Item>
            <Space wrap>
              <Form.Item name="phanTramGiam" label="Phần trăm giảm" rules={[{ required: true }]}>
                <InputNumber min={1} max={100} addonAfter="%" style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name="giamToiDa" label="Giảm tối đa (không bắt buộc)">
                <InputNumber min={1000} step={10000} addonAfter="đ" style={{ width: 170 }} {...soTien} />
              </Form.Item>
              <Form.Item name="soLuotToiDa" label="Số lượt tối đa" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: 120 }} />
              </Form.Item>
            </Space>
            <Form.Item name="khoang" label="Thời gian hiệu lực" rules={[{ required: true, message: 'Chọn khoảng ngày' }]}>
              <DatePicker.RangePicker format="DD/MM/YYYY" />
            </Form.Item>
          </>
        )}
        {loai === 'hang' && (
          <>
            <Form.Item name="tenGoi" label="Tên hạng" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Space wrap>
              <Form.Item name="phi" label="Phí" rules={[{ required: true }]}>
                <InputNumber min={0} step={10000} addonAfter="đ" style={{ width: 170 }} {...soTien} />
              </Form.Item>
              <Form.Item name="thoiHanNgay" label="Thời hạn" rules={[{ required: true }]}>
                <InputNumber min={1} addonAfter="ngày" style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name="phanTramGiam" label="Giảm tiền sân" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="heSoTichDiem" label="Hệ số tích điểm" rules={[{ required: true }]}>
                <InputNumber min={0} max={9.99} step={0.5} style={{ width: 110 }} />
              </Form.Item>
            </Space>
            <Form.Item name="trangThai" label="Trạng thái">
              <Select options={[{ value: 'DANG_BAN', label: 'Đang bán' }, { value: 'NGUNG', label: 'Ngừng bán' }]} />
            </Form.Item>
          </>
        )}
        {loai === 'goi' && (
          <>
            <Form.Item name="tenGoi" label="Tên gói" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="loai" label="Loại">
              <Select options={[{ value: 'GOI_GIO', label: 'Gói giờ chơi' }, { value: 'THE_TRA_TRUOC', label: 'Thẻ trả trước' }]} />
            </Form.Item>
            <Space wrap>
              {kieu === 'THE_TRA_TRUOC' ? (
                <Form.Item name="menhGia" label="Mệnh giá" rules={[{ required: true, message: 'Nhập mệnh giá' }]}>
                  <InputNumber min={1000} step={10000} addonAfter="đ" style={{ width: 170 }} {...soTien} />
                </Form.Item>
              ) : (
                <Form.Item name="soGio" label="Số giờ" rules={[{ required: true, message: 'Nhập số giờ' }]}>
                  <InputNumber min={1} addonAfter="giờ" style={{ width: 120 }} />
                </Form.Item>
              )}
              <Form.Item name="giaBan" label="Giá bán" rules={[{ required: true }]}>
                <InputNumber min={1000} step={10000} addonAfter="đ" style={{ width: 170 }} {...soTien} />
              </Form.Item>
              <Form.Item name="thoiHanNgay" label="Hạn dùng" rules={[{ required: true }]}>
                <InputNumber min={1} addonAfter="ngày" style={{ width: 130 }} />
              </Form.Item>
            </Space>
          </>
        )}
      </Form>
    </Modal>
  );
}

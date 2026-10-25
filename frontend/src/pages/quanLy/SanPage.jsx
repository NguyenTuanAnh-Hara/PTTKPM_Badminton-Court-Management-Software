import { useCallback, useEffect, useState } from 'react';
import { Alert, App, AutoComplete, Button, Form, Input, Modal, Rate, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { quanTriApi } from '../../api/index.js';
import { TRANG_THAI_SAN } from '../../utils/format.js';

const MAU = { HOAT_DONG: 'green', BAO_TRI: 'orange', NGUNG_SU_DUNG: 'default' };

// UC06.1 Quản lý sân: thêm, sửa, đổi trạng thái (không xóa – chuyển “Ngừng sử dụng”)
export default function SanPage() {
  const { message } = App.useApp();
  const [ds, setDs] = useState([]);
  const [diem, setDiem] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [sua, setSua] = useState(null); // null | {} (thêm) | san

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const [s, d] = await Promise.all([quanTriApi.dsSan(), quanTriApi.diemSan().catch(() => [])]);
      setDs(s);
      setDiem(d);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    tai();
  }, [tai]);

  const mo = (s) => setSua(s ?? {});

  const loaiSan = [...new Set(ds.map((s) => s.loaiSan).filter(Boolean))];

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Quản lý sân</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo(null)}>Thêm sân</Button>
      </div>
      <Table
        rowKey="id"
        loading={dangTai}
        dataSource={ds}
        pagination={false}
        columns={[
          { title: 'Tên sân', dataIndex: 'tenSan', render: (v) => <b>{v}</b> },
          { title: 'Loại sân', dataIndex: 'loaiSan' },
          { title: 'Mô tả', dataIndex: 'moTa', ellipsis: true },
          { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <Tag color={MAU[v]}>{TRANG_THAI_SAN[v]}</Tag> },
          {
            title: 'Đánh giá',
            render: (_, s) => {
              const d = diem.find((x) => x.tenSan === s.tenSan);
              return d ? <Space size={4}><Rate disabled allowHalf value={d.diemTrungBinh} style={{ fontSize: 14 }} /><Typography.Text type="secondary">{d.diemTrungBinh} ({d.soLuot})</Typography.Text></Space> : '—';
            },
          },
          { title: '', align: 'right', render: (_, s) => <Button size="small" icon={<EditOutlined />} onClick={() => mo(s)}>Sửa</Button> },
        ]}
      />
      {sua && <SuaSanModal san={sua} dsLoai={loaiSan} onClose={() => setSua(null)} onXong={tai} />}
    </>
  );
}

function SuaSanModal({ san, dsLoai, onClose, onXong }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loiLich, setLoiLich] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);

  const luu = async () => {
    const v = await form.validateFields();
    setDangLuu(true);
    setLoiLich(null);
    try {
      if (san.id) await quanTriApi.suaSan(san.id, v);
      else await quanTriApi.taoSan(v);
      message.success('Đã lưu sân');
      onXong();
      onClose();
    } catch (e) {
      if (e.code === 'SAN_CON_LICH') setLoiLich(e);
      else message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal open title={san.id ? `Sửa ${san.tenSan}` : 'Thêm sân'} onCancel={onClose} onOk={luu} okText="Lưu" okButtonProps={{ loading: dangLuu }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={san.id ? { tenSan: san.tenSan, loaiSan: san.loaiSan ?? '', moTa: san.moTa ?? '', trangThai: san.trangThai } : { tenSan: '', loaiSan: '', moTa: '' }}
      >
        <Form.Item name="tenSan" label="Tên sân" rules={[{ required: true, message: 'Nhập tên sân' }, { max: 50 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="loaiSan" label="Loại sân">
          <AutoComplete options={dsLoai.map((l) => ({ value: l }))} placeholder="Ví dụ: Thảm PVC tiêu chuẩn" />
        </Form.Item>
        <Form.Item name="moTa" label="Mô tả">
          <Input.TextArea rows={2} maxLength={255} />
        </Form.Item>
        {san.id && (
          <Form.Item name="trangThai" label="Trạng thái" extra="Sân gặp sự cố nên ghi nhận ở màn hình Vận hành sân của lễ tân để xử lý lịch bị ảnh hưởng.">
            <Select options={Object.entries(TRANG_THAI_SAN).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        )}
      </Form>
      {loiLich && (
        <Alert type="error" showIcon message={loiLich.message} description={Array.isArray(loiLich.details) ? `Các đơn: ${loiLich.details.join(', ')}` : undefined} />
      )}
    </Modal>
  );
}

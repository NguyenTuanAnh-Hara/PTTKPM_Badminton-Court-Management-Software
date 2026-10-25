import { useCallback, useEffect, useState } from 'react';
import {
  Alert, App, Button, Card, Col, Collapse, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { quanTriApi } from '../../api/index.js';
import { GIO_CHAN, LOAI_NGAY, homNay, ngayVN, tien } from '../../utils/format.js';

const TEN_THAM_SO = {
  SO_KHUNG_LIEN_TIEP_TOI_DA: 'Số khung liên tiếp tối đa / sân (QT-01)',
  SO_NGAY_DAT_TRUOC: 'Số ngày được đặt trước (QT-02)',
  PHUT_DAT_TRUOC_TOI_THIEU: 'Đặt trước tối thiểu (phút)',
  SO_DON_CHO_TOI_DA: 'Số đơn chờ thanh toán tối đa (QT-03)',
  GIU_CHO_PHUT: 'Giữ chỗ đơn online (phút, QT-04)',
  GIU_CHO_LE_TAN_PHUT: 'Giữ chỗ đơn lễ tân tạo (phút)',
  PHAN_TRAM_HOAN_SAN: 'Hoàn tiền sân khi hủy < 24 giờ (%)',
  SO_LAN_DOI_LICH_TOI_DA: 'Số lần đổi lịch tối đa (QT-13)',
  PHUT_CHECK_IN_TRUOC: 'Check-in sớm (phút, QT-16)',
  PHUT_CHECK_IN_SAU: 'Check-in muộn (phút)',
  SO_LAN_NO_SHOW_KHOA: 'Số lần không đến thì khóa (QT-18)',
  SO_NGAY_DEM_NO_SHOW: 'Khoảng đếm không đến (ngày)',
  GIO_CAO_DIEM_TU: 'Giờ cao điểm từ',
  GIO_CAO_DIEM_DEN: 'Giờ cao điểm đến',
  HE_SO_TRU_GIO_CAO_DIEM: 'Hệ số trừ gói giờ cao điểm (QT-23)',
};

// UC06.2 Quản lý bảng giá theo loại ngày (QT-07, QT-08) và danh sách ngày lễ
export default function BangGiaPage() {
  const { message } = App.useApp();
  const [du, setDu] = useState(null);
  const [thamSo, setThamSo] = useState(null);
  const [tab, setTab] = useState('NGAY_THUONG');
  const [moSua, setMoSua] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [form] = Form.useForm();
  const [formLe] = Form.useForm();

  const tai = useCallback(async () => {
    try {
      setDu(await quanTriApi.bangGia());
    } catch (e) {
      message.error(e.message);
    }
  }, []);

  useEffect(() => {
    tai();
    quanTriApi.thamSo().then(setThamSo).catch(() => {});
  }, [tai]);

  const hn = homNay();
  const theoLoai = (loai) => (du?.khungGia ?? []).filter((k) => k.loaiNgay === loai);
  const hienHanh = (loai) => theoLoai(loai).filter((k) => k.apDungTu <= hn);

  const moThietLap = () => {
    const ds = hienHanh(tab);
    form.setFieldsValue({
      loaiNgay: tab,
      apDungTu: dayjs().add(1, 'day'),
      dsKhung: ds.length ? ds.map((k) => ({ gioBatDau: k.gioBatDau, gioKetThuc: k.gioKetThuc, donGia: k.donGia })) : [{ gioBatDau: '05:00', gioKetThuc: '23:00', donGia: 80000 }],
    });
    setMoSua(true);
  };

  const luu = async () => {
    const v = await form.validateFields();
    setDangLuu(true);
    try {
      await quanTriApi.luuBangGia({ loaiNgay: v.loaiNgay, apDungTu: v.apDungTu.format('YYYY-MM-DD'), dsKhung: v.dsKhung });
      message.success('Đã lưu bảng giá mới');
      setMoSua(false);
      setTab(v.loaiNgay);
      tai();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  const themLe = async (v) => {
    try {
      await quanTriApi.themNgayLe({ ngay: v.ngay.format('YYYY-MM-DD'), tenNgayLe: v.tenNgayLe.trim() });
      message.success('Đã thêm ngày lễ');
      formLe.resetFields();
      tai();
    } catch (e) {
      message.error(e.message);
    }
  };

  const xoaLe = async (id) => {
    try {
      await quanTriApi.xoaNgayLe(id);
      tai();
    } catch (e) {
      message.error(e.message);
    }
  };

  // Kiểm tra phủ kín 05:00–23:00 ngay trên giao diện
  const dsKhungForm = Form.useWatch('dsKhung', form) ?? [];
  const sapXep = [...dsKhungForm].filter((k) => k?.gioBatDau && k?.gioKetThuc).sort((a, b) => a.gioBatDau.localeCompare(b.gioBatDau));
  let canhBao = null;
  let moc = '05:00';
  for (const k of sapXep) {
    if (k.gioBatDau !== moc) {
      canhBao = `Khung giá phải nối liền nhau: thiếu hoặc chồng lấn tại ${moc}`;
      break;
    }
    moc = k.gioKetThuc;
  }
  if (!canhBao && sapXep.length && moc !== '23:00') canhBao = 'Bảng giá phải phủ kín đến 23:00';

  const cotKhung = [
    { title: 'Khung giờ', render: (_, k) => `${k.gioBatDau} – ${k.gioKetThuc}` },
    { title: 'Đơn giá / giờ', dataIndex: 'donGia', align: 'right', render: (v) => <b>{tien(v)}</b> },
    { title: 'Áp dụng', render: (_, k) => (k.apDungTu <= hn ? <Tag color="green">Đang áp dụng từ {ngayVN(k.apDungTu)}</Tag> : <Tag color="blue">Từ {ngayVN(k.apDungTu)}</Tag>) },
    { title: 'Đến', dataIndex: 'apDungDen', render: (v) => (v ? ngayVN(v) : 'Không thời hạn') },
  ];

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Bảng giá</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={moThietLap}>Thiết lập bảng giá mới</Button>
      </div>
      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card size="small">
            <Tabs activeKey={tab} onChange={setTab} items={Object.entries(LOAI_NGAY).map(([key, label]) => ({ key, label }))} />
            <Table size="small" rowKey="id" pagination={false} dataSource={theoLoai(tab)} columns={cotKhung} loading={!du} />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              Ưu tiên loại ngày: Ngày lễ &gt; Cuối tuần &gt; Ngày thường (QT-07). Bảng giá mới chỉ áp dụng cho đơn tạo sau ngày hiệu lực; đơn cũ giữ đơn giá đã lưu.
            </Typography.Paragraph>
          </Card>
          {thamSo && (
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: 'ts',
                  label: 'Tham số nghiệp vụ hiện hành (đổi trong tệp .env của backend – NFR-13)',
                  children: (
                    <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
                      {Object.entries(TEN_THAM_SO).map(([k, ten]) => (
                        <Descriptions.Item key={k} label={ten}>{String(thamSo[k])}</Descriptions.Item>
                      ))}
                    </Descriptions>
                  ),
                },
              ]}
            />
          )}
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="Ngày lễ">
            <Form form={formLe} layout="inline" onFinish={themLe} style={{ marginBottom: 12, rowGap: 8 }}>
              <Form.Item name="ngay" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker format="DD/MM/YYYY" placeholder="Ngày" />
              </Form.Item>
              <Form.Item name="tenNgayLe" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="Tên ngày lễ" style={{ width: 150 }} />
              </Form.Item>
              <Button htmlType="submit" icon={<PlusOutlined />}>Thêm</Button>
            </Form>
            <Table
              size="small"
              rowKey="id"
              pagination={{ pageSize: 10, size: 'small' }}
              dataSource={du?.ngayLe ?? []}
              columns={[
                { title: 'Ngày', dataIndex: 'ngay', render: (v) => <span style={{ color: v < hn ? '#8c8c8c' : undefined }}>{ngayVN(v)}</span> },
                { title: 'Tên', dataIndex: 'tenNgayLe' },
                {
                  title: '',
                  align: 'right',
                  render: (_, n) => (
                    <Popconfirm title="Xóa ngày lễ này?" onConfirm={() => xoaLe(n.id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal open={moSua} width={640} title="Thiết lập bảng giá mới" onCancel={() => setMoSua(false)} onOk={luu} okText="Lưu bảng giá" okButtonProps={{ loading: dangLuu, disabled: Boolean(canhBao) }} forceRender>
        <Form form={form} layout="vertical">
          <Space wrap>
            <Form.Item name="loaiNgay" label="Loại ngày" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={Object.entries(LOAI_NGAY).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="apDungTu" label="Áp dụng từ ngày" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker format="DD/MM/YYYY" disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
            </Form.Item>
          </Space>
          <Typography.Text strong>Các khung giá (phủ kín 05:00 – 23:00, giờ chẵn)</Typography.Text>
          <Form.List name="dsKhung">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginTop: 8 }}>
                    <Form.Item name={[name, 'gioBatDau']} rules={[{ required: true, message: 'Chọn giờ' }]} style={{ marginBottom: 0 }}>
                      <Select style={{ width: 100 }} options={GIO_CHAN.slice(0, -1).map((g) => ({ value: g, label: g }))} />
                    </Form.Item>
                    <span>→</span>
                    <Form.Item name={[name, 'gioKetThuc']} rules={[{ required: true, message: 'Chọn giờ' }]} style={{ marginBottom: 0 }}>
                      <Select style={{ width: 100 }} options={GIO_CHAN.slice(1).map((g) => ({ value: g, label: g }))} />
                    </Form.Item>
                    <Form.Item name={[name, 'donGia']} rules={[{ required: true, message: 'Nhập giá' }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={1000} step={1000} style={{ width: 170 }} addonAfter="đ/giờ" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => v.replace(/\./g, '')} />
                    </Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#cf1322' }} />}
                  </Space>
                ))}
                <Button type="dashed" style={{ marginTop: 10 }} icon={<PlusOutlined />} onClick={() => add({ gioBatDau: moc < '23:00' ? moc : undefined, gioKetThuc: '23:00', donGia: 80000 })}>
                  Thêm khung giá
                </Button>
              </>
            )}
          </Form.List>
          {canhBao && <Alert style={{ marginTop: 12 }} type="warning" showIcon message={canhBao} />}
        </Form>
      </Modal>
    </>
  );
}

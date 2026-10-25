import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Result, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, LockOutlined, UnlockOutlined, SearchOutlined } from '@ant-design/icons';
import { quanTriApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TRANG_THAI_TK, VAI_TRO, ngayVN, tien } from '../../utils/format.js';

const MAU_TT = { HOAT_DONG: 'green', KHOA_DAT_TRUC_TUYEN: 'orange', KHOA: 'red' };
const MAU_VT = { KHACH_HANG: 'default', LE_TAN: 'blue', HLV: 'purple', QUAN_LY: 'gold' };

// UC06.5 Quản lý tài khoản: tạo tài khoản nhân viên / HLV, sửa, phân quyền, khóa / mở khóa có lý do
export default function TaiKhoanPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [boLoc, setBoLoc] = useState({ q: '', vaiTro: undefined, trangThai: undefined });
  const [ds, setDs] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [sua, setSua] = useState(null);
  const [khoa, setKhoa] = useState(null);

  const tai = useCallback(async (loc = boLoc) => {
    setDangTai(true);
    try {
      setDs(await quanTriApi.dsTaiKhoan({ q: loc.q.trim() || undefined, vaiTro: loc.vaiTro, trangThai: loc.trangThai }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [boLoc]);

  useEffect(() => {
    tai();
  }, [boLoc.vaiTro, boLoc.trangThai]);

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Tài khoản</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSua({})}>Tạo tài khoản nhân viên</Button>
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tên, SĐT hoặc email"
          style={{ width: 240 }}
          value={boLoc.q}
          onChange={(e) => setBoLoc((x) => ({ ...x, q: e.target.value }))}
          onPressEnter={() => tai()}
        />
        <Select allowClear placeholder="Vai trò" style={{ width: 160 }} value={boLoc.vaiTro} onChange={(v) => setBoLoc((x) => ({ ...x, vaiTro: v }))} options={Object.entries(VAI_TRO).map(([value, label]) => ({ value, label }))} />
        <Select allowClear placeholder="Trạng thái" style={{ width: 190 }} value={boLoc.trangThai} onChange={(v) => setBoLoc((x) => ({ ...x, trangThai: v }))} options={Object.entries(TRANG_THAI_TK).map(([value, label]) => ({ value, label }))} />
        <Button onClick={() => tai()}>Tìm</Button>
      </Space>
      <Table
        rowKey="id"
        loading={dangTai}
        dataSource={ds}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 15, showTotal: (t) => `${t} tài khoản` }}
        columns={[
          { title: 'Họ tên', dataIndex: 'hoTen', render: (v) => <b>{v}</b> },
          { title: 'Liên hệ', render: (_, u) => <>{u.soDienThoai}<br /><Typography.Text type="secondary">{u.email}</Typography.Text></> },
          { title: 'Vai trò', dataIndex: 'vaiTro', render: (v) => <Tag color={MAU_VT[v]}>{VAI_TRO[v]}</Tag> },
          {
            title: 'Thông tin thêm',
            render: (_, u) => {
              if (u.vaiTro === 'KHACH_HANG') return <>{u.hang ? `${u.hang} (đến ${ngayVN(u.hanThanhVien)})` : 'Chưa có hạng'} · {u.diemThuong} điểm · không đến {u.soLanNoShow} lần</>;
              if (u.vaiTro === 'HLV') return `${u.chuyenMon || 'HLV'} · ${tien(u.hocPhiGio)}/giờ`;
              if (u.vaiTro === 'LE_TAN') return u.caLamViec ? `Ca: ${u.caLamViec}` : '—';
              return '—';
            },
          },
          { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <Tag color={MAU_TT[v]}>{TRANG_THAI_TK[v]}</Tag> },
          { title: 'Ngày tạo', dataIndex: 'ngayTao', render: ngayVN },
          {
            title: '',
            align: 'right',
            render: (_, u) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => setSua(u)} />
                {u.id !== user.id &&
                  (u.trangThai === 'HOAT_DONG' ? (
                    <Button size="small" danger icon={<LockOutlined />} onClick={() => setKhoa(u)}>Khóa</Button>
                  ) : (
                    <Button size="small" icon={<UnlockOutlined />} onClick={() => setKhoa(u)}>Mở khóa</Button>
                  ))}
              </Space>
            ),
          },
        ]}
      />
      {sua && <SuaTaiKhoanModal tk={sua} onClose={() => setSua(null)} onXong={() => tai()} />}
      {khoa && <KhoaTaiKhoanModal tk={khoa} onClose={() => setKhoa(null)} onXong={() => tai()} />}
    </>
  );
}

function SuaTaiKhoanModal({ tk, onClose, onXong }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const vaiTro = Form.useWatch('vaiTro', form);
  const [dangLuu, setDangLuu] = useState(false);
  const [matKhauTam, setMatKhauTam] = useState(null);
  const laMoi = !tk.id;

  const luu = async () => {
    const v = await form.validateFields();
    setDangLuu(true);
    try {
      if (laMoi) {
        const r = await quanTriApi.taoTaiKhoan(v);
        setMatKhauTam(r.matKhauTam);
      } else {
        await quanTriApi.suaTaiKhoan(tk.id, v);
        message.success('Đã cập nhật tài khoản');
        onClose();
      }
      onXong();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  if (matKhauTam) {
    return (
      <Modal open footer={<Button type="primary" onClick={onClose}>Đóng</Button>} onCancel={onClose} title="Đã tạo tài khoản">
        <Result
          status="success"
          title="Tạo tài khoản thành công"
          subTitle={<>Mật khẩu tạm: <Typography.Text code copyable strong>{matKhauTam}</Typography.Text><br />Thông tin đăng nhập cũng đã được gửi qua email. Nhân viên nên đổi mật khẩu ở lần đăng nhập đầu tiên.</>}
        />
      </Modal>
    );
  }

  return (
    <Modal open title={laMoi ? 'Tạo tài khoản nhân viên' : `Sửa tài khoản ${tk.hoTen}`} onCancel={onClose} onOk={luu} okText="Lưu" okButtonProps={{ loading: dangLuu }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={laMoi ? { vaiTro: 'LE_TAN' } : { hoTen: tk.hoTen, email: tk.email, vaiTro: tk.vaiTro, chuyenMon: tk.chuyenMon, hocPhiGio: tk.hocPhiGio, caLamViec: tk.caLamViec }}
      >
        <Form.Item name="hoTen" label="Họ tên" rules={[{ required: true }, { pattern: /^[\p{L} ]{2,100}$/u, message: 'Họ tên 2–100 ký tự, chỉ gồm chữ' }]}>
          <Input />
        </Form.Item>
        {laMoi && (
          <Form.Item name="soDienThoai" label="Số điện thoại" rules={[{ required: true }, { pattern: /^0\d{9}$/, message: '10 chữ số, bắt đầu bằng 0' }]}>
            <Input maxLength={10} />
          </Form.Item>
        )}
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email', message: 'Email không hợp lệ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="vaiTro" label="Vai trò" rules={[{ required: true }]} extra={!laMoi && tk.vaiTro !== vaiTro ? 'Đổi vai trò sẽ được ghi nhật ký (phân quyền).' : undefined}>
          <Select options={Object.entries(VAI_TRO).filter(([k]) => !laMoi || k !== 'KHACH_HANG').map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        {vaiTro === 'HLV' && (
          <Space wrap>
            <Form.Item name="chuyenMon" label="Chuyên môn">
              <Input placeholder="VD: Kỹ thuật cơ bản, đánh đôi" style={{ width: 240 }} />
            </Form.Item>
            <Form.Item name="hocPhiGio" label="Học phí / giờ" rules={[{ required: true, message: 'Nhập học phí' }]}>
              <InputNumber min={0} step={10000} addonAfter="đ" style={{ width: 170 }} />
            </Form.Item>
          </Space>
        )}
        {vaiTro === 'LE_TAN' && (
          <Form.Item name="caLamViec" label="Ca làm việc">
            <Input placeholder="VD: Sáng 05:00–13:00" />
          </Form.Item>
        )}
      </Form>
      {laMoi && <Alert type="info" showIcon message="Hệ thống tạo mật khẩu tạm và gửi qua email cho nhân viên." />}
    </Modal>
  );
}

function KhoaTaiKhoanModal({ tk, onClose, onXong }) {
  const { message } = App.useApp();
  const moKhoa = tk.trangThai !== 'HOAT_DONG';
  const [trangThai, setTrangThai] = useState(moKhoa ? 'HOAT_DONG' : tk.vaiTro === 'KHACH_HANG' ? 'KHOA_DAT_TRUC_TUYEN' : 'KHOA');
  const [lyDo, setLyDo] = useState('');
  const [donKhongDen, setDonKhongDen] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (tk.vaiTro === 'KHACH_HANG') quanTriApi.donKhongDen(tk.id).then(setDonKhongDen).catch(() => setDonKhongDen([]));
  }, [tk.id]);

  const luu = async () => {
    setDangLuu(true);
    try {
      await quanTriApi.doiTrangThai(tk.id, { trangThai, lyDo: lyDo.trim() });
      message.success(trangThai === 'HOAT_DONG' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      onXong();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal open title={`${moKhoa ? 'Mở khóa' : 'Khóa'} tài khoản ${tk.hoTen}`} onCancel={onClose} onOk={luu} okText="Xác nhận" okButtonProps={{ danger: !moKhoa, disabled: !lyDo.trim(), loading: dangLuu }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>Trạng thái hiện tại: <Tag color={MAU_TT[tk.trangThai]}>{TRANG_THAI_TK[tk.trangThai]}</Tag></div>
        <Select
          style={{ width: '100%' }}
          value={trangThai}
          onChange={setTrangThai}
          options={Object.entries(TRANG_THAI_TK)
            .filter(([k]) => k !== tk.trangThai && (tk.vaiTro === 'KHACH_HANG' || k !== 'KHOA_DAT_TRUC_TUYEN'))
            .map(([value, label]) => ({ value, label: value === 'HOAT_DONG' ? 'Mở khóa (hoạt động)' : label }))}
        />
        <Input.TextArea rows={2} placeholder="Lý do (bắt buộc)" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
        {trangThai === 'KHOA' && <Alert type="warning" showIcon message="Khóa hẳn sẽ đăng xuất tài khoản khỏi mọi thiết bị." />}
        {donKhongDen?.length > 0 && (
          <>
            <Typography.Text strong>Các đơn “Không đến” (căn cứ xét mở khóa – QT-18)</Typography.Text>
            <Table
              size="small"
              rowKey="maDon"
              pagination={false}
              dataSource={donKhongDen}
              columns={[
                { title: 'Mã đơn', dataIndex: 'maDon' },
                { title: 'Ngày chơi', dataIndex: 'ngayChoi', render: ngayVN },
                { title: 'Khung', dataIndex: 'khung' },
              ]}
            />
          </>
        )}
      </Space>
    </Modal>
  );
}

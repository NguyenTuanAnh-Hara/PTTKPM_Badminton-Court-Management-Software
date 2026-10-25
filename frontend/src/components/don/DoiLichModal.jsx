import { useEffect, useState } from 'react';
import { Alert, App, DatePicker, Descriptions, Modal, Radio, Space, Spin, Steps, Typography } from 'antd';
import dayjs from 'dayjs';
import { datSanApi } from '../../api/index.js';
import LuoiLichSan, { ChuThichLuoi } from '../LuoiLichSan.jsx';
import { moTaKhung, ngayChoiCuaDon, tien } from '../../utils/format.js';

// UC02.5 Đổi lịch đặt sân (QT-13): chọn lịch mới → xem chênh lệch (xacNhan:false) → xác nhận
export default function DoiLichModal({ don, laNhanVien, onClose, onXong }) {
  const { message } = App.useApp();
  const [ngay, setNgay] = useState(dayjs(ngayChoiCuaDon(don)));
  const [lich, setLich] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [chon, setChon] = useState([]);
  const [buoc, setBuoc] = useState(0);
  const [tomTat, setTomTat] = useState(null);
  const [phuongThuc, setPhuongThuc] = useState('TIEN_MAT');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    datSanApi
      .lichSan(ngay.format('YYYY-MM-DD'))
      .then((r) => !huy && setLich(r))
      .catch((e) => message.error(e.message))
      .finally(() => !huy && setDangTai(false));
    setChon([]);
    return () => {
      huy = true;
    };
  }, [ngay]);

  const laChon = (s, k) => chon.some((o) => o.sanId === s && o.khungGioId === k);
  const batTat = (s, k) => setChon((ds) => (laChon(s, k) ? ds.filter((o) => !(o.sanId === s && o.khungGioId === k)) : [...ds, { sanId: s, khungGioId: k }]));

  const body = (xacNhan) => ({ ngayChoi: ngay.format('YYYY-MM-DD'), danhSach: chon, xacNhan, ...(laNhanVien ? { phuongThuc } : {}) });

  const xemChenhLech = async () => {
    setDangGui(true);
    try {
      setTomTat(await datSanApi.doiLich(don.maDon, body(false)));
      setBuoc(1);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  const xacNhan = async () => {
    setDangGui(true);
    try {
      const r = await datSanApi.doiLich(don.maDon, body(true));
      if (r.paymentUrl) {
        message.info('Chuyển sang cổng thanh toán để trả phần chênh lệch…');
        window.location.href = r.paymentUrl;
        return;
      }
      message.success('Đã đổi lịch thành công');
      onXong?.();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  const gioiHan = laNhanVien ? 30 : 6;
  return (
    <Modal
      open
      width={1100}
      title={`Đổi lịch đơn ${don.maDon}`}
      onCancel={onClose}
      okText={buoc === 0 ? 'Xem chênh lệch' : tomTat?.canThanhToan && !laNhanVien ? 'Thanh toán chênh lệch' : 'Xác nhận đổi lịch'}
      okButtonProps={{ loading: dangGui, disabled: buoc === 0 && !chon.length }}
      onOk={buoc === 0 ? xemChenhLech : xacNhan}
      cancelText={buoc === 1 ? 'Quay lại' : 'Đóng'}
      cancelButtonProps={{ onClick: buoc === 1 ? () => setBuoc(0) : onClose }}
    >
      <Steps size="small" current={buoc} style={{ marginBottom: 16 }} items={[{ title: 'Chọn lịch mới' }, { title: 'Xác nhận chênh lệch' }]} />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={`Lịch hiện tại: ${moTaKhung(don.chiTiet).join('; ')} ngày ${dayjs(ngayChoiCuaDon(don)).format('DD/MM/YYYY')}. Mỗi đơn chỉ được đổi 1 lần, khi còn ít nhất 2 giờ trước giờ chơi.`}
      />
      {buoc === 0 && (
        <>
          <Space style={{ marginBottom: 8 }}>
            <span>Ngày chơi mới:</span>
            <DatePicker
              value={ngay}
              allowClear={false}
              format="DD/MM/YYYY"
              onChange={(d) => d && setNgay(d)}
              disabledDate={(d) => d.isBefore(dayjs(), 'day') || d.isAfter(dayjs().add(gioiHan, 'day'), 'day')}
            />
            <Typography.Text type="secondary">Đã chọn {chon.length} khung</Typography.Text>
          </Space>
          <ChuThichLuoi cheDoNhanVien={laNhanVien} />
          <Spin spinning={dangTai}>
            <LuoiLichSan lich={lich} laChon={laChon} onBatTat={batTat} cheDoNhanVien={laNhanVien} />
          </Spin>
        </>
      )}
      {buoc === 1 && tomTat && (
        <>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Tổng tiền lịch cũ">{tien(tomTat.tongTienCu)}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền lịch mới">{tien(tomTat.tongTienMoi)}</Descriptions.Item>
            <Descriptions.Item label="Đã thanh toán">{tien(tomTat.daThanhToan)}</Descriptions.Item>
            <Descriptions.Item label="Chênh lệch">
              {tomTat.canThanhToan ? (
                <b style={{ color: '#cf1322' }}>Cần trả thêm {tien(tomTat.chenhLech)}</b>
              ) : tomTat.duocHoan ? (
                <b style={{ color: '#0f7b5f' }}>Được hoàn {tien(tomTat.duocHoan)}</b>
              ) : (
                'Không phát sinh chênh lệch'
              )}
            </Descriptions.Item>
          </Descriptions>
          {tomTat.canThanhToan && laNhanVien && (
            <Space style={{ marginTop: 12 }}>
              <span>Thu phần chênh lệch bằng:</span>
              <Radio.Group value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)}>
                <Radio value="TIEN_MAT">Tiền mặt</Radio>
                <Radio value="CHUYEN_KHOAN">Chuyển khoản</Radio>
              </Radio.Group>
            </Space>
          )}
          {tomTat.canThanhToan && !laNhanVien && (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon message="Lịch mới được giữ 10 phút và chỉ áp dụng khi thanh toán chênh lệch thành công qua VNPAY." />
          )}
        </>
      )}
    </Modal>
  );
}

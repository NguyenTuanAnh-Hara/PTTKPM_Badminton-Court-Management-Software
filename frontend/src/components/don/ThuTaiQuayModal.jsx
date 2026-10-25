import { useState } from 'react';
import { App, Button, Col, Divider, InputNumber, Modal, Radio, Result, Row, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { thanhToanApi } from '../../api/index.js';
import BangTinhTien from '../BangTinhTien.jsx';
import ChonUuDai, { useTinhTien } from '../ChonUuDai.jsx';
import { tien } from '../../utils/format.js';

// UC03.1 – A1/A3: lễ tân thu tiền tại quầy (tiền mặt / chuyển khoản), POST /thanh-toan/tai-quay
export default function ThuTaiQuayModal({ don, onClose, onXong }) {
  const { message } = App.useApp();
  const nav = useNavigate();
  const tinh = useTinhTien(don.maDon);
  const [phuongThuc, setPhuongThuc] = useState('TIEN_MAT');
  const [tienDua, setTienDua] = useState(null);
  const [dangGui, setDangGui] = useState(false);
  const [ketQua, setKetQua] = useState(null);
  const bang = tinh.ketQua?.bangTinhTien;
  const phaiTra = bang?.phaiTra ?? 0;

  const thu = async () => {
    setDangGui(true);
    try {
      const r = await thanhToanApi.thuTaiQuay({
        maDon: don.maDon,
        maGiamGia: tinh.luaChon.maGiamGia || undefined,
        soDiem: tinh.luaChon.soDiem || undefined,
        goiGioChoiId: tinh.luaChon.goiGioChoiId || undefined,
        phuongThuc,
        tienKhachDua: phuongThuc === 'TIEN_MAT' ? tienDua ?? phaiTra : undefined,
      });
      setKetQua(r);
      message.success('Đã ghi nhận thanh toán');
      onXong?.();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  if (ketQua) {
    return (
      <Modal open onCancel={onClose} footer={null} title={`Thu tiền đơn ${don.maDon}`}>
        <Result
          status="success"
          title="Thanh toán thành công"
          subTitle={ketQua.tienThua > 0 ? `Tiền thừa trả khách: ${tien(ketQua.tienThua)}` : 'Đơn đã được xác nhận'}
          extra={[
            ketQua.hoaDon && (
              <Button key="hd" onClick={() => nav(`/hoa-don/${ketQua.hoaDon}`)}>In hóa đơn {ketQua.hoaDon}</Button>
            ),
            <Button key="dong" type="primary" onClick={onClose}>Đóng</Button>,
          ]}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open
      width={760}
      title={`Thu tiền tại quầy – đơn ${don.maDon}`}
      onCancel={onClose}
      okText={`Xác nhận đã thu ${tien(phaiTra)}`}
      okButtonProps={{ loading: dangGui, disabled: !bang || Boolean(tinh.loi) || tinh.dangTinh || (phuongThuc === 'TIEN_MAT' && (tienDua ?? phaiTra) < phaiTra) }}
      onOk={thu}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <ChonUuDai tinh={tinh} coTaiKhoan={don.khach?.coTaiKhoan} />
        </Col>
        <Col xs={24} md={12}>
          <BangTinhTien bang={bang} />
          <Divider style={{ margin: '12px 0' }} />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Group value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="TIEN_MAT">Tiền mặt</Radio.Button>
              <Radio.Button value="CHUYEN_KHOAN">Chuyển khoản</Radio.Button>
            </Radio.Group>
            {phuongThuc === 'TIEN_MAT' && (
              <>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={10000}
                  value={tienDua ?? phaiTra}
                  onChange={setTienDua}
                  addonBefore="Khách đưa"
                  addonAfter="đ"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => v.replace(/\./g, '')}
                />
                <Typography.Text>
                  Tiền thừa: <b>{tien(Math.max(0, (tienDua ?? phaiTra) - phaiTra))}</b>
                </Typography.Text>
              </>
            )}
            {phuongThuc === 'CHUYEN_KHOAN' && (
              <Typography.Text type="secondary">Kiểm tra tiền đã vào tài khoản của sân rồi mới xác nhận.</Typography.Text>
            )}
          </Space>
        </Col>
      </Row>
    </Modal>
  );
}

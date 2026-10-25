import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, App, Button, Descriptions, Divider, Drawer, Empty, Popconfirm, Rate, Space, Spin, Table, Tag, Typography,
} from 'antd';
import {
  CreditCardOutlined, CloseCircleOutlined, SwapOutlined, CoffeeOutlined, UserAddOutlined, StarOutlined, LoginOutlined,
  DollarOutlined, FileTextOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { datSanApi, dichVuApi, vanHanhApi } from '../api/index.js';
import TrangThaiDon from './TrangThaiDon.jsx';
import DongHoGiuCho from './DongHoGiuCho.jsx';
import ThuTaiQuayModal from './don/ThuTaiQuayModal.jsx';
import HuyDonModal from './don/HuyDonModal.jsx';
import DoiLichModal from './don/DoiLichModal.jsx';
import DichVuModal from './don/DichVuModal.jsx';
import HlvModal from './don/HlvModal.jsx';
import DanhGiaModal from './don/DanhGiaModal.jsx';
import NhanThietBiModal from './don/NhanThietBiModal.jsx';
import {
  LOAI_DICH_VU, PHUONG_THUC, TRANG_THAI_DICH_VU, TRANG_THAI_GIAO_DICH, gio, moTaKhung, ngayGio, ngayVN, ngayChoiCuaDon, tien,
} from '../utils/format.js';

/**
 * Drawer chi tiết đơn đặt sân – dùng chung cho khách hàng và lễ tân (UC02.3).
 * props: maDon, open, onClose, onThayDoi (gọi sau mỗi thao tác làm đổi đơn),
 *        cheDoNhanVien (lễ tân: thu tại quầy, check-in, giao/nhận thiết bị), chiXem (quản lý chỉ xem)
 */
export default function ChiTietDon({ maDon, open, onClose, onThayDoi, cheDoNhanVien = false, chiXem = false }) {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [don, setDon] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [moModal, setMoModal] = useState(null); // 'thu' | 'huy' | 'doi' | 'dichVu' | 'hlv' | 'danhGia' | { nhan: dv }
  const [dangLam, setDangLam] = useState(null);

  const tai = useCallback(async () => {
    if (!maDon) return;
    setDangTai(true);
    try {
      setDon(await datSanApi.chiTiet(maDon));
    } catch (e) {
      message.error(e.message);
      setDon(null);
    } finally {
      setDangTai(false);
    }
  }, [maDon]);

  useEffect(() => {
    if (open) tai();
    else {
      setDon(null);
      setMoModal(null);
    }
  }, [open, tai]);

  const sauThayDoi = () => {
    tai();
    onThayDoi?.();
  };

  const lam = async (khoa, fn, thanhCong) => {
    setDangLam(khoa);
    try {
      const r = await fn();
      message.success(typeof thanhCong === 'function' ? thanhCong(r) : thanhCong);
      sauThayDoi();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangLam(null);
    }
  };

  const laKhach = !cheDoNhanVien && !chiXem;
  const tt = don?.trangThai;
  const daBatDau = don?.batDau && new Date(don.batDau) <= new Date();

  const nutHanhDong = don && !chiXem && (
    <Space wrap>
      {don.coTheThanhToan && laKhach && (
        <Button type="primary" icon={<CreditCardOutlined />} onClick={() => nav(`/thanh-toan/${don.maDon}`)}>
          Thanh toán {tien(don.conPhaiThu)}
        </Button>
      )}
      {don.coTheThanhToan && cheDoNhanVien && (
        <Button type="primary" icon={<DollarOutlined />} onClick={() => setMoModal('thu')}>
          Thu tại quầy {tien(don.conPhaiThu)}
        </Button>
      )}
      {cheDoNhanVien && tt === 'DA_XAC_NHAN' && (
        <Button
          icon={<LoginOutlined />}
          loading={dangLam === 'checkin'}
          disabled={don.conPhaiThu > 0}
          onClick={() =>
            lam('checkin', () => vanHanhApi.checkIn(don.maDon), (r) =>
              r.thietBiCanGiao?.length ? `Check-in thành công. Cần giao: ${r.thietBiCanGiao.map((d) => `${d.tenDichVu} ×${d.soLuong}`).join(', ')}` : 'Check-in thành công',
            )
          }
        >
          Check-in
        </Button>
      )}
      {don.coTheDoiLich && (
        <Button icon={<SwapOutlined />} onClick={() => setMoModal('doi')}>Đổi lịch</Button>
      )}
      {(don.coTheThemDichVu || (cheDoNhanVien && tt === 'DANG_SU_DUNG')) && (
        <Button icon={<CoffeeOutlined />} onClick={() => setMoModal('dichVu')}>
          {cheDoNhanVien ? 'Dịch vụ tại quầy' : 'Thêm dịch vụ'}
        </Button>
      )}
      {don.coTheThemDichVu && (
        <Button icon={<UserAddOutlined />} onClick={() => setMoModal('hlv')}>Đặt HLV</Button>
      )}
      {laKhach && don.coTheDanhGia && (
        <Button icon={<StarOutlined />} onClick={() => setMoModal('danhGia')}>Đánh giá</Button>
      )}
      {don.coTheHuy && (
        <Button danger icon={<CloseCircleOutlined />} onClick={() => setMoModal('huy')}>
          {cheDoNhanVien ? 'Hủy hộ khách' : 'Hủy đặt sân'}
        </Button>
      )}
    </Space>
  );

  const cotDichVu = [
    { title: 'Dịch vụ', dataIndex: 'tenDichVu', render: (v, r) => <>{v} <Tag>{LOAI_DICH_VU[r.loai]}</Tag></> },
    { title: 'SL', dataIndex: 'soLuong', align: 'center', width: 50 },
    { title: 'Thành tiền', dataIndex: 'thanhTien', align: 'right', render: tien },
    { title: 'Trạng thái', dataIndex: 'trangThai', render: (v, r) => <Tag color={v === 'DA_GIAO' ? 'blue' : v === 'DA_TRA' ? 'green' : 'default'}>{TRANG_THAI_DICH_VU[v]}{r.tienCoc ? ` · cọc ${tien(r.tienCoc)}` : ''}</Tag> },
    {
      title: '',
      align: 'right',
      render: (_, r) => {
        if (chiXem) return null;
        if (cheDoNhanVien && r.trangThai === 'DA_DAT' && ['DA_XAC_NHAN', 'DANG_SU_DUNG'].includes(tt)) {
          return (
            <Button size="small" loading={dangLam === `giao${r.id}`} onClick={() => lam(`giao${r.id}`, () => vanHanhApi.giaoThietBi(r.id), (x) => (x.tienCocThu ? `Đã giao. Thu cọc ${tien(x.tienCocThu)}` : 'Đã giao'))}>
              Giao
            </Button>
          );
        }
        if (cheDoNhanVien && r.trangThai === 'DA_GIAO' && r.loai === 'THIET_BI') {
          return <Button size="small" onClick={() => setMoModal({ nhan: r })}>Nhận lại</Button>;
        }
        if (r.trangThai === 'DA_DAT' && (cheDoNhanVien || !daBatDau)) {
          return (
            <Popconfirm title="Bỏ dịch vụ này khỏi đơn?" onConfirm={() => lam(`xoa${r.id}`, () => dichVuApi.xoaKhoiDon(don.maDon, r.id), (x) => (x.tongHoan ? `Đã bỏ dịch vụ, hoàn ${tien(x.tongHoan)}` : 'Đã bỏ dịch vụ'))}>
              <Button size="small" type="link" danger>Bỏ</Button>
            </Popconfirm>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        don ? (
          <Space>
            <span>Đơn {don.maDon}</span>
            <TrangThaiDon trangThai={don.trangThai} />
            {don.laDinhKy && <Tag color="purple">Định kỳ</Tag>}
          </Space>
        ) : (
          `Đơn ${maDon ?? ''}`
        )
      }
      extra={<Button icon={<ReloadOutlined />} onClick={tai} />}
    >
      <Spin spinning={dangTai}>
        {!don ? (
          !dangTai && <Empty />
        ) : (
          <>
            {tt === 'CHO_THANH_TOAN' && don.hanGiuCho && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                  <Space wrap>
                    <span>Đơn đang giữ chỗ, cần thanh toán trước {ngayGio(don.hanGiuCho)}</span>
                    <DongHoGiuCho han={don.hanGiuCho} onHet={tai} />
                  </Space>
                }
              />
            )}
            {nutHanhDong}
            <Divider style={{ margin: '14px 0' }} />
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
              <Descriptions.Item label="Khách">
                {don.khach.hoTen} {!don.khach.coTaiKhoan && <Tag>Vãng lai</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{don.khach.soDienThoai}</Descriptions.Item>
              <Descriptions.Item label="Ngày chơi">{ngayVN(ngayChoiCuaDon(don))}</Descriptions.Item>
              <Descriptions.Item label="Giờ">{gio(don.batDau)} – {gio(don.ketThuc)}</Descriptions.Item>
              <Descriptions.Item label="Sân" span={2}>{moTaKhung(don.chiTiet).join('; ')}</Descriptions.Item>
              <Descriptions.Item label="Kênh đặt">{don.kenhDat === 'TAI_QUAY' ? 'Tại quầy' : 'Trực tuyến'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{ngayGio(don.ngayTao)}</Descriptions.Item>
              {don.thoiGianCheckIn && <Descriptions.Item label="Check-in lúc">{ngayGio(don.thoiGianCheckIn)}</Descriptions.Item>}
              {don.soLanDoiLich > 0 && <Descriptions.Item label="Đổi lịch">{don.soLanDoiLich} lần</Descriptions.Item>}
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 18 }}>Khung giờ sân</Typography.Title>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={don.chiTiet}
              columns={[
                { title: 'Sân', dataIndex: 'tenSan' },
                { title: 'Ngày', dataIndex: 'ngayChoi', render: ngayVN },
                { title: 'Khung', render: (_, r) => `${r.gioBatDau}–${r.gioKetThuc}` },
                { title: 'Đơn giá', dataIndex: 'donGia', align: 'right', render: tien },
              ]}
            />

            {don.dichVu.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 18 }}>Dịch vụ đi kèm</Typography.Title>
                <Table size="small" rowKey="id" pagination={false} dataSource={don.dichVu} columns={cotDichVu} />
              </>
            )}

            {don.buoiHoc.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 18 }}>Buổi học với huấn luyện viên</Typography.Title>
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  dataSource={don.buoiHoc}
                  columns={[
                    { title: 'HLV', dataIndex: 'hlv' },
                    { title: 'Giờ học', render: (_, r) => `${r.gioBatDau}–${r.gioKetThuc} ${ngayVN(r.ngay)}` },
                    { title: 'Học phí', dataIndex: 'hocPhi', align: 'right', render: tien },
                    { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => <Tag color={v === 'DA_HUY' ? 'default' : v === 'DA_DAY' ? 'green' : 'blue'}>{{ DA_DAT: 'Đã đặt', DA_DAY: 'Đã dạy', DA_HUY: 'Đã hủy' }[v]}</Tag> },
                  ]}
                />
              </>
            )}

            <Typography.Title level={5} style={{ marginTop: 18 }}>Tiền</Typography.Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Tiền sân">{tien(don.tienSan)}</Descriptions.Item>
              {don.tienDichVu > 0 && <Descriptions.Item label="Dịch vụ">{tien(don.tienDichVu)}</Descriptions.Item>}
              {don.hocPhi > 0 && <Descriptions.Item label="Học phí">{tien(don.hocPhi)}</Descriptions.Item>}
              {don.maGiamGia && <Descriptions.Item label="Mã giảm giá">{don.maGiamGia}</Descriptions.Item>}
              <Descriptions.Item label="Tổng tiền (sau ưu đãi)"><b>{tien(don.tongTien)}</b></Descriptions.Item>
              <Descriptions.Item label="Đã thanh toán">{tien(don.daThanhToan)}</Descriptions.Item>
              <Descriptions.Item label="Còn phải trả">
                <b style={{ color: don.conPhaiThu ? '#cf1322' : '#0f7b5f' }}>{tien(don.conPhaiThu)}</b>
              </Descriptions.Item>
            </Descriptions>

            {don.thanhToan.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 18 }}>Lịch sử giao dịch</Typography.Title>
                <Table
                  size="small"
                  rowKey="maGiaoDich"
                  pagination={false}
                  dataSource={don.thanhToan}
                  columns={[
                    { title: 'Thời gian', dataIndex: 'thoiGian', render: ngayGio },
                    { title: 'Loại', dataIndex: 'loai', render: (v) => (v === 'HOAN_TIEN' ? <Tag color="volcano">Hoàn tiền</Tag> : <Tag color="green">Thanh toán</Tag>) },
                    { title: 'Phương thức', dataIndex: 'phuongThuc', render: (v, r) => `${PHUONG_THUC[v]}${r.soDiem ? ` (${r.soDiem} điểm)` : ''}` },
                    { title: 'Số tiền', dataIndex: 'soTien', align: 'right', render: tien },
                    { title: 'Trạng thái', dataIndex: 'trangThai', render: (v) => TRANG_THAI_GIAO_DICH[v] },
                    {
                      title: '',
                      dataIndex: 'maHoaDon',
                      render: (v) => v && <Button size="small" type="link" icon={<FileTextOutlined />} onClick={() => nav(`/hoa-don/${v}`)}>{v}</Button>,
                    },
                  ]}
                />
              </>
            )}

            {don.danhGia && (
              <>
                <Typography.Title level={5} style={{ marginTop: 18 }}>Đánh giá</Typography.Title>
                <Rate disabled value={don.danhGia.soSao} />
                <Typography.Paragraph style={{ marginTop: 6 }}>{don.danhGia.noiDung}</Typography.Paragraph>
                {don.danhGia.khieuNai && (
                  <Alert
                    type={don.danhGia.khieuNai.trangThai === 'DA_GIAI_QUYET' ? 'success' : 'warning'}
                    message={don.danhGia.khieuNai.trangThai === 'DA_GIAI_QUYET' ? 'Khiếu nại đã được giải quyết' : 'Khiếu nại đang chờ xử lý'}
                    description={<span style={{ whiteSpace: 'pre-line' }}>{don.danhGia.khieuNai.noiDungXuLy}</span>}
                  />
                )}
              </>
            )}
          </>
        )}
      </Spin>

      {don && moModal === 'thu' && <ThuTaiQuayModal don={don} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal === 'huy' && <HuyDonModal don={don} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal === 'doi' && <DoiLichModal don={don} laNhanVien={cheDoNhanVien} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal === 'dichVu' && <DichVuModal don={don} laNhanVien={cheDoNhanVien} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal === 'hlv' && <HlvModal don={don} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal === 'danhGia' && <DanhGiaModal don={don} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
      {don && moModal?.nhan && <NhanThietBiModal dv={moModal.nhan} onClose={() => setMoModal(null)} onXong={sauThayDoi} />}
    </Drawer>
  );
}

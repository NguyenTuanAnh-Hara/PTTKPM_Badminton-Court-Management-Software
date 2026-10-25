import { useCallback, useEffect, useState } from 'react';
import { App, Button, Select, Space, Table, Tag, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { quanTriApi } from '../../api/index.js';
import { VAI_TRO, ngayGio } from '../../utils/format.js';

const HANH_DONG = {
  TAO_DON: 'Tạo đơn', HUY_DON: 'Hủy đơn', DOI_LICH: 'Đổi lịch', THU_TIEN: 'Thu tiền', CHECK_IN: 'Check-in', NHAN_THIET_BI: 'Nhận thiết bị',
  SU_CO: 'Sự cố sân', CHUYEN_SAN: 'Chuyển sân', HUY_KHUNG_SU_CO: 'Hủy khung do sự cố', KHAC_PHUC_SU_CO: 'Khắc phục sự cố',
  THEM_SAN: 'Thêm sân', SUA_SAN: 'Sửa sân', DOI_GIA: 'Đổi bảng giá', THEM_NGAY_LE: 'Thêm ngày lễ', XOA_NGAY_LE: 'Xóa ngày lễ',
  THEM_DICH_VU: 'Thêm dịch vụ', SUA_DICH_VU: 'Sửa dịch vụ', NHAP_KHO: 'Nhập kho', NGUNG_DICH_VU: 'Ngừng dịch vụ', XOA_DICH_VU: 'Xóa dịch vụ',
  THEM_MA_GIAM_GIA: 'Thêm mã giảm giá', SUA_MA_GIAM_GIA: 'Sửa mã giảm giá', NGUNG_MA_GIAM_GIA: 'Ngừng mã giảm giá',
  THEM_HANG: 'Thêm hạng', SUA_HANG: 'Sửa hạng', THEM_GOI_GIO: 'Thêm gói giờ', SUA_GOI_GIO: 'Sửa gói giờ',
  TAO_TAI_KHOAN: 'Tạo tài khoản', SUA_TAI_KHOAN: 'Sửa tài khoản', PHAN_QUYEN: 'Phân quyền', KHOA_TAI_KHOAN: 'Khóa tài khoản', MO_KHOA: 'Mở khóa',
  KHOA_DAT_TRUC_TUYEN: 'Khóa đặt trực tuyến (tự động)', BAO_NGHI: 'HLV báo nghỉ', XU_LY_KHIEU_NAI: 'Xử lý khiếu nại',
};

const ganGon = (s) => {
  if (!s) return '';
  try {
    const o = JSON.parse(s);
    return typeof o === 'object' ? Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : String(o);
  } catch {
    return s;
  }
};

// Nhật ký thao tác quan trọng (NFR-08) – GET /quan-tri/nhat-ky, 50 dòng / trang
export default function NhatKyPage() {
  const { message } = App.useApp();
  const [hanhDong, setHanhDong] = useState(undefined);
  const [trang, setTrang] = useState(0);
  const [ds, setDs] = useState([]);
  const [dangTai, setDangTai] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setDs(await quanTriApi.nhatKy({ hanhDong, trang }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangTai(false);
    }
  }, [hanhDong, trang]);

  useEffect(() => {
    tai();
  }, [tai]);

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3}>Nhật ký thao tác</Typography.Title>
        <Space wrap>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Lọc theo hành động"
            style={{ width: 260 }}
            value={hanhDong}
            onChange={(v) => {
              setHanhDong(v);
              setTrang(0);
            }}
            options={Object.entries(HANH_DONG).map(([value, label]) => ({ value, label }))}
          />
          <Button icon={<LeftOutlined />} disabled={trang === 0} onClick={() => setTrang(trang - 1)} />
          <Typography.Text>Trang {trang + 1}</Typography.Text>
          <Button icon={<RightOutlined />} disabled={ds.length < 50} onClick={() => setTrang(trang + 1)} />
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={dangTai}
        dataSource={ds}
        pagination={false}
        columns={[
          { title: 'Thời gian', dataIndex: 'thoiGian', width: 150, render: ngayGio },
          { title: 'Người thực hiện', render: (_, n) => <>{n.nguoiThucHien} <Tag>{VAI_TRO[n.vaiTro]}</Tag></> },
          { title: 'Hành động', dataIndex: 'hanhDong', render: (v) => <Tag color="blue">{HANH_DONG[v] ?? v}</Tag> },
          { title: 'Đối tượng', render: (_, n) => `${n.doiTuong} #${n.doiTuongId}` },
          { title: 'Chi tiết', dataIndex: 'noiDung', ellipsis: { showTitle: true }, render: ganGon },
        ]}
      />
    </>
  );
}

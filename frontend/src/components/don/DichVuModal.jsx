import { useEffect, useState } from 'react';
import { Alert, App, InputNumber, Modal, Table, Tag } from 'antd';
import { dichVuApi } from '../../api/index.js';
import { LOAI_DICH_VU, ngayChoiCuaDon, tien } from '../../utils/format.js';

// UC04.1 Thuê thiết bị, UC04.2 Đặt đồ uống/dịch vụ (khách), UC04.3 Ghi nhận dịch vụ tại quầy (lễ tân)
export default function DichVuModal({ don, laNhanVien, onClose, onXong }) {
  const { message } = App.useApp();
  const giaoNgay = laNhanVien && don.trangThai === 'DANG_SU_DUNG'; // UC04.3: chỉ đơn đang chơi mới giao ngay
  const [ds, setDs] = useState([]);
  const [soLuong, setSoLuong] = useState({});
  const [dangTai, setDangTai] = useState(true);
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    dichVuApi
      .danhMuc({ ngay: ngayChoiCuaDon(don) })
      .then(setDs)
      .catch((e) => message.error(e.message))
      .finally(() => setDangTai(false));
  }, [don.maDon]);

  const items = Object.entries(soLuong).filter(([, v]) => v > 0).map(([id, v]) => ({ dichVuId: Number(id), soLuong: v }));
  const tong = items.reduce((s, it) => s + it.soLuong * (ds.find((d) => d.id === it.dichVuId)?.donGia ?? 0), 0);
  const coc = items.reduce((s, it) => {
    const d = ds.find((x) => x.id === it.dichVuId);
    return s + (d?.loai === 'THIET_BI' ? it.soLuong * d.tienCoc : 0);
  }, 0);

  const gui = async () => {
    setDangGui(true);
    try {
      await dichVuApi.themVaoDon(don.maDon, items);
      message.success(giaoNgay ? 'Đã ghi nhận dịch vụ và trừ kho' : 'Đã thêm dịch vụ vào đơn');
      onXong?.();
      onClose();
    } catch (e) {
      message.error(e.message);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Modal
      open
      width={720}
      title={giaoNgay ? `Ghi nhận dịch vụ tại quầy – đơn ${don.maDon}` : `Thêm dịch vụ cho đơn ${don.maDon}`}
      onCancel={onClose}
      okText={`Thêm (${tien(tong)})`}
      okButtonProps={{ disabled: !items.length, loading: dangGui }}
      onOk={gui}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          giaoNgay
            ? `Dịch vụ được giao ngay và trừ tồn kho. Thiết bị thu tiền cọc khi giao${coc ? `: ${tien(coc)}` : ''}, hoàn khi khách trả nguyên vẹn (QT-25).`
            : laNhanVien
              ? 'Đơn chưa đến giờ chơi: dịch vụ được giữ “Đã đặt” và giao khi khách check-in; tiền cọc thiết bị thu khi giao (QT-25).'
              : 'Thiết bị được giao khi bạn check-in; tiền cọc thu tại quầy và hoàn khi trả thiết bị (QT-25). Dịch vụ chưa giao có thể bỏ trước giờ chơi.'
        }
      />
      <Table
        size="small"
        rowKey="id"
        loading={dangTai}
        pagination={false}
        dataSource={ds}
        columns={[
          { title: 'Dịch vụ', dataIndex: 'tenDichVu' },
          { title: 'Loại', dataIndex: 'loai', render: (v) => <Tag>{LOAI_DICH_VU[v]}</Tag> },
          { title: 'Đơn giá', dataIndex: 'donGia', align: 'right', render: tien },
          { title: 'Cọc', dataIndex: 'tienCoc', align: 'right', render: (v, r) => (r.loai === 'THIET_BI' && v ? tien(v) : '—') },
          { title: 'Còn đặt được', dataIndex: 'soLuongCoTheDat', align: 'center' },
          {
            title: 'Số lượng',
            width: 110,
            render: (_, r) => (
              <InputNumber
                min={0}
                max={r.soLuongCoTheDat}
                disabled={!r.soLuongCoTheDat}
                value={soLuong[r.id] ?? 0}
                onChange={(v) => setSoLuong((x) => ({ ...x, [r.id]: Number(v) || 0 }))}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}

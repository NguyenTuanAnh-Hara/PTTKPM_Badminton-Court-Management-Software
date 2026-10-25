import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, App, Button, Card, Checkbox, Col, DatePicker, Divider, Empty, Input, InputNumber, Radio, Row, Segmented, Select, Space, Spin, Tag, Typography,
} from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { datSanApi, vanHanhApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { GioDatSanProvider, useGioDatSan } from '../../context/GioDatSanContext.jsx';
import LuoiLichSan, { ChuThichLuoi } from '../../components/LuoiLichSan.jsx';
import ChiTietDon from '../../components/ChiTietDon.jsx';
import { LOAI_NGAY, THU, homNay, tien } from '../../utils/format.js';

const SO_KHUNG_TOI_DA = 4; // QT-01

// UC02.1 Xem lịch sân trống + UC02.2 Đặt sân. cheDoNhanVien: lễ tân đặt hộ (khách gọi điện / tại quầy)
export default function DatSanPage({ cheDoNhanVien = false }) {
  return (
    <GioDatSanProvider>
      <NoiDungDatSan cheDoNhanVien={cheDoNhanVien} />
    </GioDatSanProvider>
  );
}

function NoiDungDatSan({ cheDoNhanVien }) {
  const { message } = App.useApp();
  const nav = useNavigate();
  const { user } = useAuth();
  const { ngay, doiNgay, chon, daChon, batTat, xoaHet } = useGioDatSan();
  const [lich, setLich] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [dsLoaiSan, setDsLoaiSan] = useState([]);
  const [loaiSan, setLoaiSan] = useState(null);
  const [dinhKy, setDinhKy] = useState(false);
  const [soBuoi, setSoBuoi] = useState(4);
  const [dangDat, setDangDat] = useState(false);
  const [maDonXem, setMaDonXem] = useState(null);
  // Lễ tân: thông tin khách
  const [kieuKhach, setKieuKhach] = useState('TAI_KHOAN');
  const [khachChon, setKhachChon] = useState(null);
  const [dsKhach, setDsKhach] = useState([]);
  const [hoTenKhach, setHoTenKhach] = useState('');
  const [sdtKhach, setSdtKhach] = useState('');
  const [taiQuay, setTaiQuay] = useState(false);
  const timKhachHen = useRef(null);

  const ngayChon = ngay ?? homNay();
  const soNgayToiDa = cheDoNhanVien ? 30 : 6;
  const laKhach = user?.vaiTro === 'KHACH_HANG';
  const duocDat = cheDoNhanVien || !user || laKhach;
  const biKhoa = laKhach && user.trangThai === 'KHOA_DAT_TRUC_TUYEN';
  const phanTramHang = laKhach ? user.khachHang?.hang?.phanTramGiam ?? 0 : 0;

  useEffect(() => {
    if (!ngay) doiNgay(homNay());
    datSanApi.dsSan().then((ds) => setDsLoaiSan([...new Set(ds.map((s) => s.loaiSan).filter(Boolean))])).catch(() => {});
  }, []);

  const taiLich = useCallback(
    async (imLang = false) => {
      if (!imLang) setDangTai(true);
      try {
        const r = await datSanApi.lichSan(ngayChon, loaiSan);
        setLich(r);
      } catch (e) {
        if (!imLang) message.error(e.message);
      } finally {
        if (!imLang) setDangTai(false);
      }
    },
    [ngayChon, loaiSan],
  );

  useEffect(() => {
    taiLich();
    const t = setInterval(() => taiLich(true), 60000); // làm mới lịch mỗi phút
    return () => clearInterval(t);
  }, [taiLich]);

  // Ô đang chọn mà vừa bị người khác đặt thì bỏ khỏi lựa chọn
  useEffect(() => {
    if (!lich) return;
    for (const o of chon) {
      const s = lich.san.find((x) => x.id === o.sanId);
      const oLich = s?.o.find((x) => x.khungGioId === o.khungGioId);
      if (!oLich || oLich.trangThai !== 'TRONG') {
        batTat(o.sanId, o.khungGioId);
        message.warning(`${s?.tenSan ?? 'Sân'} khung ${lich.khungGio.find((k) => k.id === o.khungGioId)?.gioBatDau} vừa có người đặt`);
      }
    }
  }, [lich]);

  const khungTheoId = useMemo(() => new Map((lich?.khungGio ?? []).map((k) => [k.id, k])), [lich]);

  // Gom lựa chọn theo sân để hiển thị và kiểm tra QT-01
  const theoSan = useMemo(() => {
    const m = new Map();
    for (const o of chon) {
      if (!m.has(o.sanId)) m.set(o.sanId, []);
      m.get(o.sanId).push(o.khungGioId);
    }
    return [...m.entries()].map(([sanId, ids]) => {
      ids.sort((a, b) => a - b);
      const lienTiep = ids.every((id, i) => i === 0 || id === ids[i - 1] + 1);
      const san = lich?.san.find((s) => s.id === sanId);
      return {
        sanId,
        tenSan: san?.tenSan ?? `Sân ${sanId}`,
        ids,
        lienTiep,
        tien: ids.reduce((s, id) => s + (khungTheoId.get(id)?.donGia ?? 0), 0),
      };
    });
  }, [chon, lich, khungTheoId]);

  const tienSan = theoSan.reduce((s, x) => s + x.tien, 0);
  const giamHang = Math.floor((tienSan * phanTramHang) / 100);
  const soBuoiThat = dinhKy ? soBuoi : 1;
  const loiChon = [
    ...theoSan.filter((x) => x.ids.length > SO_KHUNG_TOI_DA).map((x) => `${x.tenSan}: tối đa ${SO_KHUNG_TOI_DA} khung liên tiếp`),
    ...theoSan.filter((x) => !x.lienTiep).map((x) => `${x.tenSan}: các khung phải liền nhau`),
    ...(dinhKy && theoSan.length > 1 ? ['Lịch định kỳ chỉ đặt trên một sân'] : []),
  ];

  const chonO = (sanId, khungGioId) => {
    if (!duocDat) return;
    const dangCo = chon.filter((o) => o.sanId === sanId).length;
    if (!daChon(sanId, khungGioId) && dangCo >= SO_KHUNG_TOI_DA) {
      message.warning(`Mỗi sân chỉ đặt tối đa ${SO_KHUNG_TOI_DA} khung liên tiếp (QT-01)`);
      return;
    }
    batTat(sanId, khungGioId);
  };

  const timKhach = (q) => {
    clearTimeout(timKhachHen.current);
    if (!q || q.length < 3) return;
    timKhachHen.current = setTimeout(() => {
      vanHanhApi.timKhach(q).then(setDsKhach).catch(() => setDsKhach([]));
    }, 300);
  };

  const datSan = async () => {
    if (!user) {
      nav('/dang-nhap', { state: { tu: '/' } });
      return;
    }
    const body = { ngayChoi: ngayChon, danhSach: chon };
    if (dinhKy) body.dinhKy = { soBuoi };
    if (cheDoNhanVien) {
      if (kieuKhach === 'TAI_KHOAN') {
        if (!khachChon) return message.warning('Chọn tài khoản khách');
        body.khachHangId = khachChon;
      } else {
        if (!hoTenKhach.trim() || !/^0\d{9}$/.test(sdtKhach)) return message.warning('Nhập họ tên và số điện thoại (10 số) của khách');
        body.hoTenKhach = hoTenKhach.trim();
        body.sdtKhach = sdtKhach;
      }
      body.taiQuay = taiQuay;
    }
    setDangDat(true);
    try {
      const r = await datSanApi.datSan(body);
      xoaHet();
      setDinhKy(false);
      taiLich(true);
      if (cheDoNhanVien) {
        message.success(`Đã tạo đơn ${r.don.maDon}${r.soBuoi > 1 ? ` và ${r.soBuoi - 1} buổi định kỳ` : ''}`);
        setMaDonXem(r.don.maDon);
      } else {
        message.success(`Đã giữ chỗ đơn ${r.don.maDon}. Vui lòng thanh toán để xác nhận.`);
        nav(`/thanh-toan/${r.don.maDon}`);
      }
    } catch (e) {
      message.error(e.message);
      if (e.code === 'TRUNG_LICH') taiLich(true);
    } finally {
      setDangDat(false);
    }
  };

  const dsNgayNhanh = Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return { value: d.format('YYYY-MM-DD'), label: i === 0 ? 'Hôm nay' : `${THU[d.day()].replace('Thứ ', 'T').replace('Chủ nhật', 'CN')} ${d.format('DD/MM')}` };
  });

  return (
    <>
      <div className="tieu-de-trang">
        <Typography.Title level={3} style={{ margin: 0 }}>{cheDoNhanVien ? 'Lịch sân / đặt hộ khách' : duocDat ? 'Đặt sân' : 'Lịch sân'}</Typography.Title>
        <Space wrap>
          <Select
            allowClear
            placeholder="Tất cả loại sân"
            style={{ width: 220 }}
            value={loaiSan}
            onChange={(v) => setLoaiSan(v ?? null)}
            options={dsLoaiSan.map((l) => ({ value: l, label: l }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => taiLich()}>Làm mới</Button>
        </Space>
      </div>

      {biKhoa && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Tài khoản đang bị khóa đặt sân trực tuyến"
          description="Bạn đã không đến 3 lần trong 30 ngày (QT-18). Vui lòng đặt trực tiếp tại quầy hoặc liên hệ quản lý để mở khóa."
        />
      )}

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Segmented value={dsNgayNhanh.some((d) => d.value === ngayChon) ? ngayChon : undefined} options={dsNgayNhanh} onChange={doiNgay} />
          <DatePicker
            value={dayjs(ngayChon)}
            format="DD/MM/YYYY"
            allowClear={false}
            onChange={(d) => d && doiNgay(d.format('YYYY-MM-DD'))}
            disabledDate={(d) => d.isBefore(dayjs(), 'day') || d.isAfter(dayjs().add(soNgayToiDa, 'day'), 'day')}
          />
          {lich && <Tag color={lich.loaiNgay === 'NGAY_THUONG' ? 'default' : 'magenta'}>{LOAI_NGAY[lich.loaiNgay]}</Tag>}
          <Typography.Text type="secondary">
            Bấm vào ô trống để chọn khung 60 phút · giá hiển thị theo nghìn đồng/khung
          </Typography.Text>
        </Space>
      </Card>

      <Row gutter={16}>
        <Col xs={24} xl={duocDat ? 17 : 24}>
          <ChuThichLuoi cheDoNhanVien={cheDoNhanVien} />
          <Spin spinning={dangTai}>
            <LuoiLichSan lich={lich} laChon={daChon} onBatTat={duocDat && !biKhoa ? chonO : undefined} onXemDon={setMaDonXem} cheDoNhanVien={cheDoNhanVien} />
          </Spin>
          {cheDoNhanVien && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Bấm vào ô đã đặt để xem / xử lý đơn.</Typography.Text>}
        </Col>

        {duocDat && (
          <Col xs={24} xl={7}>
            <Card title="Khung đã chọn" size="small" className="khung-dat" extra={chon.length > 0 && <Button size="small" type="link" icon={<DeleteOutlined />} onClick={xoaHet}>Bỏ chọn</Button>}>
              {!chon.length ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chọn khung giờ nào" />
              ) : (
                <>
                  <Typography.Text type="secondary">{dayjs(ngayChon).format('dddd, DD/MM/YYYY')}</Typography.Text>
                  {theoSan.map((x) => (
                    <div key={x.sanId} className="dong-chon">
                      <div>
                        <b>{x.tenSan}</b>
                        <div style={{ fontSize: 12, color: '#595959' }}>
                          {x.ids.map((id) => khungTheoId.get(id)).filter(Boolean).map((k) => `${k.gioBatDau}–${k.gioKetThuc}`).join(', ')}
                        </div>
                      </div>
                      <span>{tien(x.tien)}</span>
                    </div>
                  ))}
                  {loiChon.map((l) => (
                    <Alert key={l} type="warning" message={l} style={{ marginTop: 8 }} showIcon />
                  ))}

                  {(!cheDoNhanVien || kieuKhach === 'TAI_KHOAN') && (
                    <div style={{ marginTop: 12 }}>
                      <Checkbox checked={dinhKy} onChange={(e) => setDinhKy(e.target.checked)}>Đặt định kỳ hằng tuần</Checkbox>
                      {dinhKy && (
                        <div style={{ marginTop: 6 }}>
                          <Space>
                            <InputNumber min={4} max={12} value={soBuoi} onChange={(v) => setSoBuoi(v || 4)} addonAfter="buổi" style={{ width: 130 }} />
                            <Typography.Text type="secondary">vào {THU[dayjs(ngayChon).day()]}</Typography.Text>
                          </Space>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                            Buổi đầu thanh toán trong thời gian giữ chỗ; mỗi buổi sau thanh toán trước giờ chơi 24 giờ (QT-05).
                            Các ngày: {Array.from({ length: soBuoi }, (_, i) => dayjs(ngayChon).add(i * 7, 'day').format('DD/MM')).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Divider style={{ margin: '12px 0' }} />
                  <div className="dong-tien"><span>Tiền sân{soBuoiThat > 1 ? ' / buổi' : ''}</span><span>{tien(tienSan)}</span></div>
                  {giamHang > 0 && (
                    <div className="dong-tien"><span>Ưu đãi hạng {user.khachHang.hang.tenGoi} ({phanTramHang}%)</span><span style={{ color: '#cf1322' }}>− {tien(giamHang)}</span></div>
                  )}
                  <div className="dong-tien tong">
                    <span>Tạm tính{soBuoiThat > 1 ? ` (${soBuoiThat} buổi)` : ''}</span>
                    <span>{tien((tienSan - giamHang) * soBuoiThat)}</span>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mã giảm giá, điểm thưởng, gói giờ được áp dụng ở bước thanh toán.</Typography.Text>
                </>
              )}

              {cheDoNhanVien && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Typography.Text strong>Khách đặt</Typography.Text>
                  <Radio.Group value={kieuKhach} onChange={(e) => setKieuKhach(e.target.value)} style={{ display: 'block', margin: '6px 0' }}>
                    <Radio value="TAI_KHOAN">Có tài khoản</Radio>
                    <Radio value="VANG_LAI">Khách vãng lai</Radio>
                  </Radio.Group>
                  {kieuKhach === 'TAI_KHOAN' ? (
                    <Select
                      showSearch
                      allowClear
                      style={{ width: '100%' }}
                      placeholder="Tìm theo SĐT, tên hoặc email (≥ 3 ký tự)"
                      filterOption={false}
                      onSearch={timKhach}
                      value={khachChon}
                      onChange={setKhachChon}
                      notFoundContent={null}
                      options={dsKhach.map((k) => ({
                        value: k.id,
                        label: `${k.hoTen} – ${k.soDienThoai}${k.trangThai !== 'HOAT_DONG' ? ' (bị khóa đặt online)' : ''}`,
                      }))}
                    />
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Input placeholder="Họ tên khách" value={hoTenKhach} onChange={(e) => setHoTenKhach(e.target.value)} />
                      <Input placeholder="Số điện thoại" maxLength={10} value={sdtKhach} onChange={(e) => setSdtKhach(e.target.value.replace(/\D/g, ''))} />
                    </Space>
                  )}
                  <Checkbox checked={taiQuay} onChange={(e) => setTaiQuay(e.target.checked)} style={{ marginTop: 8 }}>
                    Khách đang ở quầy, thanh toán ngay
                  </Checkbox>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {taiQuay ? 'Giữ chỗ 10 phút để thu tiền.' : 'Khách gọi điện: giữ chỗ 30 phút (QT-04).'}
                  </div>
                </>
              )}

              <Button
                type="primary"
                block
                size="large"
                style={{ marginTop: 14 }}
                disabled={!chon.length || loiChon.length > 0 || biKhoa}
                loading={dangDat}
                onClick={datSan}
              >
                {!user ? 'Đăng nhập để đặt sân' : cheDoNhanVien ? 'Tạo đơn cho khách' : 'Đặt sân & giữ chỗ'}
              </Button>
              {!cheDoNhanVien && (
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                  Đơn được giữ chỗ 10 phút để thanh toán. Mỗi tài khoản có tối đa 2 đơn chờ thanh toán (QT-03, QT-04).
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>

      {cheDoNhanVien && (
        <ChiTietDon maDon={maDonXem} open={Boolean(maDonXem)} onClose={() => setMaDonXem(null)} onThayDoi={() => taiLich(true)} cheDoNhanVien />
      )}
    </>
  );
}

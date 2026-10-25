// Xử lý ngày giờ theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè).
// Quy ước lưu trữ: cột DATE lưu nửa đêm UTC của ngày 'YYYY-MM-DD'; cột TIME lưu 1970-01-01THH:MM:00Z;
// cột DATETIME lưu thời điểm tuyệt đối (UTC).
const LECH_GIO = 7 * 60 * 60 * 1000;
const MOT_NGAY = 24 * 60 * 60 * 1000;

export const bayGio = () => new Date();

/** Ngày địa phương 'YYYY-MM-DD' của một thời điểm */
export const ngayCua = (thoiDiem = new Date()) => new Date(thoiDiem.getTime() + LECH_GIO).toISOString().slice(0, 10);

/** Giờ địa phương 'HH:MM' của một thời điểm */
export const gioCua = (thoiDiem = new Date()) => new Date(thoiDiem.getTime() + LECH_GIO).toISOString().slice(11, 16);

export const homNay = () => ngayCua(new Date());

/** 'YYYY-MM-DD' → giá trị lưu vào cột DATE */
export const sangNgayDb = (ngay) => new Date(`${ngay}T00:00:00.000Z`);

/** 'HH:MM' → giá trị lưu vào cột TIME */
export const sangGioDb = (gio) => new Date(`1970-01-01T${gio.length === 5 ? gio : gio.slice(0, 5)}:00.000Z`);

/** Giá trị cột DATE → 'YYYY-MM-DD' */
export const chuoiNgay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Giá trị cột TIME → 'HH:MM' */
export const chuoiGio = (t) => (t ? new Date(t).toISOString().slice(11, 16) : null);

/** Ngày 'YYYY-MM-DD' + giờ 'HH:MM' (giờ Việt Nam) → thời điểm tuyệt đối */
export const thoiDiem = (ngay, gio) => new Date(`${ngay}T${gio}:00+07:00`);

export const congNgay = (ngay, soNgay) => new Date(sangNgayDb(ngay).getTime() + soNgay * MOT_NGAY).toISOString().slice(0, 10);

export const congPhut = (d, phut) => new Date(d.getTime() + phut * 60 * 1000);

/** Số ngày từ ngày a tới ngày b */
export const soNgayGiua = (a, b) => Math.round((sangNgayDb(b) - sangNgayDb(a)) / MOT_NGAY);

/** 0 = Chủ nhật … 6 = thứ Bảy */
export const thuCuaNgay = (ngay) => sangNgayDb(ngay).getUTCDay();

/** Thứ theo cách gọi Việt Nam: 2 … 7, Chủ nhật = 8 (cột lich_dinh_ky.thu_trong_tuan) */
export const thuVietNam = (ngay) => {
  const t = thuCuaNgay(ngay);
  return t === 0 ? 8 : t + 1;
};

/** 'HH:MM' → số phút từ 00:00 */
export const phutCua = (gio) => {
  const [h, m] = gio.split(':').map(Number);
  return h * 60 + m;
};

export const laNgayHopLe = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(sangNgayDb(s).getTime());

/** Thời điểm theo định dạng yyyyMMddHHmmss giờ Việt Nam (dùng cho VNPAY) */
export const dinhDangVnpay = (d = new Date()) =>
  new Date(d.getTime() + LECH_GIO).toISOString().replace(/[-:T]/g, '').slice(0, 14);

export const hienThiThoiDiem = (d) => (d ? `${gioCua(d)} ${ngayCua(d).split('-').reverse().join('/')}` : '');
export const hienThiNgay = (ngay) => (ngay ? ngay.split('-').reverse().join('/') : '');

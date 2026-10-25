// LichTuDongScheduler – cài đặt tác nhân Bộ hẹn giờ «Timer» bằng node-cron (Bảng 4.17)
import cron from 'node-cron';
import * as datSan from '../services/datSanService.js';
import { notificationSender } from '../agents/notificationSender.js';

const chay = (ten, fn) => async () => {
  try {
    const n = await fn();
    if (n) console.log(`[Bộ hẹn giờ] ${ten}: ${n}`);
  } catch (e) {
    console.error(`[Bộ hẹn giờ] ${ten} lỗi:`, e);
  }
};

export function khoiDongLichTuDong() {
  const tz = { timezone: 'Asia/Ho_Chi_Minh' };
  cron.schedule('* * * * *', chay('Hủy đơn quá hạn giữ chỗ (UC02.6)', datSan.huyDonQuaHan), tz);
  cron.schedule('*/5 * * * *', chay('Ghi nhận không đến (UC01.6)', datSan.ghiNhanKhongDen), tz);
  cron.schedule('*/5 * * * *', chay('Hoàn thành buổi chơi, tích điểm (UC01.5)', datSan.hoanThanhBuoiChoi), tz);
  cron.schedule('*/2 * * * *', chay('Gửi lại thông báo (NFR-12)', () => notificationSender.guiLaiThatBai()), tz);
  cron.schedule('5 0 * * *', chay('Rà soát khóa tài khoản (QT-18)', datSan.kiemTraKhoaTatCa), tz);
  console.log('Bộ hẹn giờ đã khởi động');
}

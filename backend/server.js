// Điểm khởi động backend: nạp .env, mở cổng HTTP, chạy Bộ hẹn giờ
import 'dotenv/config';
import { taoUngDung } from './src/app.js';
import { khoiDongLichTuDong } from './src/jobs/lichTuDong.js';

const port = Number(process.env.PORT) || 3000;
taoUngDung().listen(port, () => {
  console.log(`Backend đang chạy tại http://localhost:${port}/api/v1`);
  if (process.env.TAT_BO_HEN_GIO !== '1') khoiDongLichTuDong();
});

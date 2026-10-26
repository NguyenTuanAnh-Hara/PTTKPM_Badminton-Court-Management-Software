// Ứng dụng Express: phiên đăng nhập, đọc người dùng, các route /api/v1, xử lý lỗi
import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { docNguoiDung } from './middlewares/auth.js';
import { xuLyLoi } from './middlewares/xuLyLoi.js';
import routes from './routes/index.js';

const MySQLStore = MySQLStoreFactory(session);

function cauHinhCsdl() {
  const u = new URL(process.env.DATABASE_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

const SECRET_MAU = ['', 'doi-chuoi-nay', 'doi-chuoi-nay-thanh-chuoi-ngau-nhien'];

function laySessionSecret() {
  const s = process.env.SESSION_SECRET ?? '';
  if (process.env.NODE_ENV === 'production' && (SECRET_MAU.includes(s) || s.length < 32)) {
    throw new Error('SESSION_SECRET phải là chuỗi ngẫu nhiên ≥ 32 ký tự khi chạy production');
  }
  return s || 'doi-chuoi-nay';
}

export function taoUngDung() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Phiên đăng nhập lưu trong MySQL (bảng sessions do thư viện tự tạo); trình duyệt chỉ giữ cookie HttpOnly
  app.use(
    session({
      name: 'scl.sid',
      secret: laySessionSecret(),
      store: new MySQLStore({ ...cauHinhCsdl(), clearExpired: true, createDatabaseTable: true }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(docNguoiDung);
  app.use('/api/v1', routes);
  app.use('/api', (req, res) => res.status(404).json({ code: 'KHONG_TIM_THAY', message: 'API không tồn tại' }));
  app.use(xuLyLoi);
  return app;
}

import { validationResult } from 'express-validator';
import { loi } from '../utils/errors.js';

/** Chạy các luật express-validator rồi trả lỗi 400 kèm danh sách trường sai */
export const kiemTraDuLieu = (luat) => [
  ...luat,
  (req, res, next) => {
    const kq = validationResult(req);
    if (kq.isEmpty()) return next();
    const details = kq.array().map((e) => ({ truong: e.path, loi: e.msg }));
    next(loi.duLieu(details[0].loi, details));
  },
];

import crypto from 'node:crypto';
import { ngayCua } from './thoiGian.js';

const KY_TU = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const chuoiNgauNhien = (doDai) => {
  const bytes = crypto.randomBytes(doDai);
  return Array.from(bytes, (b) => KY_TU[b % KY_TU.length]).join('');
};

/** Mã có dạng TIỀN TỐ + yyMMdd + 4 ký tự ngẫu nhiên, ví dụ DS2610264K7Q */
export const taoMa = (tienTo) => `${tienTo}${ngayCua().slice(2).replace(/-/g, '')}${chuoiNgauNhien(4)}`;

export const taoOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

export const taoMatKhauTam = () => `${chuoiNgauNhien(6)}${crypto.randomInt(10, 99)}`;

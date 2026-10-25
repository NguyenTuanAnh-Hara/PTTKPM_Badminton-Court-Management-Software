// Tiền lưu kiểu DECIMAL(12,0) → Prisma trả về Decimal; chuyển sang số nguyên đồng để tính
export const soTien = (v) => (v === null || v === undefined ? 0 : Math.round(Number(v)));

/** Làm tròn xuống đến hàng nghìn đồng (QT-10) */
export const lamTronNghin = (v) => Math.floor(Math.max(0, v) / 1000) * 1000;

export const dinhDangTien = (v) => `${soTien(v).toLocaleString('vi-VN')} đ`;

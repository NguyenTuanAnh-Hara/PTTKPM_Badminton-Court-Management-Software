import prisma from '../config/prisma.js';

let cache = null;

// Danh mục 18 khung giờ cố định 05:00 → 23:00, đọc một lần rồi giữ trong bộ nhớ
export const khungGioRepository = {
  async findAll(db = prisma) {
    if (!cache) cache = await db.khungGio.findMany({ orderBy: { id: 'asc' } });
    return cache;
  },
};

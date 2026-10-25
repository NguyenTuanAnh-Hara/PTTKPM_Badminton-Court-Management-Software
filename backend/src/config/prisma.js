import { PrismaClient } from '@prisma/client';

// Một Prisma Client dùng chung cho toàn bộ ứng dụng
const prisma = new PrismaClient();

export default prisma;

// NotificationSender – mọi thông báo đi qua hàng đợi thong_bao để có thể gửi lại khi lỗi (NFR-12)
import prisma from '../config/prisma.js';
import thamSo from '../config/thamSo.js';
import { guiEmail } from './emailSender.js';

const TIEU_DE = 'Thông báo từ hệ thống quản lý sân cầu lông';

async function thuGui(tb) {
  try {
    await guiEmail({ den: tb.diaChiNhan, tieuDe: TIEU_DE, noiDung: tb.noiDung });
    await prisma.thongBao.update({ where: { id: tb.id }, data: { daGui: true, soLanThu: { increment: 1 } } });
  } catch (e) {
    console.warn('Gửi thông báo thất bại, sẽ gửi lại sau:', e.message);
    await prisma.thongBao.update({ where: { id: tb.id }, data: { soLanThu: { increment: 1 } } });
  }
}

export const notificationSender = {
  /**
   * Đưa thông báo vào hàng đợi rồi thử gửi ngay, không chờ kết quả.
   * Gọi SAU khi giao dịch CSDL đã ghi xong để không gửi thông báo cho thao tác bị hoàn tác.
   */
  async gui({ nguoiNhanId = null, diaChi, noiDung }) {
    if (!diaChi) return;
    const tb = await prisma.thongBao.create({
      data: { nguoiNhanId, diaChiNhan: diaChi, kenh: diaChi.includes('@') ? 'EMAIL' : 'SMS', noiDung },
    });
    if (tb.kenh === 'EMAIL') thuGui(tb);
    else {
      // Chưa tích hợp nhà cung cấp SMS: ghi nhận đã gửi để không thử lại
      console.log(`\n[SMS giả lập] Đến: ${diaChi}\n${noiDung}\n`);
      await prisma.thongBao.update({ where: { id: tb.id }, data: { daGui: true, soLanThu: 1 } });
    }
  },

  /** Gửi cho người dùng có tài khoản (email của tài khoản) */
  async guiNguoiDung(nguoiDungId, noiDung) {
    const u = await prisma.nguoiDung.findUnique({ where: { id: nguoiDungId }, select: { email: true } });
    if (u) await this.gui({ nguoiNhanId: nguoiDungId, diaChi: u.email, noiDung });
  },

  /** Gửi cho khách của đơn: tài khoản → email; khách vãng lai → SĐT */
  async guiKhachCuaDon(don, noiDung) {
    if (don.khachHangId) return this.guiNguoiDung(don.khachHangId, noiDung);
    if (don.sdtKhach) return this.gui({ diaChi: don.sdtKhach, noiDung });
  },

  /** Bộ hẹn giờ gọi định kỳ: gửi lại các thông báo lỗi (tối đa 5 lần) */
  async guiLaiThatBai() {
    const ds = await prisma.thongBao.findMany({
      where: { daGui: false, soLanThu: { lt: thamSo.SO_LAN_GUI_LAI_TOI_DA } },
      take: 50,
    });
    for (const tb of ds) await thuGui(tb);
    return ds.length;
  },
};

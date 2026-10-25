// EmailSender – gửi email qua Gmail SMTP bằng nodemailer.
// Chưa cấu hình EMAIL_USER thì in nội dung ra console để chạy thử.
import nodemailer from 'nodemailer';

let transporter = null;
const coCauHinh = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

function layTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function guiEmail({ den, tieuDe, noiDung }) {
  if (!coCauHinh()) {
    console.log(`\n[EMAIL giả lập] Đến: ${den}\nTiêu đề: ${tieuDe}\n${noiDung}\n`);
    return;
  }
  await layTransporter().sendMail({
    from: `"Sân cầu lông" <${process.env.EMAIL_USER}>`,
    to: den,
    subject: tieuDe,
    text: noiDung,
  });
}

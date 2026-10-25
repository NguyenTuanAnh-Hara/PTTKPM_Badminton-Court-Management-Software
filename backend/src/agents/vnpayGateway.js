// VnpayGateway – cài đặt PaymentGateway cho VNPAY (chữ ký HMAC-SHA512 bằng module crypto của Node.js).
// VNPAY_MODE=mock: giả lập cổng thanh toán để chạy thử, không cần tài khoản sandbox.
import crypto from 'node:crypto';
import { PaymentGateway } from './paymentGateway.js';
import { dinhDangVnpay } from '../utils/thoiGian.js';

/** Sắp xếp tham số theo tên và mã hóa giống thư viện mẫu của VNPAY */
function chuoiKy(params) {
  return Object.keys(params)
    .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== '' && params[k] !== undefined)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`)
    .join('&');
}

export class VnpayGateway extends PaymentGateway {
  constructor(cauHinh = {}) {
    super();
    this.mode = cauHinh.mode ?? process.env.VNPAY_MODE ?? 'mock';
    this.tmnCode = cauHinh.tmnCode ?? process.env.VNPAY_TMN_CODE ?? 'GIALAP01';
    this.hashSecret = cauHinh.hashSecret ?? process.env.VNPAY_HASH_SECRET ?? 'chuoi-bi-mat-gia-lap';
    this.url = cauHinh.url ?? process.env.VNPAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  }

  get laGiaLap() {
    return this.mode !== 'sandbox';
  }

  ky(params) {
    return crypto.createHmac('sha512', this.hashSecret).update(Buffer.from(chuoiKy(params), 'utf-8')).digest('hex');
  }

  /** Mã tham chiếu gửi sang cổng: TT + mã giao dịch nội bộ */
  static maThamChieu(thanhToanId) {
    return `TT${thanhToanId}`;
  }

  static idTuMaThamChieu(txnRef) {
    const m = /^TT(\d+)$/.exec(String(txnRef ?? ''));
    return m ? Number(m[1]) : null;
  }

  taoUrlThanhToan(thanhToan, { noiDung, ip = '127.0.0.1', hetHanLuc }) {
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: Math.round(Number(thanhToan.soTien)) * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: VnpayGateway.maThamChieu(thanhToan.id),
      vnp_OrderInfo: noiDung,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: `${this.frontendUrl}/thanh-toan/ket-qua`,
      vnp_IpAddr: ip,
      vnp_CreateDate: dinhDangVnpay(new Date()),
    };
    if (hetHanLuc) params.vnp_ExpireDate = dinhDangVnpay(hetHanLuc);
    if (this.laGiaLap) {
      const q = new URLSearchParams({ txnRef: params.vnp_TxnRef, soTien: String(Number(thanhToan.soTien)), noiDung });
      return `${this.frontendUrl}/thanh-toan/gia-lap?${q}`;
    }
    const query = chuoiKy(params);
    return `${this.url}?${query}&vnp_SecureHash=${this.ky(params)}`;
  }

  xacMinhChuKy(params) {
    const hash = String(params.vnp_SecureHash ?? '').toLowerCase();
    return hash.length > 0 && hash === this.ky(params);
  }

  /** Chỉ dùng ở chế độ giả lập: tạo bộ tham số kết quả có chữ ký như VNPAY gửi về */
  taoKetQuaGiaLap({ txnRef, soTien, thanhCong }) {
    const params = {
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: Math.round(Number(soTien)) * 100,
      vnp_BankCode: 'NCB',
      vnp_OrderInfo: 'Thanh toan gia lap',
      vnp_PayDate: dinhDangVnpay(new Date()),
      vnp_ResponseCode: thanhCong ? '00' : '24',
      vnp_TransactionNo: String(Date.now()).slice(-8) + crypto.randomInt(100, 999),
      vnp_TransactionStatus: thanhCong ? '00' : '02',
      vnp_TxnRef: txnRef,
    };
    return { ...params, vnp_SecureHash: this.ky(params) };
  }

  // Hoàn tiền: chế độ giả lập coi như thành công. Với sandbox, nhóm hoàn trên trang quản trị merchant
  // của VNPAY và đối soát lại (API hoàn tiền của VNPAY yêu cầu đăng ký riêng).
  async hoanTien(thanhToanGoc, soTien) {
    return {
      thanhCong: true,
      ghiChu: this.laGiaLap
        ? `Giả lập hoàn ${soTien} đ`
        : `Hoàn ${soTien} đ cho giao dịch ${thanhToanGoc.maGiaoDichCong ?? thanhToanGoc.id} – đối soát trên cổng VNPAY`,
    };
  }
}

export const vnpayGateway = new VnpayGateway();

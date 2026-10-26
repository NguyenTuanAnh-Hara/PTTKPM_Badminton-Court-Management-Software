// ThanhToanController – phân hệ UC03 (Hình 4.8), gồm điểm nhận IPN từ VNPAY
import * as thanhToan from '../services/thanhToanService.js';

export const ThanhToanController = {
  tinhTien: async (req, res) => res.json(await thanhToan.tinhTien(req.user, req.body)),
  taoThanhToan: async (req, res) => res.status(201).json(await thanhToan.taoYeuCau(req.user, req.body, req.ip)),
  thuTaiQuay: async (req, res) => res.status(201).json(await thanhToan.thuTaiQuay(req.user, req.body)),
  banTaiQuay: async (req, res) => res.status(201).json(await thanhToan.banTaiQuay(req.user, req.body)),
  /** VNPAY gọi – trả đúng định dạng { RspCode, Message } */
  nhanIpn: async (req, res) => {
    const kq = await thanhToan.xuLyKetQua(req.query);
    res.json({ RspCode: kq.RspCode, Message: kq.Message });
  },
  ketQuaTrinhDuyet: async (req, res) => res.json(await thanhToan.ketQuaChoTrinhDuyet(req.query)),
  giaLap: async (req, res) => res.json(await thanhToan.giaLapKetQua(req.user, req.query.txnRef, req.query.ketQua === 'thanh-cong')),
  layHoaDon: async (req, res) => res.json(await thanhToan.layHoaDon(req.user, req.params.maHoaDon)),
};

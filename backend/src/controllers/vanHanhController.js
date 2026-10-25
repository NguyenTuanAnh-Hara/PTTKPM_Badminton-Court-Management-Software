// VanHanhController – phân hệ UC05
import * as vanHanh from '../services/vanHanhService.js';

export const VanHanhController = {
  tinhTrangSan: async (req, res) => res.json(await vanHanh.tinhTrangSan()),
  traCuu: async (req, res) => res.json(await vanHanh.traCuuDonHomNay(req.query.q)),
  timKhach: async (req, res) => res.json(await vanHanh.timKhach(req.query.q)),
  checkIn: async (req, res) => res.json(await vanHanh.checkIn(req.user, req.body.maDon)),
  giaoThietBi: async (req, res) => res.json(await vanHanh.giaoDichVu(req.user, req.body.chiTietDichVuId)),
  nhanThietBi: async (req, res) => res.json(await vanHanh.nhanThietBi(req.user, req.body.chiTietDichVuId, req.body)),
  ghiNhanSuCo: async (req, res) => res.status(201).json(await vanHanh.ghiNhanSuCo(req.user, req.body)),
  dsSuCo: async (req, res) => res.json(await vanHanh.dsSuCo(req.query)),
  lichAnhHuong: async (req, res) => {
    const den = req.query.denLuc ? new Date(req.query.denLuc) : new Date(Date.now() + 24 * 3600000);
    res.json(await vanHanh.dsLichAnhHuong(req.params.sanId, den));
  },
  xuLyDonSuCo: async (req, res) => res.json(await vanHanh.xuLyDonBiAnhHuong(req.user, req.body)),
  khacPhuc: async (req, res) => res.json(await vanHanh.khacPhucSuCo(req.user, req.params.id)),
};

// QuanTriController – phân hệ UC06 và quản lý khiếu nại (UC08.2)
import * as qt from '../services/quanTriService.js';
import * as phanHoi from '../services/phanHoiService.js';

export const QuanTriController = {
  dsSan: async (req, res) => res.json(await qt.dsSan()),
  taoSan: async (req, res) => res.status(201).json(await qt.taoSan(req.user, req.body)),
  capNhatSan: async (req, res) => res.json(await qt.capNhatSan(req.user, req.params.id, req.body)),
  bangGia: async (req, res) => res.json(await qt.bangGiaHienHanh()),
  luuBangGia: async (req, res) => res.json(await qt.luuBangGia(req.user, req.body)),
  themNgayLe: async (req, res) => res.status(201).json(await qt.themNgayLe(req.user, req.body)),
  xoaNgayLe: async (req, res) => res.json(await qt.xoaNgayLe(req.user, req.params.id)),
  dsDichVu: async (req, res) => res.json(await qt.dsDichVuQuanTri()),
  taoDichVu: async (req, res) => res.status(201).json(await qt.taoDichVu(req.user, req.body)),
  capNhatDichVu: async (req, res) => res.json(await qt.capNhatDichVu(req.user, req.params.id, req.body)),
  nhapKho: async (req, res) => res.json(await qt.nhapKho(req.user, req.params.id, req.body.soLuong)),
  xoaDichVu: async (req, res) => res.json(await qt.xoaDichVu(req.user, req.params.id)),
  dsUuDai: async (req, res) => res.json(await qt.dsUuDai()),
  luuMaGiamGia: async (req, res) => res.json(await qt.luuMaGiamGia(req.user, req.params.id, req.body)),
  ngungMaGiamGia: async (req, res) => res.json(await qt.ngungMaGiamGia(req.user, req.params.id)),
  luuHang: async (req, res) => res.json(await qt.luuHangThanhVien(req.user, req.params.id, req.body)),
  luuLoaiGoiGio: async (req, res) => res.json(await qt.luuLoaiGoiGio(req.user, req.params.id, req.body)),
  dsTaiKhoan: async (req, res) => res.json(await qt.dsTaiKhoan(req.query)),
  taoTaiKhoan: async (req, res) => res.status(201).json(await qt.taoTaiKhoan(req.user, req.body)),
  capNhatTaiKhoan: async (req, res) => res.json(await qt.capNhatTaiKhoan(req.user, req.params.id, req.body)),
  doiTrangThaiTaiKhoan: async (req, res) => res.json(await qt.doiTrangThaiTaiKhoan(req.user, req.params.id, req.body)),
  donKhongDen: async (req, res) => res.json(await qt.donKhongDenCuaKhach(req.params.id)),
  nhatKy: async (req, res) => res.json(await qt.dsNhatKy(req.query)),
  thamSo: async (req, res) => res.json(qt.xemThamSo()),
  dsKhieuNai: async (req, res) => res.json(await phanHoi.dsKhieuNai(req.query)),
  chiTietKhieuNai: async (req, res) => res.json(await phanHoi.chiTietKhieuNai(req.params.id)),
  xuLyKhieuNai: async (req, res) => res.json(await phanHoi.xuLyKhieuNai(req.user, req.params.id, req.body)),
  diemTrungBinhSan: async (req, res) => res.json(await phanHoi.diemTrungBinhSan()),
};

// DatSanController – phân hệ UC02 (Hình 4.8)
import * as datSan from '../services/datSanService.js';
import * as phanHoi from '../services/phanHoiService.js';
import prisma from '../config/prisma.js';
import { homNay } from '../utils/thoiGian.js';

export const DatSanController = {
  layLichSan: async (req, res) => res.json(await datSan.layLichSan(req.query.ngay ?? homNay(), { loaiSan: req.query.loaiSan }, req.user)),
  dsSan: async (req, res) =>
    res.json(await prisma.san.findMany({ where: { trangThai: { not: 'NGUNG_SU_DUNG' } }, select: { id: true, tenSan: true, loaiSan: true, trangThai: true }, orderBy: { id: 'asc' } })),
  datSan: async (req, res) => res.status(201).json(await datSan.datSan(req.user, req.body)),
  layDanhSachDon: async (req, res) => res.json(await datSan.layDanhSachDon(req.user, req.query)),
  layChiTietDon: async (req, res) => res.json(await datSan.layChiTietDon(req.user, req.params.maDon)),
  huyDon: async (req, res) => res.json(await datSan.huyDon(req.user, req.params.maDon, { lyDo: req.body?.lyDo })),
  doiLich: async (req, res) => res.json(await datSan.doiLich(req.user, req.params.maDon, { ...req.body, ip: req.ip })),
  danhGia: async (req, res) => res.status(201).json(await phanHoi.danhGia(req.user, req.params.maDon, req.body)),
};

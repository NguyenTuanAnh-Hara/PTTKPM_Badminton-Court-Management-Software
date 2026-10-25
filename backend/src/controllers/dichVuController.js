// DichVuController – phân hệ UC04
import * as dichVu from '../services/dichVuService.js';

export const DichVuController = {
  danhMuc: async (req, res) => res.json(await dichVu.layDanhMuc(req.query)),
  themVaoDon: async (req, res) => res.status(201).json(await dichVu.themVaoDon(req.user, req.params.maDon, req.body.items)),
  xoaKhoiDon: async (req, res) => res.json(await dichVu.xoaKhoiDon(req.user, req.params.maDon, req.params.id)),
  dsHlv: async (req, res) => res.json(await dichVu.dsHlv()),
  hlvChoDon: async (req, res) => res.json(await dichVu.hlvChoDon(req.user, req.params.maDon)),
  lichRanhHlv: async (req, res) => res.json(await dichVu.lichRanhHlv(req.params.id, req.query.tuNgay)),
  datLichHoc: async (req, res) => res.status(201).json(await dichVu.datLichHoc(req.user, req.body)),
  lichDayCuaToi: async (req, res) => res.json(await dichVu.lichDayCuaToi(req.user, req.query)),
  themLichRanh: async (req, res) => res.status(201).json(await dichVu.themLichRanh(req.user, req.body)),
  xoaLichRanh: async (req, res) => res.json(await dichVu.xoaLichRanh(req.user, req.params.id)),
};

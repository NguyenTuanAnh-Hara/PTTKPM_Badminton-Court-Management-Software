// BaoCaoController – phân hệ UC07
import * as baoCao from '../services/baoCaoService.js';

export const BaoCaoController = {
  doanhThu: async (req, res) => res.json(await baoCao.doanhThu(req.query)),
  lapDay: async (req, res) => res.json(await baoCao.lapDay(req.query)),
  giaoDich: async (req, res) => res.json(await baoCao.giaoDichTrongNgay(req.query.ngay)),
  xuat: async (req, res) => {
    const buf = await baoCao.xuatExcel(req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-${req.query.tuNgay}-${req.query.denNgay}.xlsx"`);
    res.send(Buffer.from(buf));
  },
};

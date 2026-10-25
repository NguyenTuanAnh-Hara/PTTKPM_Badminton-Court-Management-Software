// AuthController + TaiKhoanController – phân hệ UC01
import * as auth from '../services/authService.js';
import * as thanhToan from '../services/thanhToanService.js';

export const AuthController = {
  dangKy: async (req, res) => res.status(201).json(await auth.dangKy(req.body)),
  dangNhap: async (req, res) => res.json(await auth.dangNhap(req, req.body)),
  dangXuat: async (req, res) => {
    await auth.dangXuat(req.session);
    res.clearCookie('scl.sid');
    res.json({ daDangXuat: true });
  },
  toi: async (req, res) => res.json({ user: req.user ? await auth.layThongTinToi(req.user) : null }),
  quenMatKhau: async (req, res) => res.json(await auth.quenMatKhau(req.session, req.body)),
  datLaiMatKhau: async (req, res) => res.json(await auth.datLaiMatKhau(req.session, req.body)),
};

export const TaiKhoanController = {
  thongTin: async (req, res) => res.json(await auth.layThongTinToi(req.user)),
  capNhat: async (req, res) => res.json(await auth.capNhatThongTin(req.user, req.body)),
  doiMatKhau: async (req, res) => res.json(await auth.doiMatKhau(req.user, req.sessionID, req.body)),
  goiGio: async (req, res) => res.json(await thanhToan.goiCuaToi(req.user)),
  dsGoiThanhVien: async (req, res) => res.json(await auth.dsGoiThanhVien(req.user)),
  dangKyGoiThanhVien: async (req, res) => res.status(201).json(await thanhToan.dangKyGoiThanhVien(req.user, req.params.id, req.ip)),
  dsLoaiGoiGio: async (req, res) => res.json(await auth.dsLoaiGoiGio()),
  muaGoiGio: async (req, res) => res.status(201).json(await thanhToan.muaGoiGio(req.user, req.body.loaiGoiGioId, req.ip)),
};

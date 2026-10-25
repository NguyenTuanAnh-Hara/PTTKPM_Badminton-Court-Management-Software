import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/index.js';

// AuthContext: người dùng đang đăng nhập (lấy từ phiên ở backend)
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dangTai, setDangTai] = useState(true);

  const taiLai = useCallback(async () => {
    try {
      const r = await authApi.toi();
      setUser(r.user);
      return r.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiLai();
  }, [taiLai]);

  const dangNhap = async (dinhDanh, matKhau) => {
    await authApi.dangNhap({ dinhDanh, matKhau });
    return taiLai();
  };
  const dangXuat = async () => {
    await authApi.dangXuat().catch(() => {});
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, dangTai, taiLai, dangNhap, dangXuat }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

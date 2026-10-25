import { createContext, useContext, useState } from 'react';

// GioDatSanContext: các ô (sân, khung giờ) người dùng đang chọn trên lưới lịch sân
const GioDatSanContext = createContext(null);

export function GioDatSanProvider({ children }) {
  const [ngay, setNgay] = useState(null);
  const [chon, setChon] = useState([]); // [{ sanId, khungGioId }]
  const khoa = (o) => `${o.sanId}-${o.khungGioId}`;
  const daChon = (sanId, khungGioId) => chon.some((o) => o.sanId === sanId && o.khungGioId === khungGioId);
  const batTat = (sanId, khungGioId) =>
    setChon((ds) => (ds.some((o) => khoa(o) === `${sanId}-${khungGioId}`) ? ds.filter((o) => khoa(o) !== `${sanId}-${khungGioId}`) : [...ds, { sanId, khungGioId }]));
  const xoaHet = () => setChon([]);
  const doiNgay = (n) => {
    setNgay(n);
    setChon([]);
  };
  return <GioDatSanContext.Provider value={{ ngay, doiNgay, chon, daChon, batTat, xoaHet }}>{children}</GioDatSanContext.Provider>;
}

export const useGioDatSan = () => useContext(GioDatSanContext);

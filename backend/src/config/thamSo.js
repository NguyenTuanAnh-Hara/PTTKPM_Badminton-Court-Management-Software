// Các tham số nghiệp vụ đánh dấu (*) ở mục 3.2.5 – đọc từ .env, có giá trị mặc định (NFR-13)
const so = (ten, macDinh) => {
  const v = process.env[ten];
  return v === undefined || v === '' ? macDinh : Number(v);
};

const thamSo = {
  // Đặt sân và giữ chỗ (QT-01 → QT-05)
  GIO_MO_CUA: 5,
  GIO_DONG_CUA: 23,
  SO_KHUNG_LIEN_TIEP_TOI_DA: so('SO_KHUNG_LIEN_TIEP_TOI_DA', 4),
  SO_NGAY_DAT_TRUOC: so('SO_NGAY_DAT_TRUOC', 7),
  PHUT_DAT_TRUOC_TOI_THIEU: so('PHUT_DAT_TRUOC_TOI_THIEU', 30),
  SO_DON_CHO_TOI_DA: so('SO_DON_CHO_TOI_DA', 2),
  GIU_CHO_PHUT: so('GIU_CHO_PHUT', 10),
  GIU_CHO_LE_TAN_PHUT: so('GIU_CHO_LE_TAN_PHUT', 30),
  DINH_KY_SO_BUOI_TOI_THIEU: so('DINH_KY_SO_BUOI_TOI_THIEU', 4),
  DINH_KY_SO_BUOI_TOI_DA: so('DINH_KY_SO_BUOI_TOI_DA', 12),
  DINH_KY_HAN_THANH_TOAN_GIO: 24,

  // Hủy, đổi lịch, hoàn tiền (QT-11 → QT-15)
  GIO_HOAN_TOAN_BO: 24,
  GIO_HUY_TOI_THIEU: 2,
  PHAN_TRAM_HOAN_SAN: so('PHAN_TRAM_HOAN_SAN', 50),
  SO_LAN_DOI_LICH_TOI_DA: so('SO_LAN_DOI_LICH_TOI_DA', 1),
  PHUT_TU_CHOI_CHUYEN_SAN: 30, // QT-27: khách được từ chối sân thay thế trong 30 phút

  // Check-in, no-show (QT-16 → QT-19)
  PHUT_CHECK_IN_TRUOC: so('PHUT_CHECK_IN_TRUOC', 15),
  PHUT_CHECK_IN_SAU: so('PHUT_CHECK_IN_SAU', 15),
  SO_LAN_NO_SHOW_KHOA: so('SO_LAN_NO_SHOW_KHOA', 3),
  SO_NGAY_DEM_NO_SHOW: so('SO_NGAY_DEM_NO_SHOW', 30),
  SO_NGAY_DUOC_DANH_GIA: so('SO_NGAY_DUOC_DANH_GIA', 7),

  // Thành viên, điểm thưởng, gói giờ (QT-20 → QT-23)
  THOI_HAN_THANH_VIEN_NGAY: 30,
  DIEM_MOI_GIO: 10,
  GIA_TRI_MOT_DIEM: 100,
  BOI_SO_DIEM: 10,
  PHAN_TRAM_DIEM_TOI_DA: 50,
  GIO_CAO_DIEM_TU: so('GIO_CAO_DIEM_TU', 17),
  GIO_CAO_DIEM_DEN: so('GIO_CAO_DIEM_DEN', 22),
  HE_SO_TRU_GIO_CAO_DIEM: so('HE_SO_TRU_GIO_CAO_DIEM', 1.5),

  // Khiếu nại
  GIO_KHIEU_NAI_QUA_HAN: 48,
  // Thông báo (NFR-12)
  SO_LAN_GUI_LAI_TOI_DA: 5,
};

export default thamSo;

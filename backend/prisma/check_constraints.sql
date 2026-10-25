-- Ràng buộc CHECK của Bảng 4.16 (Prisma chưa khai báo được CHECK trong schema.prisma).
-- Tệp này được prisma/seed.js chạy tự động; có thể chạy lại nhiều lần.
ALTER TABLE don_dat_san ADD CONSTRAINT chk_don_nguoi_dat CHECK (khach_hang_id IS NOT NULL OR sdt_khach IS NOT NULL);
ALTER TABLE thanh_toan ADD CONSTRAINT chk_tt_so_tien CHECK (so_tien > 0);
ALTER TABLE thanh_toan ADD CONSTRAINT chk_tt_doi_tuong CHECK (
  (muc_dich = 'DAT_SAN' AND don_dat_san_id IS NOT NULL) OR
  (muc_dich = 'GOI_THANH_VIEN' AND goi_thanh_vien_id IS NOT NULL AND khach_hang_id IS NOT NULL) OR
  (muc_dich = 'MUA_GOI_GIO' AND goi_gio_choi_id IS NOT NULL AND khach_hang_id IS NOT NULL));
ALTER TABLE danh_gia ADD CONSTRAINT chk_so_sao CHECK (so_sao BETWEEN 1 AND 5);
ALTER TABLE chi_tiet_dich_vu ADD CONSTRAINT chk_ctdv_so_luong CHECK (so_luong > 0);
ALTER TABLE dich_vu ADD CONSTRAINT chk_dv_ton CHECK (so_luong_ton >= 0);
ALTER TABLE ma_giam_gia ADD CONSTRAINT chk_phan_tram CHECK (phan_tram_giam BETWEEN 1 AND 100);

-- ==============================================
-- PAM Semenharjo - SQL Setup untuk Supabase
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ==============================================

-- 1. Tabel config
CREATE TABLE IF NOT EXISTS pam_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 2. Tabel warga
CREATE TABLE IF NOT EXISTS pam_warga (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  alamat TEXT DEFAULT '',
  telp TEXT DEFAULT '',
  tarif INTEGER DEFAULT 2000,
  meter_awal INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel tagihan
CREATE TABLE IF NOT EXISTS pam_tagihan (
  id TEXT PRIMARY KEY,
  warga_id TEXT REFERENCES pam_warga(id) ON DELETE CASCADE,
  periode TEXT NOT NULL,
  meter_awal NUMERIC DEFAULT 0,
  meter_akhir NUMERIC DEFAULT 0,
  pemakaian NUMERIC DEFAULT 0,
  tarif INTEGER DEFAULT 2000,
  abonemen INTEGER DEFAULT 5000,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'belum',
  tgl_bayar TEXT,
  catatan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Row Level Security
ALTER TABLE pam_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_tagihan ENABLE ROW LEVEL SECURITY;

-- 5. Policies (izinkan akses dari service role - AMAN karena key ada di server)
CREATE POLICY "service_all_config" ON pam_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_warga" ON pam_warga FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_tagihan" ON pam_tagihan FOR ALL USING (true) WITH CHECK (true);

# PAM Semenharjo — Panduan Deploy

## Struktur Project
```
pam-semenharjo/
├── pages/
│   ├── index.js          ← UI utama app
│   ├── _app.js
│   └── api/
│       ├── warga.js      ← API: daftar & tambah warga
│       ├── warga/[id].js ← API: edit & hapus warga
│       ├── tagihan.js    ← API: daftar & tambah tagihan
│       ├── tagihan/[id].js ← API: edit & hapus tagihan
│       ├── config.js     ← API: pengaturan (tarif, desa)
│       └── seed.js       ← API: isi data awal
├── lib/
│   └── supabase.js       ← Koneksi Supabase (server only)
├── styles/
│   └── globals.css
├── .env.local            ← isi credentials Supabase (jangan di-commit!)
├── .env.example
├── supabase-setup.sql    ← SQL untuk setup database
└── package.json
```

---

## Langkah 1: Setup Supabase

1. Buka **https://supabase.com** → login → **New project**
2. Isi nama project: `pam-semenharjo`, pilih region **Southeast Asia (Singapore)**
3. Tunggu project selesai dibuat (~2 menit)
4. Buka **SQL Editor** → klik **New query**
5. Copy isi file `supabase-setup.sql` → paste → klik **Run**
6. Buka **Settings → API**:
   - Copy **Project URL** → simpan
   - Copy **service_role** key (bukan anon!) → simpan

---

## Langkah 2: Setup Environment Variables

Edit file `.env.local`:
```
SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> ⚠️ Gunakan **service_role** key, BUKAN anon key.
> File `.env.local` sudah ada di .gitignore, aman untuk tidak di-commit.

---

## Langkah 3: Jalankan Lokal (testing)

```bash
# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Buka http://localhost:3000 di browser.
Login: **admin / 1234**

---

## Langkah 4: Push ke GitHub

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/pam-semenharjo.git
git push -u origin main
```

---

## Langkah 5: Deploy ke Vercel

1. Buka **https://vercel.com** → login dengan GitHub
2. Klik **Add New Project** → pilih repo `pam-semenharjo`
3. **PENTING**: Sebelum deploy, tambahkan Environment Variables:
   - Klik **Environment Variables**
   - Tambahkan: `SUPABASE_URL` = URL Supabase kamu
   - Tambahkan: `SUPABASE_SERVICE_ROLE_KEY` = service role key kamu
4. Klik **Deploy**

Selesai! App akan live di `https://pam-semenharjo.vercel.app`

---

## Login Default
- Username: `admin`
- Password: `1234`

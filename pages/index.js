import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

// ====== UTILS ======
const fRp = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID')
const nowPeriod = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` }
const pLabel = (s) => { if (!s) return '-'; const [y, m] = s.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }
const fDate = (s) => { if (!s) return '-'; try { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s } }
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

// ====== API HELPERS ======
const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url) => fetch(url, { method: 'DELETE' }).then(r => r.json()),
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage] = useState('dash')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  // Data
  const [warga, setWarga] = useState([])
  const [tagihan, setTagihan] = useState([])
  const [config, setConfig] = useState({ tarif: 2000, abonemen: 5000, desa: 'Semenharjo', pj: '', telp: '' })

  // Sheets
  const [sheet, setSheet] = useState(null)

  // Form states
  const [wargaForm, setWargaForm] = useState({ id: '', nama: '', alamat: '', telp: '', tarif: 2000, meter_awal: 0, status: 'aktif', _eid: '' })
  const [tagihanFilter, setTagihanFilter] = useState('semua')
  const [tagihanSearch, setTagihanSearch] = useState('')
  const [tagihanBulan, setTagihanBulan] = useState(nowPeriod())
  const [wargaSearch, setWargaSearch] = useState('')
  const [lapBulan, setLapBulan] = useState(nowPeriod())
  const [bayarForm, setBayarForm] = useState({ id: '', tgl: '', nom: 0 })
  const [editTagihanForm, setEditTagihanForm] = useState({})
  const [meterForm, setMeterForm] = useState({ wargaId: '', periode: nowPeriod(), awal: '', akhir: '', catatan: '' })
  const [tariForm, setTarifForm] = useState({ tarif: 2000, abonemen: 5000 })
  const [desaForm, setDesaForm] = useState({ desa: '', pj: '', telp: '' })
  const [loginForm, setLoginForm] = useState({ u: 'admin', p: '1234' })

  // Toast
  const toast = useCallback((msg, type = '') => {
    const id = gid()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800)
  }, [])

  // Load all data
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [w, t, c] = await Promise.all([
        api.get('/api/warga'),
        api.get('/api/tagihan'),
        api.get('/api/config'),
      ])
      if (w.error) throw new Error(w.error)
      if (t.error) throw new Error(t.error)
      setWarga(w)
      setTagihan(t)
      setConfig(c)
      setTarifForm({ tarif: c.tarif, abonemen: c.abonemen })
      setDesaForm({ desa: c.desa, pj: c.pj || '', telp: c.telp || '' })
      // Seed if empty
      if (w.length === 0) {
        const s = await api.post('/api/seed', {})
        if (!s.error) {
          const [w2, t2] = await Promise.all([api.get('/api/warga'), api.get('/api/tagihan')])
          setWarga(w2); setTagihan(t2)
        }
      }
    } catch (e) {
      toast('Gagal memuat data: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { if (loggedIn) loadAll() }, [loggedIn, loadAll])

  // ====== AUTH ======
  const doLogin = () => {
    if (loginForm.u === 'admin' && loginForm.p === '1234') setLoggedIn(true)
    else toast('Username / password salah', 'error')
  }

  // ====== WARGA ======
  const openAddWarga = () => {
    const nums = warga.map(w => parseInt(w.id.replace(/\D/g, '')) || 0)
    const nextId = 'SHJ-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')
    setWargaForm({ id: nextId, nama: '', alamat: '', telp: '', tarif: config.tarif, meter_awal: 0, status: 'aktif', _eid: '' })
    setSheet('warga')
  }
  const openEditWarga = (w) => {
    setWargaForm({ id: w.id, nama: w.nama, alamat: w.alamat || '', telp: w.telp || '', tarif: w.tarif, meter_awal: w.meter_awal || 0, status: w.status, _eid: w.id })
    setSheet('warga')
  }
  const simpanWarga = async () => {
    if (!wargaForm.nama || !wargaForm.id) { toast('Nama dan ID wajib diisi', 'error'); return }
    setLoading(true)
    try {
      const body = { id: wargaForm.id, nama: wargaForm.nama, alamat: wargaForm.alamat, telp: wargaForm.telp, tarif: parseInt(wargaForm.tarif) || config.tarif, meter_awal: parseInt(wargaForm.meter_awal) || 0, status: wargaForm.status }
      if (wargaForm._eid) {
        const r = await api.put(`/api/warga/${wargaForm._eid}`, body)
        if (r.error) throw new Error(r.error)
        setWarga(w => w.map(x => x.id === wargaForm._eid ? { ...x, ...body } : x))
        toast('Data diperbarui', 'success')
      } else {
        if (warga.find(w => w.id === wargaForm.id)) { toast('ID sudah digunakan', 'error'); return }
        const r = await api.post('/api/warga', body)
        if (r.error) throw new Error(r.error)
        setWarga(w => [...w, body])
        toast('Warga ditambahkan', 'success')
      }
      setSheet(null)
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const hapusWarga = async () => {
    if (!confirm(`Hapus warga "${wargaForm.nama}"? Semua tagihan terkait juga akan dihapus.`)) return
    setLoading(true)
    try {
      await api.del(`/api/warga/${wargaForm._eid}`)
      setWarga(w => w.filter(x => x.id !== wargaForm._eid))
      setTagihan(t => t.filter(x => x.warga_id !== wargaForm._eid))
      setSheet(null); toast('Warga dihapus', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  // ====== METER ======
  const getWargaById = (id) => warga.find(w => w.id === id)
  const getMeterAwal = (wargaId, periode) => {
    const prev = tagihan.filter(t => t.warga_id === wargaId && t.periode < periode).sort((a, b) => b.periode.localeCompare(a.periode))
    if (prev.length) return prev[0].meter_akhir
    return getWargaById(wargaId)?.meter_awal || 0
  }
  const onWargaChangeMeter = (wargaId) => {
    const awal = getMeterAwal(wargaId, meterForm.periode)
    setMeterForm(f => ({ ...f, wargaId, awal, akhir: '' }))
  }
  const hitungMeter = () => {
    const w = getWargaById(meterForm.wargaId)
    if (!w || meterForm.akhir === '') return null
    const pakai = parseFloat(meterForm.akhir) - parseFloat(meterForm.awal || 0)
    const total = pakai * w.tarif + config.abonemen
    return { pakai, total, w }
  }
  const simpanMeter = async () => {
    if (!meterForm.wargaId) { toast('Pilih warga', 'error'); return }
    if (!meterForm.akhir) { toast('Isi meter akhir', 'error'); return }
    if (!meterForm.periode) { toast('Pilih periode', 'error'); return }
    const awal = parseFloat(meterForm.awal) || 0
    const akhir = parseFloat(meterForm.akhir)
    if (akhir < awal) { toast('Meter akhir tidak boleh lebih kecil', 'error'); return }
    if (tagihan.find(t => t.warga_id === meterForm.wargaId && t.periode === meterForm.periode)) { toast('Tagihan bulan ini sudah ada!', 'error'); return }
    const w = getWargaById(meterForm.wargaId)
    const pakai = akhir - awal
    const total = pakai * w.tarif + config.abonemen
    const newT = { id: gid(), warga_id: meterForm.wargaId, periode: meterForm.periode, meter_awal: awal, meter_akhir: akhir, pemakaian: pakai, tarif: w.tarif, abonemen: config.abonemen, total, status: 'belum', tgl_bayar: null, catatan: meterForm.catatan }
    setLoading(true)
    try {
      const r = await api.post('/api/tagihan', newT)
      if (r.error) throw new Error(r.error)
      await api.put(`/api/warga/${w.id}`, { ...w, meter_awal: akhir })
      setTagihan(t => [newT, ...t])
      setWarga(ws => ws.map(x => x.id === w.id ? { ...x, meter_awal: akhir } : x))
      setMeterForm(f => ({ ...f, wargaId: '', awal: '', akhir: '', catatan: '' }))
      toast('Tersimpan!', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  // ====== TAGIHAN ======
  const openBayar = (t) => {
    setBayarForm({ id: t.id, tgl: new Date().toISOString().split('T')[0], nom: t.total })
    setSheet('bayar')
  }
  const konfirmasiBayar = async () => {
    const t = tagihan.find(x => x.id === bayarForm.id); if (!t) return
    const updated = { ...t, status: 'lunas', tgl_bayar: bayarForm.tgl }
    setLoading(true)
    try {
      await api.put(`/api/tagihan/${t.id}`, { ...updated, warga_id: updated.warga_id })
      setTagihan(ts => ts.map(x => x.id === t.id ? updated : x))
      setSheet(null); toast('Pembayaran dikonfirmasi!', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const batalBayar = async (id) => {
    if (!confirm('Batalkan status lunas?')) return
    const t = tagihan.find(x => x.id === id); if (!t) return
    const updated = { ...t, status: 'belum', tgl_bayar: null }
    setLoading(true)
    try {
      await api.put(`/api/tagihan/${id}`, { ...updated, warga_id: updated.warga_id })
      setTagihan(ts => ts.map(x => x.id === id ? updated : x))
      toast('Status diubah', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const openEditTagihan = (t) => {
    setEditTagihanForm({ ...t, _abon: t.abonemen })
    setSheet('editTagihan')
  }
  const simpanEditTagihan = async () => {
    const f = editTagihanForm
    const w = getWargaById(f.warga_id) || { tarif: config.tarif }
    const pakai = parseFloat(f.meter_akhir) - parseFloat(f.meter_awal)
    const total = pakai * w.tarif + parseFloat(f.abonemen)
    const updated = { ...f, pemakaian: pakai, total, tgl_bayar: f.tgl_bayar || null }
    setLoading(true)
    try {
      await api.put(`/api/tagihan/${f.id}`, { warga_id: updated.warga_id, periode: updated.periode, meter_awal: updated.meter_awal, meter_akhir: updated.meter_akhir, pemakaian: pakai, tarif: w.tarif, abonemen: parseFloat(f.abonemen), total, status: updated.status, tgl_bayar: updated.tgl_bayar, catatan: updated.catatan })
      setTagihan(ts => ts.map(x => x.id === f.id ? updated : x))
      setSheet(null); toast('Tagihan diperbarui!', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const hapusTagihan = async () => {
    if (!confirm('Hapus tagihan ini?')) return
    setLoading(true)
    try {
      await api.del(`/api/tagihan/${editTagihanForm.id}`)
      setTagihan(ts => ts.filter(x => x.id !== editTagihanForm.id))
      setSheet(null); toast('Tagihan dihapus', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  // ====== CONFIG ======
  const simpanTarif = async () => {
    setLoading(true)
    try {
      await api.post('/api/config', { tarif: parseInt(tariForm.tarif) || 2000, abonemen: parseInt(tariForm.abonemen) || 5000 })
      setConfig(c => ({ ...c, tarif: parseInt(tariForm.tarif), abonemen: parseInt(tariForm.abonemen) }))
      setSheet(null); toast('Tarif & abonemen disimpan!', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const simpanDesa = async () => {
    setLoading(true)
    try {
      await api.post('/api/config', { desa: desaForm.desa || 'Semenharjo', pj: desaForm.pj, telp: desaForm.telp })
      setConfig(c => ({ ...c, ...desaForm }))
      setSheet(null); toast('Info desa disimpan!', 'success')
    } catch (e) { toast('Gagal: ' + e.message, 'error') }
    finally { setLoading(false) }
  }
  const exportData = () => {
    const data = { warga, tagihan, config, exportedAt: new Date().toISOString() }
    const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `pam-${new Date().toISOString().split('T')[0]}.json`; a.click()
    toast('Data diekspor', 'success')
  }

  // ====== COMPUTED ======
  const tp = nowPeriod()
  const tBulanIni = tagihan.filter(t => t.periode === tp)
  const lunasBI = tBulanIni.filter(t => t.status === 'lunas')
  const belumBI = tBulanIni.filter(t => t.status === 'belum')
  const belumCount = tagihan.filter(t => t.status === 'belum' && t.periode === tp).length

  const filteredTagihan = tagihan.filter(t => {
    if (tagihanFilter === 'lunas' && t.status !== 'lunas') return false
    if (tagihanFilter === 'belum' && t.status !== 'belum') return false
    if (tagihanBulan && t.periode !== tagihanBulan) return false
    if (tagihanSearch) { const w = getWargaById(t.warga_id); if (!(w?.nama || '').toLowerCase().includes(tagihanSearch.toLowerCase())) return false }
    return true
  }).sort((a, b) => b.periode.localeCompare(a.periode) || b.id.localeCompare(a.id))

  const filteredWarga = warga.filter(w => !wargaSearch || w.nama.toLowerCase().includes(wargaSearch.toLowerCase()) || w.id.toLowerCase().includes(wargaSearch.toLowerCase()))

  const lapList = tagihan.filter(t => t.periode === lapBulan)
  const lapLunas = lapList.filter(t => t.status === 'lunas')
  const lapBelum = lapList.filter(t => t.status === 'belum')

  const mPreview = hitungMeter()

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const vols = months.map(m => tagihan.filter(t => t.periode === m).reduce((s, t) => s + (t.pemakaian || 0), 0))
  const maxVol = Math.max(...vols, 1)

  // ====== CETAK ======
  const cetakStruk = () => {
    const w = getWargaById(meterForm.wargaId); if (!w || !meterForm.akhir) { toast('Pilih warga dan isi meter akhir', 'error'); return }
    const awal = parseFloat(meterForm.awal) || 0, akhir = parseFloat(meterForm.akhir)
    const pakai = akhir - awal, total = pakai * w.tarif + config.abonemen
    const win = window.open('', '_blank', 'width=360,height=500')
    win.document.write(`<html><head><title>Struk</title><style>body{font-family:monospace;font-size:13px;padding:16px;width:300px}.c{text-align:center}.b{font-weight:bold}.d{border-top:1px dashed #000;margin:8px 0}.r{display:flex;justify-content:space-between}</style></head><body><div class="c b">PAM DESA ${config.desa.toUpperCase()}</div><div class="d"></div><div class="r"><span>Nama</span><span>${w.nama}</span></div><div class="r"><span>ID</span><span>${w.id}</span></div><div class="r"><span>Periode</span><span>${pLabel(meterForm.periode)}</span></div><div class="d"></div><div class="r"><span>Awal</span><span>${awal} m³</span></div><div class="r"><span>Akhir</span><span>${akhir} m³</span></div><div class="r b"><span>Pemakaian</span><span>${pakai} m³</span></div><div class="d"></div><div class="r"><span>Air</span><span>${fRp(pakai * w.tarif)}</span></div><div class="r"><span>Abonemen</span><span>${fRp(config.abonemen)}</span></div><div class="r b"><span>TOTAL</span><span>${fRp(total)}</span></div><div class="d"></div><div class="c" style="margin-top:8px">Terima kasih</div><script>window.print()<\/script></body></html>`)
  }
  const cetakLaporan = () => {
    const m3 = lapList.reduce((s, t) => s + t.pemakaian, 0), rp = lapList.reduce((s, t) => s + t.total, 0), lRp = lapLunas.reduce((s, t) => s + t.total, 0)
    const win = window.open('', '_blank', 'width=700,height=600')
    win.document.write(`<html><head><title>Laporan</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:24px}h2,h3{text-align:center}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:7px}th{background:#f5f5f5}.sum{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}.sb{background:#f5f5f5;padding:10px;border-radius:6px;flex:1}.sl{font-size:11px;color:#666;margin-bottom:3px}.sv{font-size:16px;font-weight:700}</style></head><body><h2>LAPORAN PAM DESA ${config.desa.toUpperCase()}</h2><h3 style="font-weight:400;color:#666">${pLabel(lapBulan)}</h3><div class="sum"><div class="sb"><div class="sl">Pemakaian</div><div class="sv">${m3} m³</div></div><div class="sb"><div class="sl">Total Tagihan</div><div class="sv">${fRp(rp)}</div></div><div class="sb"><div class="sl">Terbayar</div><div class="sv">${fRp(lRp)}</div></div><div class="sb"><div class="sl">Belum Bayar</div><div class="sv">${fRp(rp - lRp)}</div></div></div><table><thead><tr><th>No</th><th>Nama</th><th>Pemakaian</th><th>Abonemen</th><th>Tagihan</th><th>Status</th></tr></thead><tbody>${lapList.map((t, i) => { const w = getWargaById(t.warga_id); return `<tr><td>${i + 1}</td><td>${w?.nama || '-'}</td><td>${t.pemakaian} m³</td><td>${fRp(t.abonemen)}</td><td>${fRp(t.total)}</td><td>${t.status === 'lunas' ? 'Lunas' : 'Belum'}</td></tr>` }).join('')}</tbody></table><p style="margin-top:12px;font-size:12px;color:#666">Dicetak: ${new Date().toLocaleString('id-ID')} · Petugas: ${config.pj || 'Admin'}</p><script>window.print()<\/script></body></html>`)
  }

  // ====== RENDER ======
  if (!loggedIn) return (
    <div style={s.loginBg}>
      <Head><title>PAM Semenharjo</title></Head>
      <div style={s.loginLogo}><WaterIcon /></div>
      <div style={s.loginTitle}>PAM Semenharjo</div>
      <div style={s.loginSub}>Sistem Pencatatan Meteran Air Desa</div>
      <input style={s.lInput} placeholder="Username" value={loginForm.u} onChange={e => setLoginForm(f => ({ ...f, u: e.target.value }))} />
      <input style={s.lInput} type="password" placeholder="Password" value={loginForm.p} onChange={e => setLoginForm(f => ({ ...f, p: e.target.value }))} onKeyDown={e => e.key === 'Enter' && doLogin()} />
      <button style={s.lBtn} onClick={doLogin}>Masuk →</button>
      <p style={s.lHint}>Default: admin / 1234</p>
    </div>
  )

  return (
    <div style={s.shell}>
      <Head><title>PAM {config.desa}</title></Head>

      {/* LOADING */}
      {loading && <div style={s.loadingOverlay}><div style={s.spinner} /><div style={s.loadingTxt}>Memuat...</div></div>}

      {/* TOASTS */}
      <div style={s.toastwrap}>
        {toasts.map(t => <div key={t.id} style={{ ...s.toast, ...(t.type === 'success' ? s.toastOk : t.type === 'error' ? s.toastErr : {}) }}>{t.msg}</div>)}
      </div>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.tbLogo}><WaterIcon /></div>
          <div>
            <div style={s.tbTitle}>{page === 'dash' ? 'Beranda' : page === 'warga' ? 'Data Warga' : page === 'meter' ? 'Catat Meteran' : page === 'tagihan' ? 'Tagihan' : page === 'laporan' ? 'Laporan' : 'Pengaturan'}</div>
            <div style={s.tbSub}>PAM Desa {config.desa}</div>
          </div>
        </div>
        <div style={s.avatar} onClick={() => setSheet('logout')}>A</div>
      </div>

      {/* CONTENT */}
      <div style={s.content}>

        {/* BERANDA */}
        {page === 'dash' && <div>
          <div style={s.statGrid}>
            <StatCard val={warga.filter(w => w.status === 'aktif').length} lbl="Pelanggan Aktif" tag="Terdaftar" tagColor="#e0f2fe" tagText="#0284c7" />
            <StatCard val={fRp(lunasBI.reduce((s, t) => s + t.total, 0))} lbl="Pemasukan Bulan Ini" tag="Terbayar" tagColor="#dcfce7" tagText="#16a34a" small />
            <StatCard val={lunasBI.length} lbl="Sudah Lunas" tag="Bulan ini" tagColor="#dcfce7" tagText="#16a34a" />
            <StatCard val={belumBI.length} lbl="Belum Lunas" tag="Perlu ditagih" tagColor="#fef3c7" tagText="#92400e" />
          </div>
          <div style={s.card}>
            <div style={s.ch}><span style={s.ct}>Pemakaian 6 Bulan</span><span style={{ fontSize: 11, color: '#94a3b8' }}>{tBulanIni.reduce((s, t) => s + t.pemakaian, 0)} m³ bulan ini</span></div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
                {vols.map((v, i) => <div key={i} style={{ flex: 1, background: '#e0f2fe', borderRadius: '4px 4px 0 0', height: Math.max((v / maxVol) * 52, 3) }} />)}
              </div>
              <div style={{ display: 'flex', gap: 5, paddingTop: 4 }}>
                {months.map((m, i) => { const [y, mo] = m.split('-'); return <span key={i} style={{ flex: 1, fontSize: 9, color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>{new Date(y, mo - 1, 1).toLocaleDateString('id-ID', { month: 'short' })}</span> })}
              </div>
            </div>
          </div>
          <div style={s.sec}><span style={s.secT}>Tagihan Terbaru</span><span style={s.secA} onClick={() => setPage('tagihan')}>Lihat Semua</span></div>
          <div style={{ ...s.card, marginBottom: 0 }}>
            {tagihan.slice(0, 5).map(t => {
              const w = getWargaById(t.warga_id)
              return <LiRow key={t.id} onClick={() => openEditTagihan(t)}
                ico={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.status === 'lunas' ? '#16a34a' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                icoBg={t.status === 'lunas' ? '#dcfce7' : '#fee2e2'}
                name={w?.nama || t.warga_id} sub={`${pLabel(t.periode)} · ${t.pemakaian} m³`}
                right={<><div style={s.liAmt}>{fRp(t.total)}</div><Badge status={t.status} /></>} />
            })}
            {tagihan.length === 0 && <Empty txt="Belum ada tagihan" />}
          </div>
        </div>}

        {/* WARGA */}
        {page === 'warga' && <div>
          <div style={{ padding: '10px 12px 6px' }}>
            <input style={{ ...s.fi, paddingLeft: 38 }} placeholder="Cari nama atau ID..." value={wargaSearch} onChange={e => setWargaSearch(e.target.value)} />
          </div>
          <div style={{ ...s.card, marginBottom: 0 }}>
            {filteredWarga.map(w => <LiRow key={w.id} onClick={() => openEditWarga(w)}
              ico={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
              icoBg="#e0f2fe" name={w.nama} sub={`${w.id} · ${w.alamat}`}
              right={<><div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{fRp(w.tarif)}/m³</div><Badge status={w.status === 'aktif' ? 'aktif' : 'nonaktif'} /></>} />)}
            {filteredWarga.length === 0 && <Empty txt="Tidak ada warga" />}
          </div>
          <div style={{ height: 16 }} />
        </div>}

        {/* METER */}
        {page === 'meter' && <div>
          <div style={{ padding: '12px 12px 4px' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={s.fl}>Pilih Warga</label>
              <select style={s.fi} value={meterForm.wargaId} onChange={e => onWargaChangeMeter(e.target.value)}>
                <option value="">-- Pilih warga --</option>
                {warga.filter(w => w.status === 'aktif').map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
              </select>
            </div>
            {meterForm.wargaId && <div style={{ background: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: '#0284c7' }}>{getWargaById(meterForm.wargaId)?.nama}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{getWargaById(meterForm.wargaId)?.alamat}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>Tarif: {fRp(getWargaById(meterForm.wargaId)?.tarif)}/m³ + Abonemen {fRp(config.abonemen)}</div>
            </div>}
            <div style={{ marginBottom: 14 }}>
              <label style={s.fl}>Periode</label>
              <input type="month" style={s.fi} value={meterForm.periode} onChange={e => setMeterForm(f => ({ ...f, periode: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
              <div><label style={s.fl}>Meter Awal</label><input type="number" style={{ ...s.fi, fontFamily: 'monospace', background: '#f4f8ff', color: '#94a3b8' }} value={meterForm.awal} readOnly /></div>
              <div><label style={s.fl}>Meter Akhir</label><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} placeholder="0" value={meterForm.akhir} onChange={e => setMeterForm(f => ({ ...f, akhir: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.fl}>Catatan</label>
              <input style={s.fi} placeholder="Opsional..." value={meterForm.catatan} onChange={e => setMeterForm(f => ({ ...f, catatan: e.target.value }))} />
            </div>
          </div>
          {mPreview && <div style={{ padding: '0 12px' }}>
            {mPreview.pakai < 0 && <div style={s.alertA}>⚠️ Meter akhir lebih kecil dari meter awal!</div>}
            {mPreview.pakai > 50 && <div style={s.alertA}>⚠️ Pemakaian {mPreview.pakai} m³ tergolong tinggi.</div>}
            <div style={s.bill}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '.1em', textTransform: 'uppercase' }}>PAM Desa {config.desa}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{pLabel(meterForm.periode)}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#e0f2fe,#dbeafe)', border: '2px solid #0ea5e9', borderRadius: 16, padding: 18, marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 38, fontWeight: 500, color: '#0284c7' }}>{mPreview.pakai}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>m³ pemakaian</div>
              </div>
              <BillRow lbl="Nama" val={mPreview.w.nama} />
              <BillRow lbl="Tarif/m³" val={fRp(mPreview.w.tarif)} />
              <BillRow lbl="Abonemen" val={fRp(config.abonemen)} />
              <hr style={{ border: 'none', borderTop: '1px dashed #e2eaf6', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontWeight: 700 }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{fRp(mPreview.total)}</span>
              </div>
            </div>
          </div>}
          {!mPreview && !meterForm.wargaId && <div style={{ textAlign: 'center', padding: '24px 20px', color: '#94a3b8' }}>Pilih warga dan isi meter akhir untuk preview tagihan</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px 12px' }}>
            <button style={s.btnO} onClick={cetakStruk}>Cetak</button>
            <button style={s.btnP} onClick={simpanMeter}>Simpan</button>
          </div>
          <div style={{ padding: '8px 16px' }}><span style={s.secT}>Riwayat</span></div>
          <div style={{ ...s.card, marginBottom: 0 }}>
            {tagihan.slice(0, 15).map(t => {
              const w = getWargaById(t.warga_id)
              return <LiRow key={t.id} onClick={() => openEditTagihan(t)}
                ico={<span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>m³</span>}
                icoBg="#f4f8ff" name={w?.nama || t.warga_id} sub={`${pLabel(t.periode)} · ${t.meter_awal}→${t.meter_akhir} m³`}
                right={<><div style={{ fontSize: 12, fontWeight: 700 }}>{t.pemakaian} m³</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{fRp(t.total)}</div></>} />
            })}
            {tagihan.length === 0 && <Empty txt="Belum ada riwayat" />}
          </div>
          <div style={{ height: 16 }} />
        </div>}

        {/* TAGIHAN */}
        {page === 'tagihan' && <div>
          <div style={{ padding: '4px 12px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['semua', 'belum', 'lunas'].map(f => <button key={f} style={{ ...s.chip, ...(tagihanFilter === f ? s.chipActive : {}) }} onClick={() => setTagihanFilter(f)}>{f === 'semua' ? 'Semua' : f === 'belum' ? 'Belum' : 'Lunas'}</button>)}
          </div>
          <div style={{ padding: '0 12px 8px' }}>
            <input style={s.fi} placeholder="Cari nama..." value={tagihanSearch} onChange={e => setTagihanSearch(e.target.value)} />
          </div>
          <div style={{ padding: '0 12px 10px' }}>
            <input type="month" style={s.fi} value={tagihanBulan} onChange={e => setTagihanBulan(e.target.value)} />
          </div>
          <div style={{ ...s.card, marginBottom: 0 }}>
            {filteredTagihan.map(t => {
              const w = getWargaById(t.warga_id)
              return <LiRow key={t.id} onClick={() => openEditTagihan(t)}
                ico={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.status === 'lunas' ? '#16a34a' : '#92400e'} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                icoBg={t.status === 'lunas' ? '#dcfce7' : '#fef3c7'}
                name={w?.nama || t.warga_id}
                sub={<><span>{pLabel(t.periode)} · {t.pemakaian} m³</span><br /><div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Badge status={t.status} />{t.tgl_bayar && <span style={{ fontSize: 11, color: '#94a3b8' }}>{fDate(t.tgl_bayar)}</span>}</div></>}
                right={<><div style={s.liAmt}>{fRp(t.total)}</div>{t.status === 'belum' ? <button style={s.btnSm} onClick={e => { e.stopPropagation(); openBayar(t) }}>Bayar</button> : <button style={s.btnSmO} onClick={e => { e.stopPropagation(); batalBayar(t.id) }}>Batal</button>}</>} />
            })}
            {filteredTagihan.length === 0 && <Empty txt="Tidak ada tagihan" />}
          </div>
          <div style={{ height: 16 }} />
        </div>}

        {/* LAPORAN */}
        {page === 'laporan' && <div>
          <div style={{ padding: '12px 12px 4px' }}>
            <label style={s.fl}>Pilih Periode</label>
            <input type="month" style={s.fi} value={lapBulan} onChange={e => setLapBulan(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 12px 4px' }}>
            <LapCard lbl="Pemakaian" val={lapList.reduce((s, t) => s + t.pemakaian, 0) + ' m³'} sub={lapList.length + ' tagihan'} />
            <LapCard lbl="Total Tagihan" val={fRp(lapList.reduce((s, t) => s + t.total, 0))} sub={pLabel(lapBulan)} />
            <LapCard lbl="Sudah Bayar" val={fRp(lapLunas.reduce((s, t) => s + t.total, 0))} sub={lapLunas.length + ' orang'} />
            <LapCard lbl="Belum Bayar" val={fRp(lapBelum.reduce((s, t) => s + t.total, 0))} sub={lapBelum.length + ' orang'} />
          </div>
          <div style={{ padding: '0 12px 12px' }}><button style={s.btnO} onClick={cetakLaporan}>Cetak Laporan</button></div>
          <div style={{ ...s.card, marginBottom: 0 }}>
            {lapList.map((t, i) => {
              const w = getWargaById(t.warga_id)
              return <LiRow key={t.id} onClick={() => openEditTagihan(t)}
                ico={<span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>}
                icoBg="#f4f8ff" name={w?.nama || t.warga_id} sub={`${t.pemakaian} m³ · ${fRp(t.total)}`}
                right={<Badge status={t.status} />} />
            })}
            {lapList.length === 0 && <Empty txt="Tidak ada data" />}
          </div>
          <div style={{ height: 16 }} />
        </div>}

        {/* PENGATURAN */}
        {page === 'setting' && <div>
          <div style={{ margin: '12px 12px 0' }}>
            <div style={s.sgLbl}>Tarif & Konfigurasi</div>
            <div style={s.sgCard}>
              <SettRow ico="💰" title="Tarif Air & Abonemen" desc={`${fRp(config.tarif)}/m³ + Abonemen ${fRp(config.abonemen)}`} onClick={() => { setTarifForm({ tarif: config.tarif, abonemen: config.abonemen }); setSheet('tarif') }} />
              <SettRow ico="🏘️" title="Info Desa" desc={config.desa} onClick={() => { setDesaForm({ desa: config.desa, pj: config.pj || '', telp: config.telp || '' }); setSheet('desa') }} last />
            </div>
            <div style={s.sgLbl}>Data & Backup</div>
            <div style={s.sgCard}>
              <SettRow ico="📤" title="Export Data" desc="Simpan backup JSON" onClick={exportData} last />
            </div>
            <div style={{ textAlign: 'center', padding: '4px 0 28px', color: '#94a3b8', fontSize: 12 }}>PAM Desa {config.desa} v2.0<br />Made by Raafki</div>
          </div>
        </div>}

      </div>

      {/* FAB */}
      {page === 'warga' && <div style={s.fab} onClick={openAddWarga}>＋</div>}

      {/* BOTTOM NAV */}
      <div style={s.bnav}>
        {[
          { id: 'dash', label: 'Beranda', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg> },
          { id: 'warga', label: 'Warga', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
          { id: 'meter', label: 'Meter', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
          {
            id: 'tagihan', label: 'Tagihan', icon: <div style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16l3-2 2 2 2-2 2 2 3-2V4a2 2 0 00-2-2z" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              {belumCount > 0 && <span style={{ position: 'absolute', top: -4, right: -9, background: '#ef4444', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center', lineHeight: 1.4 }}>{belumCount}</span>}
            </div>
          },
          { id: 'laporan', label: 'Laporan', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg> },
          { id: 'setting', label: 'Pengaturan', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c.12.58.52 1.06 1 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06c-.21.21-.37.47-.45.76.47.45.86.93 1 1.51H21a2 2 0 010 4h-.09c-.58.12-1.06.52-1.51 1z" /></svg> },
        ].map(n => <div key={n.id} style={{ ...s.ni, ...(page === n.id ? s.niActive : {}) }} onClick={() => setPage(n.id)}>
          <div>{n.icon}</div><span>{n.label}</span>
        </div>)}
      </div>
      

      {/* ====== SHEETS ====== */}

      {/* WARGA SHEET */}
      <Sheet show={sheet === 'warga'} onClose={() => setSheet(null)} title={wargaForm._eid ? 'Edit Warga' : 'Tambah Warga'}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
          <div><label style={s.fl}>ID Pelanggan</label><input style={{ ...s.fi, ...(wargaForm._eid ? { background: '#f4f8ff', color: '#94a3b8' } : {}) }} value={wargaForm.id} readOnly={!!wargaForm._eid} onChange={e => setWargaForm(f => ({ ...f, id: e.target.value }))} /></div>
          <div><label style={s.fl}>Status</label><select style={s.fi} value={wargaForm.status} onChange={e => setWargaForm(f => ({ ...f, status: e.target.value }))}><option value="aktif">Aktif</option><option value="nonaktif">Non-aktif</option></select></div>
        </div>
        <FG label="Nama Lengkap"><input style={s.fi} placeholder="Nama lengkap warga" value={wargaForm.nama} onChange={e => setWargaForm(f => ({ ...f, nama: e.target.value }))} /></FG>
        <FG label="Alamat"><input style={s.fi} placeholder="RT/RW, jalan..." value={wargaForm.alamat} onChange={e => setWargaForm(f => ({ ...f, alamat: e.target.value }))} /></FG>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
          <div><label style={s.fl}>Telepon</label><input style={s.fi} placeholder="08xx..." value={wargaForm.telp} onChange={e => setWargaForm(f => ({ ...f, telp: e.target.value }))} /></div>
          <div><label style={s.fl}>Tarif/m³ (Rp)</label><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={wargaForm.tarif} onChange={e => setWargaForm(f => ({ ...f, tarif: e.target.value }))} /></div>
        </div>
        <FG label="Meter Awal (m³)"><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={wargaForm.meter_awal} onChange={e => setWargaForm(f => ({ ...f, meter_awal: e.target.value }))} /></FG>
        {wargaForm._eid && <button style={s.btnD} onClick={hapusWarga}>Hapus Warga</button>}
        <SheetFoot><button style={s.btnP} onClick={simpanWarga}>Simpan</button></SheetFoot>
      </Sheet>

      {/* TARIF SHEET */}
      <Sheet show={sheet === 'tarif'} onClose={() => setSheet(null)} title="Tarif & Abonemen">
        <div style={{ ...s.alertI, marginBottom: 16 }}>ℹ️ Perubahan tarif berlaku untuk tagihan baru. Tagihan yang sudah ada tidak berubah.</div>
        <FG label="Tarif Dasar per m³ (Rp)"><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={tariForm.tarif} onChange={e => setTarifForm(f => ({ ...f, tarif: e.target.value }))} /></FG>
        <FG label="Abonemen per Bulan (Rp)">
          <input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={tariForm.abonemen} onChange={e => setTarifForm(f => ({ ...f, abonemen: e.target.value }))} />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Biaya tetap bulanan yang ditambahkan ke setiap tagihan</div>
        </FG>
        <div style={{ background: '#f4f8ff', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>PREVIEW (pemakaian 10 m³)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{fRp(10 * (parseInt(tariForm.tarif) || 0) + (parseInt(tariForm.abonemen) || 0))}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>(10 × tarif) + abonemen</div>
        </div>
        <SheetFoot><button style={s.btnP} onClick={simpanTarif}>Simpan Tarif & Abonemen</button></SheetFoot>
      </Sheet>

      {/* DESA SHEET */}
      <Sheet show={sheet === 'desa'} onClose={() => setSheet(null)} title="Info Desa">
        <FG label="Nama Desa"><input style={s.fi} value={desaForm.desa} onChange={e => setDesaForm(f => ({ ...f, desa: e.target.value }))} /></FG>
        <FG label="Penanggung Jawab"><input style={s.fi} placeholder="Nama petugas" value={desaForm.pj} onChange={e => setDesaForm(f => ({ ...f, pj: e.target.value }))} /></FG>
        <FG label="No. Telepon"><input style={s.fi} placeholder="08xx..." value={desaForm.telp} onChange={e => setDesaForm(f => ({ ...f, telp: e.target.value }))} /></FG>
        <SheetFoot><button style={s.btnP} onClick={simpanDesa}>Simpan</button></SheetFoot>
      </Sheet>

      {/* BAYAR SHEET */}
      <Sheet show={sheet === 'bayar'} onClose={() => setSheet(null)} title="Konfirmasi Pembayaran">
        {sheet === 'bayar' && (() => { const t = tagihan.find(x => x.id === bayarForm.id); const w = t && getWargaById(t.warga_id); return t && <div style={s.bill}><BillRow lbl="Nama" val={w?.nama} /><BillRow lbl="Periode" val={pLabel(t.periode)} /><BillRow lbl="Pemakaian" val={`${t.pemakaian} m³`} /><BillRow lbl="Abonemen" val={fRp(t.abonemen)} /><hr style={{ border: 'none', borderTop: '1px dashed #e2eaf6', margin: '8px 0' }} /><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontSize: 22, fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{fRp(t.total)}</span></div></div> })()}
        <FG label="Tanggal Bayar"><input type="date" style={s.fi} value={bayarForm.tgl} onChange={e => setBayarForm(f => ({ ...f, tgl: e.target.value }))} /></FG>
        <FG label="Nominal Diterima (Rp)"><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={bayarForm.nom} onChange={e => setBayarForm(f => ({ ...f, nom: e.target.value }))} /></FG>
        <SheetFoot><button style={{ ...s.btnP, background: '#22c55e' }} onClick={konfirmasiBayar}>Tandai Lunas</button></SheetFoot>
      </Sheet>

      {/* EDIT TAGIHAN SHEET */}
      <Sheet show={sheet === 'editTagihan'} onClose={() => setSheet(null)} title="Edit Tagihan">
        <FG label="Warga"><select style={s.fi} value={editTagihanForm.warga_id || ''} onChange={e => setEditTagihanForm(f => ({ ...f, warga_id: e.target.value }))}>{warga.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}</select></FG>
        <FG label="Periode"><input type="month" style={s.fi} value={editTagihanForm.periode || ''} onChange={e => setEditTagihanForm(f => ({ ...f, periode: e.target.value }))} /></FG>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
          <div><label style={s.fl}>Meter Awal</label><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={editTagihanForm.meter_awal ?? ''} onChange={e => setEditTagihanForm(f => ({ ...f, meter_awal: e.target.value }))} /></div>
          <div><label style={s.fl}>Meter Akhir</label><input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={editTagihanForm.meter_akhir ?? ''} onChange={e => setEditTagihanForm(f => ({ ...f, meter_akhir: e.target.value }))} /></div>
        </div>
        <FG label="Abonemen (Rp)">
          <input type="number" style={{ ...s.fi, fontFamily: 'monospace' }} value={editTagihanForm.abonemen ?? ''} onChange={e => setEditTagihanForm(f => ({ ...f, abonemen: e.target.value }))} />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Edit abonemen khusus untuk tagihan ini</div>
        </FG>
        <FG label="Status"><select style={s.fi} value={editTagihanForm.status || 'belum'} onChange={e => setEditTagihanForm(f => ({ ...f, status: e.target.value }))}><option value="belum">Belum Lunas</option><option value="lunas">Lunas</option></select></FG>
        <FG label="Tanggal Bayar"><input type="date" style={s.fi} value={editTagihanForm.tgl_bayar || ''} onChange={e => setEditTagihanForm(f => ({ ...f, tgl_bayar: e.target.value }))} /></FG>
        <FG label="Catatan"><input style={s.fi} placeholder="Opsional..." value={editTagihanForm.catatan || ''} onChange={e => setEditTagihanForm(f => ({ ...f, catatan: e.target.value }))} /></FG>
        {editTagihanForm.meter_akhir && <div style={{ background: '#f4f8ff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          {(() => {
            const w = getWargaById(editTagihanForm.warga_id) || { tarif: config.tarif }
            const pakai = parseFloat(editTagihanForm.meter_akhir) - parseFloat(editTagihanForm.meter_awal || 0)
            const total = pakai * w.tarif + parseFloat(editTagihanForm.abonemen || 0)
            return <><BillRow lbl="Pemakaian" val={pakai + ' m³'} /><BillRow lbl="Abonemen" val={fRp(parseFloat(editTagihanForm.abonemen || 0))} /><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2eaf6' }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{fRp(total)}</span></div></>
          })()}
        </div>}
        <button style={{ ...s.btnD, marginBottom: 8 }} onClick={hapusTagihan}>Hapus Tagihan</button>
        <SheetFoot><button style={s.btnP} onClick={simpanEditTagihan}>Simpan Perubahan</button></SheetFoot>
      </Sheet>

      {/* LOGOUT SHEET */}
      <Sheet show={sheet === 'logout'} onClose={() => setSheet(null)} title="Akun">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0 20px' }}>
          <div style={{ width: 52, height: 52, background: '#0ea5e9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700 }}>A</div>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>Admin Petugas</div><div style={{ fontSize: 13, color: '#94a3b8' }}>Operator PAM {config.desa}</div></div>
        </div>
        <SheetFoot><button style={s.btnD} onClick={() => { setSheet(null); setLoggedIn(false) }}>Keluar</button></SheetFoot>
      </Sheet>

    </div>
  )
}

// ====== SMALL COMPONENTS ======
const WaterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6 10 5 14 5 16a7 7 0 0014 0c0-2-1-6-7-14z" /></svg>
const StatCard = ({ val, lbl, tag, tagColor, tagText, small }) => <div style={s.sc}><div style={{ ...s.scVal, ...(small ? { fontSize: 14 } : {}) }}>{val}</div><div style={s.scLbl}>{lbl}</div><div style={{ ...s.scTag, background: tagColor, color: tagText }}>{tag}</div></div>
const LiRow = ({ ico, icoBg, name, sub, right, onClick }) => <div style={s.li} onClick={onClick}><div style={{ ...s.liIco, background: icoBg }}>{ico}</div><div style={{ flex: 1, minWidth: 0 }}><div style={s.liName}>{name}</div><div style={s.liSub}>{sub}</div></div><div style={{ textAlign: 'right', flexShrink: 0 }}>{right}</div></div>
const Badge = ({ status }) => { const map = { lunas: ['#dcfce7', '#16a34a', 'Lunas'], belum: ['#fee2e2', '#ef4444', 'Belum'], aktif: ['#dcfce7', '#16a34a', 'Aktif'], nonaktif: ['#f1f5f9', '#94a3b8', 'Non-aktif'] }; const [bg, cl, txt] = map[status] || map.nonaktif; return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: bg, color: cl }}>{txt}</span> }
const Empty = ({ txt }) => <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontSize: 13 }}>{txt}</div>
const FG = ({ label, children }) => <div style={{ marginBottom: 14 }}><label style={s.fl}>{label}</label>{children}</div>
const BillRow = ({ lbl, val }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 13 }}><span style={{ color: '#94a3b8' }}>{lbl}</span><span style={{ fontWeight: 600 }}>{val}</span></div>
const LapCard = ({ lbl, val, sub }) => <div style={s.lapCard}><div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 5, fontFamily: 'monospace' }}>{val}</div><div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>{sub}</div></div>
const SettRow = ({ ico, title, desc, onClick, last }) => <div style={{ ...s.sr, ...(last ? { borderBottom: 'none' } : {}) }} onClick={onClick}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: '#f4f8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{ico}</div><div><div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{desc}</div></div></div><span style={{ color: '#94a3b8', fontSize: 18 }}>›</span></div>
const Sheet = ({ show, onClose, title, children }) => <div style={{ ...s.sheetOverlay, ...(show ? s.sheetOverlayShow : {}) }} onClick={e => e.target === e.currentTarget && onClose()}><div style={{ ...s.sheet, ...(show ? s.sheetShow : {}) }}><div style={s.shHandle} /><div style={s.shdr}><span style={s.shtitle}>{title}</span><div style={s.shclose} onClick={onClose}>✕</div></div><div style={s.shbody}>{children}</div></div></div>
const SheetFoot = ({ children }) => <div style={s.shfoot}>{children}</div>

// ====== STYLES ======
const s = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 430, margin: '0 auto', background: '#f0f6ff', position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#0f172a' },
  loginBg: { minHeight: '100vh', background: 'linear-gradient(160deg,#0c1f3a 0%,#0284c7 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', maxWidth: 430, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  loginLogo: { width: 72, height: 72, background: 'rgba(255,255,255,.15)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1.5px solid rgba(255,255,255,.2)' },
  loginTitle: { color: '#fff', fontSize: 22, fontWeight: 700, textAlign: 'center' },
  loginSub: { color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 36 },
  lInput: { width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.15)', borderRadius: 12, fontSize: 15, color: '#fff', fontFamily: 'inherit', outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
  lBtn: { width: '100%', padding: 15, background: '#fff', border: 'none', borderRadius: 12, color: '#0284c7', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: 4 },
  lHint: { color: 'rgba(255,255,255,.3)', fontSize: 12, marginTop: 14 },
  loadingOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 800, gap: 12, backdropFilter: 'blur(4px)' },
  spinner: { width: 36, height: 36, border: '3px solid #e2eaf6', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  loadingTxt: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  toastwrap: { position: 'absolute', top: 66, left: 12, right: 12, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' },
  toast: { background: '#0f172a', color: '#fff', padding: '12px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 32px rgba(14,165,233,.15)' },
  toastOk: { background: '#16a34a' },
  toastErr: { background: '#ef4444' },
  topbar: { height: 56, background: '#fff', borderBottom: '1px solid #e2eaf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 50 },
  tbLogo: { width: 32, height: 32, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tbTitle: { fontSize: 15, fontWeight: 700 },
  tbSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  avatar: { width: 34, height: 34, background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: 80 },
  bnav: { height: 64, background: '#fff', borderTop: '1px solid #e2eaf6', display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 50 },
  ni: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', color: '#94a3b8', fontSize: 10.5, fontWeight: 600 },
  niActive: { color: '#0284c7' },
  fab: { position: 'absolute', bottom: 76, right: 16, width: 52, height: 52, background: '#0284c7', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, boxShadow: '0 4px 20px rgba(2,132,199,.4)', cursor: 'pointer', zIndex: 100 },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #e2eaf6', boxShadow: '0 2px 12px rgba(14,165,233,.10)', margin: '0 12px 12px', overflow: 'hidden' },
  ch: { padding: '14px 16px 10px', borderBottom: '1px solid #e2eaf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ct: { fontSize: 13.5, fontWeight: 700 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 12px 4px' },
  sc: { background: '#fff', borderRadius: 12, border: '1px solid #e2eaf6', padding: 14, boxShadow: '0 2px 12px rgba(14,165,233,.10)' },
  scVal: { fontSize: 21, fontWeight: 700, lineHeight: 1 },
  scLbl: { fontSize: 11.5, color: '#94a3b8', marginTop: 3, fontWeight: 500 },
  scTag: { fontSize: 10.5, fontWeight: 700, marginTop: 7, display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99 },
  li: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #e2eaf6', cursor: 'pointer' },
  liIco: { width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  liName: { fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  liSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  liAmt: { fontSize: 13.5, fontWeight: 700, fontFamily: 'monospace' },
  fi: { width: '100%', padding: '13px 14px', border: '1.5px solid #e2eaf6', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' },
  fl: { fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '.04em' },
  sec: { padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  secT: { fontSize: 15, fontWeight: 700 },
  secA: { fontSize: 12, color: '#0284c7', fontWeight: 600, cursor: 'pointer' },
  bill: { background: '#f4f8ff', border: '1.5px dashed #e2eaf6', borderRadius: 12, padding: 16, marginBottom: 14 },
  alertA: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 500, marginBottom: 12 },
  alertI: { background: '#e0f2fe', color: '#0284c7', border: '1px solid #0ea5e9', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 500 },
  chip: { flexShrink: 0, padding: '7px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#fff', border: '1.5px solid #e2eaf6', color: '#475569', fontFamily: 'inherit' },
  chipActive: { background: '#0284c7', borderColor: '#0284c7', color: '#fff' },
  btnP: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#0ea5e9', color: '#fff', boxSizing: 'border-box' },
  btnO: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', border: '1.5px solid #e2eaf6', color: '#475569', boxSizing: 'border-box' },
  btnD: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', border: '1.5px solid #fca5a5', boxSizing: 'border-box' },
  btnSm: { padding: '9px 14px', fontSize: 13, fontFamily: 'inherit', borderRadius: 12, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  btnSmO: { padding: '9px 14px', fontSize: 12, fontFamily: 'inherit', borderRadius: 12, background: 'transparent', border: '1.5px solid #e2eaf6', color: '#475569', cursor: 'pointer', fontWeight: 700 },
  lapCard: { background: '#fff', borderRadius: 12, border: '1px solid #e2eaf6', padding: 14 },
  sgLbl: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', padding: '0 4px', marginBottom: 8 },
  sgCard: { background: '#fff', borderRadius: 12, border: '1px solid #e2eaf6', overflow: 'hidden', marginBottom: 14 },
  sr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e2eaf6', cursor: 'pointer' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 500, opacity: 0, pointerEvents: 'none', transition: '.25s', backdropFilter: 'blur(3px)' },
  sheetOverlayShow: { opacity: 1, pointerEvents: 'all' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 501, transform: 'translateY(100%)', transition: '.3s cubic-bezier(.32,.72,0,1)', maxHeight: '93vh', display: 'flex', flexDirection: 'column' },
  sheetShow: { transform: 'translateY(0)' },
  shHandle: { width: 36, height: 4, background: '#e2eaf6', borderRadius: 99, margin: '10px auto 4px' },
  shdr: { padding: '8px 20px 14px', borderBottom: '1px solid #e2eaf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  shtitle: { fontSize: 15, fontWeight: 700 },
  shclose: { width: 30, height: 30, borderRadius: '50%', background: '#f0f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16, cursor: 'pointer' },
  shbody: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px', WebkitOverflowScrolling: 'touch' },
  shfoot: { padding: '12px 16px', borderTop: '1px solid #e2eaf6' },
}

import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const wargaList = [
  ]

  const { error: we } = await supabase.from('pam_warga').upsert(wargaList, { onConflict: 'id' })
  if (we) return res.status(500).json({ error: we.message })

  // Tagihan bulan lalu
  const now = new Date()
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const periode = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`
  const pem = [12, 9, 15, 8, 11]
  const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

  const tagihan = wargaList.map((w, i) => ({
    id: gid(),
    warga_id: w.id,
    periode,
    meter_awal: 0,
    meter_akhir: pem[i],
    pemakaian: pem[i],
    tarif: 2000,
    abonemen: 5000,
    total: pem[i] * 2000 + 5000,
    status: i < 3 ? 'lunas' : 'belum',
    tgl_bayar: i < 3 ? periode + '-15' : null,
    catatan: ''
  }))

  const { error: te } = await supabase.from('pam_tagihan').upsert(tagihan, { onConflict: 'id' })
  if (te) return res.status(500).json({ error: te.message })

  // Update meter_awal warga
  for (let i = 0; i < wargaList.length; i++) {
    await supabase.from('pam_warga').update({ meter_awal: pem[i] }).eq('id', wargaList[i].id)
  }

  return res.status(200).json({ success: true, message: 'Data awal berhasil dibuat' })
}

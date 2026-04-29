import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pam_tagihan')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const body = req.body
    if (!body.id || !body.warga_id) return res.status(400).json({ error: 'id dan warga_id wajib' })
    const { data, error } = await supabase
      .from('pam_tagihan')
      .upsert({
        id: body.id,
        warga_id: body.warga_id,
        periode: body.periode,
        meter_awal: body.meter_awal || 0,
        meter_akhir: body.meter_akhir || 0,
        pemakaian: body.pemakaian || 0,
        tarif: body.tarif || 2000,
        abonemen: body.abonemen || 5000,
        total: body.total || 0,
        status: body.status || 'belum',
        tgl_bayar: body.tgl_bayar || null,
        catatan: body.catatan || ''
      }, { onConflict: 'id' })
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  res.status(405).json({ error: 'Method not allowed' })
}

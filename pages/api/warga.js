import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pam_warga')
      .select('*')
      .order('id')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { id, nama, alamat, telp, tarif, meter_awal, status } = req.body
    if (!id || !nama) return res.status(400).json({ error: 'id dan nama wajib diisi' })
    const { data, error } = await supabase
      .from('pam_warga')
      .upsert({ id, nama, alamat: alamat || '', telp: telp || '', tarif: tarif || 2000, meter_awal: meter_awal || 0, status: status || 'aktif' }, { onConflict: 'id' })
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  res.status(405).json({ error: 'Method not allowed' })
}

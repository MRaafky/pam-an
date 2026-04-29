import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    const { nama, alamat, telp, tarif, meter_awal, status } = req.body
    const { data, error } = await supabase
      .from('pam_warga')
      .update({ nama, alamat, telp, tarif, meter_awal, status })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('pam_warga').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

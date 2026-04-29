import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    const body = req.body
    const { data, error } = await supabase
      .from('pam_tagihan')
      .update({
        warga_id: body.warga_id,
        periode: body.periode,
        meter_awal: body.meter_awal,
        meter_akhir: body.meter_akhir,
        pemakaian: body.pemakaian,
        tarif: body.tarif,
        abonemen: body.abonemen,
        total: body.total,
        status: body.status,
        tgl_bayar: body.tgl_bayar || null,
        catatan: body.catatan || ''
      })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('pam_tagihan').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

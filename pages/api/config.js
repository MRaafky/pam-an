import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('pam_config').select('*')
    if (error) return res.status(500).json({ error: error.message })
    // Convert array of {key, value} to object
    const config = { tarif: 2000, abonemen: 5000, desa: 'Semenharjo', pj: '', telp: '' }
    ;(data || []).forEach(row => { config[row.key] = row.value })
    config.tarif = parseInt(config.tarif) || 2000
    config.abonemen = parseInt(config.abonemen) || 5000
    return res.status(200).json(config)
  }

  if (req.method === 'POST') {
    const updates = req.body // { tarif, abonemen, desa, pj, telp }
    const entries = Object.entries(updates).map(([key, value]) => ({ key, value }))
    const { error } = await supabase
      .from('pam_config')
      .upsert(entries, { onConflict: 'key' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

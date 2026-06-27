import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

  // Idempotent: skip if today's quote already exists
  const { data: existing } = await supabase
    .from('daily_quotes')
    .select('quote_date')
    .eq('quote_date', today)
    .maybeSingle()
  if (existing) return res.status(200).json({ ok: true, skipped: true })

  // Prefer an unused quote; fall back to any if the pool is exhausted
  let { data: pool } = await supabase
    .from('quote_pool')
    .select('*')
    .eq('used', false)
    .limit(100)
  if (!pool || pool.length === 0) {
    const all = await supabase.from('quote_pool').select('*').limit(100)
    pool = all.data || []
  }
  if (pool.length === 0) return res.status(500).json({ error: 'quote_pool is empty' })

  const pick = pool[Math.floor(Math.random() * pool.length)]

  const { error: insertErr } = await supabase
    .from('daily_quotes')
    .insert({
      quote_date: today,
      text: pick.text,
      author: pick.author,
      pool_id: pick.id,
      commentary: pick.commentary,
      wiki_url: pick.wiki_url,
    })
  // A PK conflict means a concurrent run already inserted today — treat as success
  if (insertErr) return res.status(200).json({ ok: true, raced: true })

  await supabase.from('quote_pool').update({ used: true }).eq('id', pick.id)
  return res.status(200).json({ ok: true, quote: pick.text })
}

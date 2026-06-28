import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

// 1. The quote currently shown for today
const { data: current, error: curErr } = await supabase
  .from('daily_quotes')
  .select('*')
  .eq('quote_date', today)
  .maybeSingle()
if (curErr) throw curErr
if (!current) {
  console.error(`No daily quote for ${today} yet — nothing to replace.`)
  process.exit(1)
}

// 2. Pick a new unused quote, excluding the one on screen now
let { data: pool, error: poolErr } = await supabase
  .from('quote_pool')
  .select('*')
  .eq('used', false)
  .limit(100)
if (poolErr) throw poolErr
pool = (pool || []).filter((q) => q.id !== current.pool_id)
if (pool.length === 0) {
  console.error('No unused quotes left in quote_pool to swap in.')
  process.exit(1)
}
const pick = pool[Math.floor(Math.random() * pool.length)]

// 3. Overwrite today's row in place
const { error: updErr } = await supabase
  .from('daily_quotes')
  .update({
    text: pick.text,
    author: pick.author,
    pool_id: pick.id,
    commentary: pick.commentary,
    wiki_url: pick.wiki_url,
  })
  .eq('quote_date', today)
if (updErr) throw updErr

// 4. New pick is now used; keep the disliked one used so it won't retur
await supabase.from('quote_pool').update({ used: true }).eq('id', pick.id)
await supabase.from('quote_pool').update({ used: true }).eq('id', current.pool_id)

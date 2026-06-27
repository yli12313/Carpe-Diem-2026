import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY

const COMMENTARY_SCHEMA = {
  type: 'object',
  properties: {
    who: { type: 'string', description: 'One or two sentences on who the author is.' },
    meaning: { type: 'string', description: 'One or two sentences on what the quote means.' },
    application: { type: 'string', description: 'One or two sentences on how to apply it day-to-day.' },
  },
  required: ['who', 'meaning', 'application'],
  additionalProperties: false,
}

async function fetchWikipedia(author) {
  if (!author) return null
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CarpeDiemQuoteApp/1.0 (orbit196@gmail.com)' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.type === 'disambiguation' || !data.extract) return null
  return { extract: data.extract, url: data.content_urls?.desktop?.page ?? null }
}

async function generateCommentary(quote, author, wiki) {
  const context = wiki
    ? `Wikipedia summary of ${author}:\n${wiki.extract}`
    : 'There is no Wikipedia article available for this author.'

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system:
      'You write short, warm, practical commentary for a daily confidence-quote app. ' +
      'Ground "who" in the provided Wikipedia summary; do not invent biographical facts. ' +
      'Keep each field to one or two plain sentences, with no preamble.',
    output_config: { format: { type: 'json_schema', schema: COMMENTARY_SCHEMA } },
    messages: [
      {
        role: 'user',
        content:
          `Quote: "${quote}"\nAuthor: ${author || 'Unknown'}\n\n${context}\n\n` +
          'Write: who they are, what the quote means, and how it applies to daily life.',
      },
    ],
  })

  const block = msg.content.find((b) => b.type === 'text')
  return JSON.parse(block.text)
}

// 1. Fill in any quote_pool rows that don't have commentary yet.
const { data: pool, error: poolErr } = await supabase
  .from('quote_pool')
  .select('id, text, author')
  .is('commentary', null)
if (poolErr) { console.error(poolErr); process.exit(1) }

console.log(`Found ${pool.length} pool quotes needing commentary.`)
for (const q of pool) {
  try {
    const wiki = await fetchWikipedia(q.author)
    const commentary = await generateCommentary(q.text, q.author, wiki)
    const { error } = await supabase
      .from('quote_pool')
      .update({ commentary, wiki_url: wiki?.url ?? null })
      .eq('id', q.id)
    if (error) throw error
    console.log(`✓ ${q.author || 'Unknown'} — ${q.text.slice(0, 50)}...`)
  } catch (e) {
    console.error(`✗ id ${q.id}:`, e.message)
  }
}

// 2. Backfill already-published daily_quotes (matched by pool_id).
const { data: published, error: pubErr } = await supabase
  .from('daily_quotes')
  .select('quote_date, pool_id')
  .is('commentary', null)
  .not('pool_id', 'is', null)
if (pubErr) { console.error(pubErr); process.exit(1) }

console.log(`Syncing ${published.length} published quotes...`)
for (const row of published) {
  const { data: src } = await supabase
    .from('quote_pool')
    .select('commentary, wiki_url')
    .eq('id', row.pool_id)
    .single()
  if (!src?.commentary) continue
  await supabase
    .from('daily_quotes')
    .update({ commentary: src.commentary, wiki_url: src.wiki_url })
    .eq('quote_date', row.quote_date)
}
console.log('Done.')

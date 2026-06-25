import { createClient } from '@supabase/supabase-js'

const PAGES = ['Confidence', 'Self-esteem', 'Courage', 'Perseverance']

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function clean(s) {
  return s
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\[\]|]*\|)?([^\[\]]+)\]\]/g, '$1')
    .replace(/'''/g, '').replace(/''/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchWikitext(page) {
  const url = `https://en.wikiquote.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`
  const res = await fetch(url)
  const data = await res.json()
  return data.parse.wikitext['*']
}

function parseQuotes(wt) {
  const out = []
  let current = null
  for (const line of wt.split('\n')) {
    if (/^\*\*\s*/.test(line)) {
      if (current) {
        const author = clean(line.replace(/^\*\*\s*/, '')).split(/,| in | from /)[0].trim()
        out.push({ text: current, author })
        current = null
      }
    } else if (/^\*(?!\*)\s*/.test(line)) {
      current = clean(line.replace(/^\*\s*/, '')) || null
    }
  }
  return out
}

const seen = new Set()
const rows = []
for (const page of PAGES) {
  const wt = await fetchWikitext(page)
  for (const q of parseQuotes(wt)) {
    if (q.text.length < 40 || q.text.length > 280) continue
    if (seen.has(q.text)) continue
    seen.add(q.text)
    rows.push({ text: q.text, author: q.author || null })
  }
}

console.log(`Prepared ${rows.length} quotes. Inserting...`)
const { error } = await supabase.from('quote_pool').insert(rows)
if (error) {
  console.error('Insert failed:', error)
  process.exit(1)
}
console.log(`Done. Inserted ${rows.length} rows.`)

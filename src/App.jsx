import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function todayKey() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const yy = String(year).slice(2)
  return `${weekday}. ${mm}/${dd}/${yy}`
}

function App() {
  // history: { "2026-06-24": { text, author }, ... }
  const [history, setHistory] = useState({})
  const [selected, setSelected] = useState(todayKey())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('daily_quotes')
      .select('quote_date, text, author, commentary, wiki_url')
      .order('quote_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          setLoading(false)
          return
        }
        const map = {}
        for (const row of data) map[row.quote_date] = { text: row.text, author: row.author, commentary: row.commentary, wiki_url: row.wiki_url }
        setHistory(map)
        // default to today if it exists, otherwise the most recent day available
        const keys = Object.keys(map).sort((a, b) => b.localeCompare(a))
        if (!map[todayKey()] && keys.length) setSelected(keys[0])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  const dates = Object.keys(history).sort((a, b) => b.localeCompare(a))
  const quote = history[selected]

  return (
    <div className="app">
      <h1 className="title">Carpe Diem: A Daily Ignition for Your Confidence</h1>
      {dates.length === 0 ? (
        <p className="empty">Today's quote is on its way — check back shortly.</p>
      ) : (
        <div className="panels">
          <aside className="ledger">
            <span className="ledger-header">History</span>
            {dates.map(date => (
              <button
                key={date}
                className={`ledger-item ${date === selected ? 'active' : ''}`}
                onClick={() => setSelected(date)}
              >
                {formatDate(date)}
              </button>
            ))}
          </aside>
          <main className="quote-panel">
            {quote && (
              <>
                <p className="quote">"{quote.text}"</p>
                <p className="author">— {quote.author}</p>
                {quote.commentary && (
                  <div className="commentary">
                    <h3 className="commentary-heading">Commentary</h3>
                    <p><span className="commentary-label">Who:</span> {quote.commentary.who}</p>
                    <p><span className="commentary-label">Meaning:</span> {quote.commentary.meaning}</p>
                    <p><span className="commentary-label">In Practice:</span> {quote.commentary.application}</p>
                    {quote.wiki_url && (
                      <a className="commentary-link" href={quote.wiki_url} target="_blank" rel="noopener noreferrer">
                        Read more on Wikipedia →
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default App

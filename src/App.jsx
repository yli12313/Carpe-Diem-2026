import { useState, useEffect } from 'react'
import './App.css'

function todayKey() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function datesBetween(startKey, endKey) {
  const [sy, sm, sd] = startKey.split('-').map(Number)
  const [ey, em, ed] = endKey.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const out = []
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

async function fetchQuote() {
  const res = await fetch('https://zenquotes.io/api/random')
  const data = await res.json()
  return { text: data[0].q, author: data[0].a }
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

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('quotes_history')) || {}
  } catch {
    return {}
  }
}

function saveHistory(history) {
  localStorage.setItem('quotes_history', JSON.stringify(history))
}

function App() {
  // history: { "2026-05-20": { text, author }, ... }
  const [history, setHistory] = useState({})
  const [selected, setSelected] = useState(todayKey()) // default to today
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = loadHistory()
    const today = todayKey()

    const START_DATE = '2026-05-21'
    const existing = Object.keys(stored).sort()
    const earliest = existing[0]
    const startDate = earliest && earliest < START_DATE ? earliest : START_DATE
    const missing = datesBetween(startDate, today).filter(d => !stored[d])

    if (missing.length === 0) {
      setHistory(stored)
      setLoading(false)
      return
    }

    Promise.all(missing.map(date => fetchQuote().then(q => [date, q])))
      .then(entries => {
        const updated = { ...stored }
        for (const [date, q] of entries) updated[date] = q
        saveHistory(updated)
        setHistory(updated)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  // sort dates newest first for the ledger
  const dates = Object.keys(history).sort((a, b) => b.localeCompare(a))
  const quote = history[selected]

  return (
    <div className="app">
      <h1 className="title">Carpe Diem: A Daily Ignition for Your Confidence</h1>
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
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

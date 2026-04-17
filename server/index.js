require('dotenv').config()
const express = require('express')
const cors = require('cors')
const webpush = require('web-push')
const db = require('./db')
require('./scheduler')

const app = express()
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://med-tracker-liart.vercel.app'
  ]
}))
app.use(express.json())

// ── VAPID setup ──────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// ── Routes ───────────────────────────────────────────────

// Save push subscription from browser
app.post('/api/subscribe', (req, res) => {
  const { subscription } = req.body
  if (!subscription) return res.status(400).json({ error: 'No subscription' })

  // Only keep one subscription (single user)
  db.prepare('DELETE FROM subscriptions').run()
  db.prepare('INSERT INTO subscriptions (subscription) VALUES (?)').run(
    JSON.stringify(subscription)
  )
  res.json({ ok: true })
})

// Save medication config from frontend
app.post('/api/config', (req, res) => {
  const { medications } = req.body
  if (!medications) return res.status(400).json({ error: 'No medications' })

  db.prepare('DELETE FROM config').run()
  db.prepare('INSERT INTO config (medications) VALUES (?)').run(
    JSON.stringify(medications)
  )
  res.json({ ok: true })
})

// Get config
app.get('/api/config', (req, res) => {
  const row = db.prepare('SELECT medications FROM config LIMIT 1').get()
  if (!row) return res.json({ medications: [] })
  res.json({ medications: JSON.parse(row.medications) })
})

// Send a test notification (for testing)
app.post('/api/test-notify', async (req, res) => {
  const row = db.prepare('SELECT subscription FROM subscriptions LIMIT 1').get()
  if (!row) return res.status(404).json({ error: 'No subscription found' })

  try {
    await webpush.sendNotification(
      JSON.parse(row.subscription),
      JSON.stringify({
        title: '💊 MedBuddy',
        body: 'This is a test notification! Tap to open the app.',
      })
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Push error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Save logs
app.post('/api/logs', (req, res) => {
  const { logs } = req.body
  if (!logs) return res.status(400).json({ error: 'No logs' })
  db.prepare('DELETE FROM logs').run()
  db.prepare('INSERT INTO logs (logs) VALUES (?)').run(JSON.stringify(logs))
  res.json({ ok: true })
})

// Get logs
app.get('/api/logs', (req, res) => {
  const row = db.prepare('SELECT logs FROM logs LIMIT 1').get()
  if (!row) return res.json({ logs: {} })
  res.json({ logs: JSON.parse(row.logs) })
})

// ── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`))
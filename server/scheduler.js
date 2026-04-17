const cron = require('node-cron')
const webpush = require('web-push')
const db = require('./db')

// Runs every minute
cron.schedule('* * * * *', async () => {
  // Get subscription
  const subRow = db.prepare('SELECT subscription FROM subscriptions LIMIT 1').get()
  if (!subRow) return

  // Get medications + timezone
  const configRow = db.prepare('SELECT medications, timezone FROM config LIMIT 1').get()
  if (!configRow) return

  const medications = JSON.parse(configRow.medications)
  const subscription = JSON.parse(subRow.subscription)
  const timezone = configRow.timezone || 'America/New_York'

  // Get current time in user's timezone
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false
  }).formatToParts(now)

  const currentTime = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`
  const currentDay = parts.find(p => p.type === 'weekday').value.toLowerCase()

  // Find meds due right now
  const dueMeds = medications.filter(med => {
    return med.days.includes(currentDay) && med.times.includes(currentTime)
  })

  if (dueMeds.length === 0) return

  // Build notification message
  const names = dueMeds.map(m => `${m.name} (${m.dosage})`).join(', ')
  const title = dueMeds.length === 1
    ? `💊 Time for ${dueMeds[0].name}`
    : `💊 Time for ${dueMeds.length} medications`
  const body = dueMeds.length === 1
    ? `Take ${dueMeds[0].dosage} now. Tap to log it.`
    : `${names}. Tap to log them.`

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    )
    console.log(`[${currentTime} ${timezone}] Notification sent for: ${names}`)
  } catch (err) {
    console.error('Push failed:', err.message)
  }
})

console.log('Scheduler started')
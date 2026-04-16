const cron = require('node-cron')
const webpush = require('web-push')
const db = require('./db')

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Runs every minute
cron.schedule('* * * * *', async () => {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDay = DAYS[now.getDay()]

  // Get subscription
  const subRow = db.prepare('SELECT subscription FROM subscriptions LIMIT 1').get()
  if (!subRow) return

  // Get medications
  const configRow = db.prepare('SELECT medications FROM config LIMIT 1').get()
  if (!configRow) return

  const medications = JSON.parse(configRow.medications)
  const subscription = JSON.parse(subRow.subscription)

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
    console.log(`[${currentTime}] Notification sent for: ${names}`)
  } catch (err) {
    console.error('Push failed:', err.message)
  }
})

console.log('Scheduler started')
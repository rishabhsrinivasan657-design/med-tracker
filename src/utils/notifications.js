// No BACKEND constant needed anymore — Vite proxy handles it locally,
// and in production this file gets rebuilt with the correct VITE_API_URL

const BACKEND = import.meta.env.VITE_API_URL || ''

const VAPID_PUBLIC_KEY = 'BPZLzLntnCXDlm0VXq8gAaHnYbBgT6WFcdIcZ_QAyPGgQQ_uEYOrma4ltqWNftdyLG2bINlddoxN93tz1HhhcZk'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported')
    return null
  }
  const reg = await navigator.serviceWorker.register('/sw.js')
  console.log('Service worker registered')
  return reg
}

export async function subscribeToPush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await sendSubscriptionToServer(existing)
      return existing
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await sendSubscriptionToServer(subscription)
    return subscription
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

async function sendSubscriptionToServer(subscription) {
  await fetch(`${BACKEND}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  })
}

export async function syncConfigToServer(medications) {
  await fetch(`${BACKEND}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medications }),
  })
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

export async function syncLogsToServer(logs) {
  await fetch(`${BACKEND}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs }),
  })
}

export async function fetchLogsFromServer() {
  const res = await fetch(`${BACKEND}/api/logs`)
  const data = await res.json()
  return data.logs || {}
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerServiceWorker, subscribeToPush, requestNotificationPermission, syncLogsToServer, fetchLogsFromServer } from '../utils/notifications'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const MILESTONE_MESSAGES = [
  "You're on fire! 🔥 Keep it up!",
  "So proud of you! 💊 You're doing amazing!",
  "10 more days stronger! 🌸 You've got this!",
  "Look at you go! ✨ Absolutely killing it!",
  "Your body thanks you! 💪 Keep going!",
]

// ── LOCAL DATE HELPERS (timezone-safe) ──────────────────
function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayKey() {
  return getLocalDateKey()
}

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

function getDateDisplay() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function getTodayShort() {
  return DAYS[new Date().getDay()]
}
// ────────────────────────────────────────────────────────

function missedYesterday(logs, medications) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const key = getLocalDateKey(yesterday)
  const dayShort = DAYS[yesterday.getDay()]
  const medsForDay = medications.filter(m => m.days.includes(dayShort))
  if (medsForDay.length === 0) return false
  const log = logs[key]
  if (!log) return true
  return !medsForDay.every(m => log[m.id] === 'taken')
}

function getLogs() {
  try { return JSON.parse(localStorage.getItem('medbuddy_logs') || '{}') }
  catch { return {} }
}

function getConfig() {
  try { return JSON.parse(localStorage.getItem('medbuddy_config') || '{}') }
  catch { return {} }
}

function getMedsForToday(medications) {
  const today = getTodayShort()
  return medications.filter(m => m.days.includes(today))
}

function calculateStreak(logs, medications) {
  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = getLocalDateKey(d)
    const dayShort = DAYS[d.getDay()]
    const medsForDay = medications.filter(m => m.days.includes(dayShort))

    if (medsForDay.length === 0) continue

    const log = logs[key]
    if (!log) {
      if (i === 0) break
      break
    }
    const allTaken = medsForDay.every(m => log[m.id] === 'taken')
    if (!allTaken) break
    streak++
  }
  return streak
}

function getLast30Days(logs, medications) {
  const days = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = getLocalDateKey(d)
    const dayShort = DAYS[d.getDay()]
    const medsForDay = medications.filter(m => m.days.includes(dayShort))

    if (medsForDay.length === 0) {
      days.push({ key, status: 'none' })
      continue
    }

    const log = logs[key]
    if (!log) {
      days.push({ key, status: i === 0 ? 'today' : 'missed' })
      continue
    }

    const allTaken = medsForDay.every(m => log[m.id] === 'taken')
    days.push({ key, status: allTaken ? 'taken' : 'missed' })
  }
  return days
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

const MONTH_QUIPS = [
  (m) => `A "New Year" resolution that actually stuck. ${m} is yours! 🎆`,
  (m) => `Budget session over: ${m} gains are looking very profitable! 📈`,
  (m) => `Don't let your fitness goals fade like ${m} colors! 🎨`,
  (m) => `April showers? More like ${m} power! No April Fools here. 💪`,
  (m) => `May the Health be with you! (Even in this 45°C heat) 🌟`,
  (m) => `Sweating more than a monsoon cloud! ${m} conquered. 🌧️`,
  (m) => `Feeling "Independence" from your old habits this ${m}! 🇮🇳`,
  (m) => `A-gust of wind couldn't stop you. You're the real Boss. 🦁`,
  (m) => `Modak-vated to stay fit! Crushing ${m} like a pro. 🐘`,
  (m) => `A "Shubh" month for your health. ${m} was electric! 🪔`,
  (m) => `No "Chilling" in ${m}—only burning those calories! ❄️`,
  (m) => `Ending ${m} with a "Biryani" level of satisfaction! 🍗`,
]

function isLastDayOfMonth() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  return tomorrow.getMonth() !== today.getMonth()
}

function getCurrentMonthGrid(logs, medications) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const cells = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = getLocalDateKey(date)
    const dayShort = DAYS[date.getDay()]
    const medsForDay = medications.filter(m => m.days.includes(dayShort))
    const isToday = d === today.getDate()
    const isFuture = d > today.getDate()

    if (medsForDay.length === 0) { cells.push({ d, key, status: 'none', isToday, isFuture }); continue }
    if (isFuture) { cells.push({ d, key, status: 'future', isToday, isFuture }); continue }

    const log = logs[key]
    if (!log) { cells.push({ d, key, status: isToday ? 'today' : 'missed', isToday, isFuture }); continue }
    const allTaken = medsForDay.every(m => log[m.id] === 'taken')
    cells.push({ d, key, status: allTaken ? 'taken' : 'missed', isToday, isFuture })
  }
  return { cells, firstDay }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [config] = useState(getConfig())
  const [logs, setLogs] = useState(getLogs())
  const [showAllMeds, setShowAllMeds] = useState(false)
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [milestoneMsg, setMilestoneMsg] = useState(null)
  const [monthMsg, setMonthMsg] = useState(null)

  const medications = config.medications || []
  const todayMeds = getMedsForToday(medications)
  const todayKey = getTodayKey()
  const todayLog = logs[todayKey] || {}

  const allTakenToday = todayMeds.length > 0 && todayMeds.every(m => todayLog[m.id] === 'taken')
  const missedYest = missedYesterday(logs, medications)
  const streak = calculateStreak(logs, medications)
  const last30 = getLast30Days(logs, medications)
  const takenCount = todayMeds.filter(m => todayLog[m.id] === 'taken').length
  const totalCount = todayMeds.length
  const { cells: monthCells, firstDay } = getCurrentMonthGrid(logs, medications)

  useEffect(() => {
    const init = async () => {
      await registerServiceWorker()
      const permission = await requestNotificationPermission()
      setNotifStatus(permission)
      if (permission === 'granted') await subscribeToPush()

      try {
        const serverLogs = await fetchLogsFromServer()
        if (Object.keys(serverLogs).length > 0) {
          setLogs(serverLogs)
          localStorage.setItem('medbuddy_logs', JSON.stringify(serverLogs))
        }
      } catch (e) {
        // offline — localStorage fallback already loaded in useState
      }
    }
    init()
  }, [])

  const checkMilestone = (newLogs) => {
    const newStreak = calculateStreak(newLogs, medications)
    if (newStreak > 0 && newStreak % 10 === 0) {
      const msg = MILESTONE_MESSAGES[Math.floor(newStreak / 10 - 1) % MILESTONE_MESSAGES.length]
      setMilestoneMsg({ streak: newStreak, msg })
    }

    if (isLastDayOfMonth()) {
      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const allMonthTaken = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const date = new Date(year, month, d)
        const key = getLocalDateKey(date)
        const dayShort = DAYS[date.getDay()]
        const medsForDay = medications.filter(m => m.days.includes(dayShort))
        if (medsForDay.length === 0) return true
        const log = newLogs[key]
        if (!log) return false
        return medsForDay.every(m => log[m.id] === 'taken')
      }).every(Boolean)

      if (allMonthTaken) {
        const monthIndex = month % 12
        const monthName = MONTH_NAMES[monthIndex]
        const quip = MONTH_QUIPS[monthIndex](monthName)
        setMonthMsg({ month: monthName, quip })
      }
    }
  }

  const markTaken = (medId) => {
    const updated = {
      ...logs,
      [todayKey]: { ...todayLog, [medId]: 'taken' }
    }
    setLogs(updated)
    localStorage.setItem('medbuddy_logs', JSON.stringify(updated))
    syncLogsToServer(updated).catch(() => {})
    checkMilestone(updated)
  }

  const markAllTaken = () => {
    const updatedToday = {}
    todayMeds.forEach(m => updatedToday[m.id] = 'taken')
    const updated = { ...logs, [todayKey]: { ...todayLog, ...updatedToday } }
    setLogs(updated)
    localStorage.setItem('medbuddy_logs', JSON.stringify(updated))
    syncLogsToServer(updated).catch(() => {})
    checkMilestone(updated)
  }

  return (
    <div style={styles.container}>

      {/* ── MILESTONE POPUP ── */}
      {milestoneMsg && (
        <div style={styles.milestoneOverlay} onClick={() => setMilestoneMsg(null)}>
          <div style={styles.milestoneCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <div style={styles.milestoneStreak}>{milestoneMsg.streak} days!</div>
            <div style={styles.milestoneMsg}>{milestoneMsg.msg}</div>
            <button style={styles.milestoneBtn} onClick={() => setMilestoneMsg(null)}>
              Thank you! 💊
            </button>
          </div>
        </div>
      )}

      {/* ── MONTH END POPUP ── */}
      {monthMsg && (
        <div style={styles.milestoneOverlay} onClick={() => setMonthMsg(null)}>
          <div style={styles.milestoneCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem' }}>🗓️</div>
            <div style={styles.milestoneStreak}>{monthMsg.month} complete!</div>
            <div style={styles.milestoneMsg}>{monthMsg.quip}</div>
            <button style={styles.milestoneBtn} onClick={() => setMonthMsg(null)}>
              Let's keep going! 🌸
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div>
          <div style={styles.dayLabel}>{getDayName()}</div>
          <div style={styles.dateLabel}>{getDateDisplay()}</div>
        </div>
        <button style={styles.settingsBtn} onClick={() => navigate('/settings')} title="Settings">
          ⚙️
        </button>
      </div>

      {/* ── NOTIFICATION BANNER ── */}
      {notifStatus !== 'granted' && (
        <div style={styles.notifBanner}>
          <span>🔔 Enable notifications to get med reminders</span>
          <button
            style={styles.notifBtn}
            onClick={async () => {
              const permission = await requestNotificationPermission()
              setNotifStatus(permission)
              if (permission === 'granted') await subscribeToPush()
            }}
          >
            Enable
          </button>
        </div>
      )}

      {/* ── MISSED YESTERDAY BANNER ── */}
      {missedYest && !allTakenToday && (
        <div style={styles.missedBanner}>
          <span>😔 You missed yesterday — don't break the streak again today!</span>
        </div>
      )}

      {/* ── STREAK CARD ── */}
      <div style={styles.streakCard}>
        <div style={styles.streakTop}>
          <span style={styles.streakEmoji}>{streak >= 7 ? '🔥' : '💊'}</span>
          <span style={styles.streakNumber}>{streak}</span>
        </div>
        <div style={styles.streakLabel}>day streak</div>
        {allTakenToday && (
          <div style={styles.streakBadge}>✓ All done today!</div>
        )}
      </div>

      {/* ── TODAY'S MEDS ── */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Today's meds</span>
          <span style={styles.sectionMeta}>{takenCount}/{totalCount} taken</span>
        </div>

        {todayMeds.length === 0 ? (
          <div style={styles.emptyCard}>
            <span style={{ fontSize: '1.5rem' }}>🎉</span>
            <span style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>No meds scheduled today!</span>
          </div>
        ) : (
          <>
            {todayMeds.map(med => {
              const taken = todayLog[med.id] === 'taken'
              return (
                <div key={med.id} style={{
                  ...styles.medRow,
                  background: taken ? 'var(--pink-100)' : 'var(--white)',
                  borderColor: taken ? 'var(--pink-300)' : 'var(--pink-200)',
                }}>
                  <div style={styles.medInfo}>
                    <div style={styles.medRowName}>{med.name}</div>
                    <div style={styles.medRowMeta}>{med.dosage} · {med.times.join(', ')}</div>
                  </div>
                  <button
                    style={{
                      ...styles.checkBtn,
                      background: taken ? 'var(--pink-400)' : 'var(--white)',
                      border: taken ? '2px solid var(--pink-400)' : '2px solid var(--pink-200)',
                      color: taken ? 'var(--white)' : 'var(--pink-300)',
                    }}
                    onClick={() => !taken && markTaken(med.id)}
                  >
                    {taken ? '✓' : '○'}
                  </button>
                </div>
              )
            })}
            {!allTakenToday && (
              <button style={styles.markAllBtn} onClick={markAllTaken}>
                Mark all as taken
              </button>
            )}
          </>
        )}
      </div>

      {/* ── CURRENT MONTH HEATMAP ── */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div style={styles.calGrid}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={styles.calDayLabel}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthCells.map(cell => (
            <div
              key={cell.key}
              style={{
                ...styles.calCell,
                background:
                  cell.status === 'taken' ? 'var(--pink-400)' :
                  cell.status === 'missed' ? 'var(--pink-100)' :
                  cell.status === 'today' ? 'var(--pink-200)' :
                  'transparent',
                color:
                  cell.status === 'taken' ? 'white' :
                  cell.status === 'missed' ? 'var(--pink-300)' :
                  cell.status === 'today' ? 'var(--pink-400)' :
                  'var(--gray-300)',
                border: '1.5px solid',
                borderColor:
                  cell.status === 'taken' ? 'var(--pink-400)' :
                  cell.status === 'today' ? 'var(--pink-400)' :
                  cell.status === 'missed' ? 'var(--pink-200)' :
                  'transparent',
                fontWeight: cell.isToday ? 700 : 400,
              }}
            >
              {cell.d}
            </div>
          ))}
        </div>

        <div style={styles.heatmapLegend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: 'var(--pink-400)' }} />
            <span>Taken</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: 'var(--pink-100)', border: '1px solid var(--pink-200)' }} />
            <span>Missed</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: 'var(--pink-200)', border: '2px solid var(--pink-400)' }} />
            <span>Today</span>
          </div>
        </div>

        <button style={styles.historyBtn} onClick={() => navigate('/history')}>
          📅 View history
        </button>
      </div>

      {/* ── STATS ── */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{streak}</div>
          <div style={styles.statLabel}>Current streak</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {(() => {
              const taken = last30.filter(d => d.status === 'taken').length
              const relevant = last30.filter(d => d.status !== 'none').length
              return relevant === 0 ? '—' : Math.round((taken / relevant) * 100) + '%'
            })()}
          </div>
          <div style={styles.statLabel}>This month</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{last30.filter(d => d.status === 'taken').length}</div>
          <div style={styles.statLabel}>Days taken</div>
        </div>
      </div>

      {/* ── ALL MEDS LIST ── */}
      <div style={styles.section}>
        <button style={styles.toggleBtn} onClick={() => setShowAllMeds(s => !s)}>
          {showAllMeds ? '▲ Hide medications' : '▼ All medications'}
        </button>
        {showAllMeds && medications.map(med => (
          <div key={med.id} style={styles.allMedRow}>
            <div style={styles.medRowName}>{med.name}</div>
            <div style={styles.medRowMeta}>
              {med.dosage} · {med.days.length === 7 ? 'Every day' : med.days.join(', ')} · {med.times.join(', ')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: '2rem' }} />
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100dvh',
    padding: 'calc(env(safe-area-inset-top) + 1.5rem) 1.25rem calc(env(safe-area-inset-bottom) + 1.5rem)',
    background: 'linear-gradient(160deg, var(--pink-50) 0%, var(--white) 60%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    maxWidth: '480px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: 'var(--gray-800)',
    lineHeight: 1.1,
  },
  dateLabel: {
    fontSize: '0.9rem',
    color: 'var(--gray-400)',
    marginTop: '2px',
  },
  settingsBtn: {
    background: 'var(--white)',
    border: '2px solid var(--pink-200)',
    borderRadius: 'var(--radius-sm)',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBanner: {
    background: 'var(--pink-100)',
    border: '2px solid var(--pink-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: 'var(--gray-800)',
    gap: '1rem',
  },
  missedBanner: {
    background: '#fff3e0',
    border: '2px solid #ffb74d',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    color: '#e65100',
    fontWeight: 500,
  },
  notifBtn: {
    background: 'var(--pink-400)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.4rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  streakCard: {
    background: 'linear-gradient(135deg, var(--pink-400), var(--pink-300))',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    boxShadow: '0 8px 32px rgba(249, 81, 126, 0.25)',
  },
  streakTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  streakEmoji: { fontSize: '2.5rem' },
  streakNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '5rem',
    color: 'var(--white)',
    lineHeight: 1,
  },
  streakLabel: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  streakBadge: {
    marginTop: '0.75rem',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '99px',
    padding: '0.4rem 1.2rem',
    color: 'var(--white)',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    color: 'var(--gray-800)',
  },
  sectionMeta: {
    fontSize: '0.85rem',
    color: 'var(--gray-400)',
    fontWeight: 500,
  },
  emptyCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-sm)',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    boxShadow: 'var(--shadow)',
  },
  medRow: {
    borderRadius: 'var(--radius-sm)',
    padding: '1rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '2px solid',
    transition: 'all 0.2s',
    boxShadow: 'var(--shadow)',
  },
  medInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  medRowName: {
    fontWeight: 600,
    fontSize: '1rem',
    color: 'var(--gray-800)',
  },
  medRowMeta: {
    fontSize: '0.8rem',
    color: 'var(--gray-400)',
  },
  checkBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  markAllBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--pink-400)',
    color: 'var(--white)',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  heatmap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gap: '5px',
  },
  heatCell: {
    aspectRatio: '1',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  heatmapLegend: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    color: 'var(--gray-400)',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.75rem',
  },
  statCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    boxShadow: 'var(--shadow)',
  },
  statNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--pink-400)',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: 'var(--gray-400)',
    fontWeight: 500,
    textAlign: 'center',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--pink-400)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
  },
  allMedRow: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  milestoneOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(249, 81, 126, 0.3)',
    backdropFilter: 'blur(6px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  milestoneCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: 'var(--shadow-md)',
    textAlign: 'center',
  },
  milestoneStreak: {
    fontFamily: 'var(--font-display)',
    fontSize: '3rem',
    color: 'var(--pink-400)',
    lineHeight: 1,
  },
  milestoneMsg: {
    fontSize: '1.1rem',
    color: 'var(--gray-600)',
    lineHeight: 1.6,
  },
  milestoneBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--pink-400)',
    color: 'var(--white)',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  calDayLabel: {
    textAlign: 'center',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--gray-400)',
    paddingBottom: '2px',
  },
  calCell: {
    aspectRatio: '1',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.72rem',
  },
  historyBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--pink-400)',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: '2px solid var(--pink-200)',
    cursor: 'pointer',
  },
}
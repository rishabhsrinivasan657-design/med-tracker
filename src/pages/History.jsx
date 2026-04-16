import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function getLogs() {
  try { return JSON.parse(localStorage.getItem('medbuddy_logs') || '{}') }
  catch { return {} }
}

function getConfig() {
  try { return JSON.parse(localStorage.getItem('medbuddy_config') || '{}') }
  catch { return {} }
}

function getMonthsWithData(logs) {
  const keys = Object.keys(logs).sort().reverse()
  const seen = new Set()
  keys.forEach(k => seen.add(k.slice(0, 7)))
  const today = new Date()
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  seen.delete(currentMonthKey)
  return [...seen]
}

function getMonthGrid(yearMonth, logs, medications) {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const dayShort = DAYS[date.getDay()]
    const medsForDay = medications.filter(m => m.days.includes(dayShort))

    if (medsForDay.length === 0) {
      cells.push({ d, key, status: 'none' })
      continue
    }

    const log = logs[key]
    if (!log) { cells.push({ d, key, status: 'missed' }); continue }
    const allTaken = medsForDay.every(m => log[m.id] === 'taken')
    cells.push({ d, key, status: allTaken ? 'taken' : 'missed' })
  }
  return cells
}

function getMonthStats(cells) {
  const relevant = cells.filter(c => c.status !== 'none')
  const taken = cells.filter(c => c.status === 'taken').length
  const missed = cells.filter(c => c.status === 'missed').length
  const pct = relevant.length === 0 ? 0 : Math.round((taken / relevant.length) * 100)
  return { taken, missed, pct }
}

function MonthCard({ yearMonth, logs, medications }) {
  const [open, setOpen] = useState(false)
  const [year, month] = yearMonth.split('-').map(Number)
  const cells = getMonthGrid(yearMonth, logs, medications)
  const stats = getMonthStats(cells)
  const firstDay = new Date(year, month - 1, 1).getDay()

  return (
    <div style={styles.monthCard}>
      <button style={styles.monthHeader} onClick={() => setOpen(o => !o)}>
        <div>
          <div style={styles.monthName}>{MONTH_NAMES[month - 1]} {year}</div>
          <div style={styles.monthMeta}>{stats.pct}% taken · {stats.missed} missed</div>
        </div>
        <div style={{
          ...styles.monthChevron,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>▼</div>
      </button>

      {open && (
        <div style={styles.monthBody}>
          {/* Day labels */}
          <div style={styles.calGrid}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={styles.dayLabel}>{d}</div>
            ))}
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {cells.map(cell => (
              <div
                key={cell.key}
                style={{
                  ...styles.calCell,
                  background:
                    cell.status === 'taken' ? 'var(--pink-400)' :
                    cell.status === 'missed' ? 'var(--pink-100)' :
                    'transparent',
                  color:
                    cell.status === 'taken' ? 'white' :
                    cell.status === 'missed' ? 'var(--pink-300)' :
                    'var(--gray-300)',
                  border: cell.status === 'none' ? 'none' : '1.5px solid',
                  borderColor:
                    cell.status === 'taken' ? 'var(--pink-400)' :
                    cell.status === 'missed' ? 'var(--pink-200)' :
                    'transparent',
                }}
              >
                {cell.d}
              </div>
            ))}
          </div>

          {/* Month stats */}
          <div style={styles.statsRow}>
            <div style={styles.statChip}>
              <div style={styles.statNum}>{stats.taken}</div>
              <div style={styles.statLbl}>taken</div>
            </div>
            <div style={styles.statChip}>
              <div style={styles.statNum}>{stats.missed}</div>
              <div style={styles.statLbl}>missed</div>
            </div>
            <div style={styles.statChip}>
              <div style={styles.statNum}>{stats.pct}%</div>
              <div style={styles.statLbl}>rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const logs = getLogs()
  const config = getConfig()
  const medications = config.medications || []
  const months = getMonthsWithData(logs)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 style={styles.title}>History</h1>
        <div style={{ width: 60 }} />
      </div>

      {months.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '2rem' }}>📅</div>
          <div style={{ color: 'var(--gray-400)', fontSize: '0.95rem' }}>No history yet — check back next month!</div>
        </div>
      ) : (
        <div style={styles.list}>
          {months.map(m => (
            <MonthCard key={m} yearMonth={m} logs={logs} medications={medications} />
          ))}
        </div>
      )}
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
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    color: 'var(--gray-800)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--pink-400)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    width: 60,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '4rem',
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  monthCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  monthHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  monthName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    color: 'var(--gray-800)',
  },
  monthMeta: {
    fontSize: '0.8rem',
    color: 'var(--gray-400)',
    marginTop: '2px',
  },
  monthChevron: {
    fontSize: '0.75rem',
    color: 'var(--pink-400)',
    transition: 'transform 0.2s',
  },
  monthBody: {
    padding: '0 1.25rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderTop: '1px solid var(--pink-100)',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    paddingTop: '0.75rem',
  },
  dayLabel: {
    textAlign: 'center',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--gray-400)',
    paddingBottom: '4px',
  },
  calCell: {
    aspectRatio: '1',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.5rem',
  },
  statChip: {
    background: 'var(--pink-50)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.6rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    color: 'var(--pink-400)',
  },
  statLbl: {
    fontSize: '0.7rem',
    color: 'var(--gray-400)',
  },
}
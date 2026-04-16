import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { syncConfigToServer } from '../utils/notifications'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS = { sun: 'S', mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S' }
const ALL_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function emptyMed() {
  return {
    id: Date.now().toString(),
    name: '',
    dosage: '',
    days: [...ALL_DAYS],
    frequency: 1,
    times: ['08:00'],
  }
}

export default function Onboarding() {
  const navigate = useNavigate()

  const [globalStep, setGlobalStep] = useState('welcome')
  const [medStep, setMedStep] = useState(0)
  const [medications, setMedications] = useState([])
  const [currentMed, setCurrentMed] = useState(emptyMed())

  const nextMedStep = () => setMedStep(s => s + 1)
  const backMedStep = () => {
    if (medStep === 0) {
      if (medications.length === 0) setGlobalStep('welcome')
      else setGlobalStep('review_all')
    } else {
      setMedStep(s => s - 1)
    }
  }

  const toggleDay = (day) => {
    const days = currentMed.days.includes(day)
      ? currentMed.days.filter(d => d !== day)
      : [...currentMed.days, day]
    setCurrentMed({ ...currentMed, days })
  }

  const setAllDays = () => setCurrentMed({ ...currentMed, days: [...ALL_DAYS] })

  const setFrequency = (freq) => {
    const defaults = ['08:00', '14:00', '20:00', '22:00']
    const times = Array.from({ length: freq }, (_, i) => defaults[i])
    setCurrentMed({ ...currentMed, frequency: freq, times })
  }

  const updateTime = (index, value) => {
    const times = [...currentMed.times]
    times[index] = value
    setCurrentMed({ ...currentMed, times })
  }

  const saveMed = () => {
    setMedications(prev => {
      const exists = prev.find(m => m.id === currentMed.id)
      if (exists) return prev.map(m => m.id === currentMed.id ? currentMed : m)
      return [...prev, currentMed]
    })
    setGlobalStep('review_all')
    setMedStep(0)
  }

  const addAnotherMed = () => {
    setCurrentMed(emptyMed())
    setMedStep(0)
    setGlobalStep('add_med')
  }

  const editMed = (med) => {
    setCurrentMed(med)
    setMedStep(0)
    setGlobalStep('add_med')
  }

  const removeMed = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  const finish = async () => {
    localStorage.setItem('medbuddy_setup', 'true')
    localStorage.setItem('medbuddy_config', JSON.stringify({ medications }))
    try {
      await syncConfigToServer(medications)
    } catch (err) {
      console.warn('Could not sync to server:', err)
    }
    navigate('/dashboard')
  }

  const formatDays = (days) => {
    if (days.length === 7) return 'Every day'
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
  }

  return (
    <div style={styles.container}>

      {/* ── WELCOME ── */}
      {globalStep === 'welcome' && (
        <div style={styles.card}>
          <div style={styles.stepContent}>
            <div style={styles.emoji}>💊</div>
            <h1 style={styles.title}>Hey there.</h1>
            <p style={styles.subtitle}>
              Let's set up your medication tracker. Add all your meds once — and we'll remind you every day.
            </p>
            <button style={styles.btn} onClick={() => setGlobalStep('add_med')}>
              Let's go →
            </button>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MED ── */}
      {globalStep === 'add_med' && (
        <>
          <div style={styles.dots}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                ...styles.dot,
                background: i <= medStep ? 'var(--pink-400)' : 'var(--pink-200)',
                width: i === medStep ? '20px' : '8px',
              }} />
            ))}
          </div>

          <div style={styles.card}>

            {/* STEP 0 — Name */}
            {medStep === 0 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>🏷️</div>
                <h1 style={styles.title}>Medication name</h1>
                <p style={styles.subtitle}>What is this medication called?</p>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. Vitamin D, Metformin..."
                  value={currentMed.name}
                  onChange={e => setCurrentMed({ ...currentMed, name: e.target.value })}
                  autoFocus
                />
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={backMedStep}>← Back</button>
                  <button
                    style={{ ...styles.btn, opacity: currentMed.name.trim() ? 1 : 0.4 }}
                    onClick={nextMedStep}
                    disabled={!currentMed.name.trim()}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 1 — Dosage */}
            {medStep === 1 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>⚖️</div>
                <h1 style={styles.title}>Dosage</h1>
                <p style={styles.subtitle}>Include units — mg, ml, tablets, whatever applies.</p>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. 500mg, 1 tablet, 10ml..."
                  value={currentMed.dosage}
                  onChange={e => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                  autoFocus
                />
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={backMedStep}>← Back</button>
                  <button
                    style={{ ...styles.btn, opacity: currentMed.dosage.trim() ? 1 : 0.4 }}
                    onClick={nextMedStep}
                    disabled={!currentMed.dosage.trim()}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 2 — Days */}
            {medStep === 2 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>📅</div>
                <h1 style={styles.title}>Which days?</h1>
                <p style={styles.subtitle}>Tap days to toggle. All days selected by default.</p>
                <div style={styles.daysRow}>
                  {DAYS.map(day => (
                    <button
                      key={day}
                      style={{
                        ...styles.dayBtn,
                        background: currentMed.days.includes(day) ? 'var(--pink-400)' : 'var(--white)',
                        color: currentMed.days.includes(day) ? 'var(--white)' : 'var(--gray-600)',
                        border: currentMed.days.includes(day) ? '2px solid var(--pink-400)' : '2px solid var(--pink-200)',
                      }}
                      onClick={() => toggleDay(day)}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
                {currentMed.days.length !== 7 && (
                  <button style={styles.textBtn} onClick={setAllDays}>Select all days</button>
                )}
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={backMedStep}>← Back</button>
                  <button
                    style={{ ...styles.btn, opacity: currentMed.days.length > 0 ? 1 : 0.4 }}
                    onClick={nextMedStep}
                    disabled={currentMed.days.length === 0}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 3 — Frequency + Times */}
            {medStep === 3 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>⏰</div>
                <h1 style={styles.title}>When to take it?</h1>
                <p style={styles.subtitle}>How many times a day, and at what times.</p>
                <div style={styles.freqGrid}>
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      style={{
                        ...styles.freqBtn,
                        background: currentMed.frequency === n ? 'var(--pink-400)' : 'var(--white)',
                        color: currentMed.frequency === n ? 'var(--white)' : 'var(--gray-800)',
                        border: currentMed.frequency === n ? '2px solid var(--pink-400)' : '2px solid var(--pink-200)',
                      }}
                      onClick={() => setFrequency(n)}
                    >
                      <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>{n}x</span>
                      <span style={{ fontSize: '0.7rem', color: currentMed.frequency === n ? 'rgba(255,255,255,0.8)' : 'var(--gray-400)' }}>
                        {n === 1 ? 'once' : n === 2 ? 'twice' : n === 3 ? '3 times' : '4 times'}
                      </span>
                    </button>
                  ))}
                </div>
                <div style={styles.timesCol}>
                  {currentMed.times.map((t, i) => (
                    <div key={i} style={styles.timeRow}>
                      <span style={styles.doseLabel}>Dose {i + 1}</span>
                      <input
                        style={styles.timeInput}
                        type="time"
                        value={t}
                        onChange={e => updateTime(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={backMedStep}>← Back</button>
                  <button style={styles.btn} onClick={nextMedStep}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 4 — Review this med */}
            {medStep === 4 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>✅</div>
                <h1 style={styles.title}>Looks good?</h1>
                <div style={styles.summary}>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Medication</span>
                    <span style={styles.summaryValue}>{currentMed.name}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Dosage</span>
                    <span style={styles.summaryValue}>{currentMed.dosage}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Days</span>
                    <span style={styles.summaryValue}>{formatDays(currentMed.days)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Times</span>
                    <span style={styles.summaryValue}>{currentMed.times.join(', ')}</span>
                  </div>
                </div>
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={backMedStep}>← Edit</button>
                  <button style={styles.btn} onClick={saveMed}>Save med ✓</button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* ── REVIEW ALL MEDS ── */}
      {globalStep === 'review_all' && (
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0 0.25rem' }}>
            <h1 style={{ ...styles.title, fontSize: '1.6rem' }}>Your medications</h1>
            <p style={{ ...styles.subtitle, marginTop: '0.25rem' }}>Added {medications.length} so far.</p>
          </div>

          {medications.map(med => (
            <div key={med.id} style={styles.medCard}>
              <div style={styles.medCardTop}>
                <div>
                  <div style={styles.medName}>{med.name}</div>
                  <div style={styles.medMeta}>{med.dosage} · {formatDays(med.days)}</div>
                  <div style={styles.medMeta}>{med.times.join(', ')}</div>
                </div>
                <div style={styles.medActions}>
                  <button style={styles.iconBtn} onClick={() => editMed(med)}>✏️</button>
                  <button style={styles.iconBtn} onClick={() => removeMed(med.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}

          <button style={styles.btnOutline} onClick={addAnotherMed}>+ Add another medication</button>
          <button style={styles.btn} onClick={finish}>Start tracking 🎉</button>
        </div>
      )}

    </div>
  )
}

const styles = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(env(safe-area-inset-top) + 2rem) 1.25rem calc(env(safe-area-inset-bottom) + 2rem)',
    background: 'linear-gradient(160deg, var(--pink-50) 0%, var(--white) 100%)',
    gap: '1.5rem',
  },
  dots: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  dot: {
    height: '8px',
    borderRadius: '99px',
    transition: 'all 0.3s ease',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '2rem 1.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-md)',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emoji: { fontSize: '2.5rem' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    color: 'var(--gray-800)',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--gray-600)',
    lineHeight: 1.6,
  },
  input: {
    width: '100%',
    padding: '0.9rem 1.1rem',
    borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--pink-200)',
    fontSize: '16px',
    color: 'var(--gray-800)',
    background: 'var(--pink-50)',
    marginTop: '0.5rem',
  },
  btn: {
    flex: 1,
    padding: '0.9rem 1.5rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--pink-400)',
    color: 'var(--white)',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  btnOutline: {
    flex: 1,
    padding: '0.9rem 1.5rem',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--pink-400)',
    fontSize: '1rem',
    fontWeight: 600,
    border: '2px solid var(--pink-200)',
    cursor: 'pointer',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--pink-400)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  daysRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '0.5rem',
    justifyContent: 'space-between',
  },
  dayBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freqGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  freqBtn: {
    padding: '0.9rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  timesCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--pink-50)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--pink-200)',
  },
  doseLabel: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--gray-600)',
  },
  timeInput: {
    background: 'transparent',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--pink-400)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  summary: {
    background: 'var(--pink-50)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '0.85rem',
    color: 'var(--gray-400)',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: '0.95rem',
    color: 'var(--gray-800)',
    fontWeight: 600,
    textAlign: 'right',
    maxWidth: '60%',
  },
  medCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow)',
  },
  medCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    color: 'var(--gray-800)',
    marginBottom: '4px',
  },
  medMeta: {
    fontSize: '0.85rem',
    color: 'var(--gray-400)',
    marginTop: '2px',
  },
  medActions: {
    display: 'flex',
    gap: '8px',
  },
  iconBtn: {
    background: 'var(--pink-50)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
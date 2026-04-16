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

function getConfig() {
  try { return JSON.parse(localStorage.getItem('medbuddy_config') || '{}') }
  catch { return {} }
}

export default function Settings() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(getConfig())
  const [medications, setMedications] = useState(config.medications || [])
  const [editing, setEditing] = useState(null) // med being edited
  const [medStep, setMedStep] = useState(0)
  const [saved, setSaved] = useState(false)

  const formatDays = (days) => {
    if (days.length === 7) return 'Every day'
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
  }

  const startAdd = () => {
    setEditing(emptyMed())
    setMedStep(0)
  }

  const startEdit = (med) => {
    setEditing({ ...med })
    setMedStep(0)
  }

  const removeMed = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  const toggleDay = (day) => {
    const days = editing.days.includes(day)
      ? editing.days.filter(d => d !== day)
      : [...editing.days, day]
    setEditing({ ...editing, days })
  }

  const setFrequency = (freq) => {
    const defaults = ['08:00', '14:00', '20:00', '22:00']
    const times = Array.from({ length: freq }, (_, i) => defaults[i])
    setEditing({ ...editing, frequency: freq, times })
  }

  const updateTime = (index, value) => {
    const times = [...editing.times]
    times[index] = value
    setEditing({ ...editing, times })
  }

  const saveMed = () => {
    setMedications(prev => {
      const exists = prev.find(m => m.id === editing.id)
      if (exists) return prev.map(m => m.id === editing.id ? editing : m)
      return [...prev, editing]
    })
    setEditing(null)
    setMedStep(0)
  }

  const saveAll = async () => {
    const newConfig = { ...config, medications }
    localStorage.setItem('medbuddy_config', JSON.stringify(newConfig))
    try { await syncConfigToServer(medications) } catch (e) {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 style={styles.headerTitle}>Medications</h1>
        <button style={{ ...styles.saveBtn, background: saved ? 'var(--pink-300)' : 'var(--pink-400)' }} onClick={saveAll}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Med list */}
      {!editing && (
        <div style={styles.section}>
          {medications.map(med => (
            <div key={med.id} style={styles.medCard}>
              <div style={styles.medCardTop}>
                <div>
                  <div style={styles.medName}>{med.name}</div>
                  <div style={styles.medMeta}>{med.dosage} · {formatDays(med.days)}</div>
                  <div style={styles.medMeta}>{med.times.join(', ')}</div>
                </div>
                <div style={styles.medActions}>
                  <button style={styles.iconBtn} onClick={() => startEdit(med)}>✏️</button>
                  <button style={styles.iconBtn} onClick={() => removeMed(med.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}

          <button style={styles.addBtn} onClick={startAdd}>+ Add medication</button>
        </div>
      )}

      {/* Add / Edit form */}
      {editing && (
        <>
          <div style={styles.dots}>
            {[0, 1, 2, 3].map(i => (
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
                <h2 style={styles.stepTitle}>Medication name</h2>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. Vitamin D..."
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  autoFocus
                />
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={() => setEditing(null)}>Cancel</button>
                  <button
                    style={{ ...styles.btn, opacity: editing.name.trim() ? 1 : 0.4 }}
                    onClick={() => setMedStep(1)}
                    disabled={!editing.name.trim()}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 1 — Dosage */}
            {medStep === 1 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>⚖️</div>
                <h2 style={styles.stepTitle}>Dosage</h2>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. 500mg, 1 tablet..."
                  value={editing.dosage}
                  onChange={e => setEditing({ ...editing, dosage: e.target.value })}
                  autoFocus
                />
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={() => setMedStep(0)}>← Back</button>
                  <button
                    style={{ ...styles.btn, opacity: editing.dosage.trim() ? 1 : 0.4 }}
                    onClick={() => setMedStep(2)}
                    disabled={!editing.dosage.trim()}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 2 — Days */}
            {medStep === 2 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>📅</div>
                <h2 style={styles.stepTitle}>Which days?</h2>
                <div style={styles.daysRow}>
                  {DAYS.map(day => (
                    <button
                      key={day}
                      style={{
                        ...styles.dayBtn,
                        background: editing.days.includes(day) ? 'var(--pink-400)' : 'var(--white)',
                        color: editing.days.includes(day) ? 'var(--white)' : 'var(--gray-600)',
                        border: editing.days.includes(day) ? '2px solid var(--pink-400)' : '2px solid var(--pink-200)',
                      }}
                      onClick={() => toggleDay(day)}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
                <div style={styles.btnRow}>
                  <button style={styles.btnOutline} onClick={() => setMedStep(1)}>← Back</button>
                  <button
                    style={{ ...styles.btn, opacity: editing.days.length > 0 ? 1 : 0.4 }}
                    onClick={() => setMedStep(3)}
                    disabled={editing.days.length === 0}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* STEP 3 — Times */}
            {medStep === 3 && (
              <div style={styles.stepContent}>
                <div style={styles.emoji}>⏰</div>
                <h2 style={styles.stepTitle}>When to take it?</h2>
                <div style={styles.freqGrid}>
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      style={{
                        ...styles.freqBtn,
                        background: editing.frequency === n ? 'var(--pink-400)' : 'var(--white)',
                        color: editing.frequency === n ? 'var(--white)' : 'var(--gray-800)',
                        border: editing.frequency === n ? '2px solid var(--pink-400)' : '2px solid var(--pink-200)',
                      }}
                      onClick={() => setFrequency(n)}
                    >
                      <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{n}x</span>
                      <span style={{ fontSize: '0.7rem', color: editing.frequency === n ? 'rgba(255,255,255,0.8)' : 'var(--gray-400)' }}>
                        {n === 1 ? 'once' : n === 2 ? 'twice' : n === 3 ? '3 times' : '4 times'}
                      </span>
                    </button>
                  ))}
                </div>
                <div style={styles.timesCol}>
                  {editing.times.map((t, i) => (
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
                  <button style={styles.btnOutline} onClick={() => setMedStep(2)}>← Back</button>
                  <button style={styles.btn} onClick={saveMed}>Save ✓</button>
                </div>
              </div>
            )}

          </div>
        </>
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
  headerTitle: {
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
  },
  saveBtn: {
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
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
    fontSize: '1.1rem',
    color: 'var(--gray-800)',
    marginBottom: '4px',
  },
  medMeta: {
    fontSize: '0.82rem',
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
  addBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--pink-400)',
    fontSize: '1rem',
    fontWeight: 600,
    border: '2px dashed var(--pink-300)',
    cursor: 'pointer',
  },
  dots: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'center',
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
    boxShadow: 'var(--shadow-md)',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emoji: { fontSize: '2rem' },
  stepTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--gray-800)',
  },
  input: {
    width: '100%',
    padding: '0.9rem 1.1rem',
    borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--pink-200)',
    fontSize: '16px',
    color: 'var(--gray-800)',
    background: 'var(--pink-50)',
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
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  daysRow: {
    display: 'flex',
    gap: '6px',
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
}
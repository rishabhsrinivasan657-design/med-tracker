import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [animating, setAnimating] = useState(false)

  const goToSlide2 = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setSlide(1)
      setAnimating(false)
    }, 400)
  }

  const goToOnboarding = () => {
    localStorage.setItem('medbuddy_welcomed', 'true')
    navigate('/onboarding')
  }

  return (
    <div style={styles.container}>

      {/* SLIDE 1 */}
      <div
        style={{
          ...styles.slide,
          opacity: slide === 0 ? (animating ? 0 : 1) : 0,
          transform: slide === 0
            ? animating ? 'translateX(-40px)' : 'translateX(0)'
            : 'translateX(-40px)',
          pointerEvents: slide === 0 ? 'auto' : 'none',
          position: slide === 0 ? 'relative' : 'absolute',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
        onClick={goToSlide2}
      >
        {/* Photo placeholder — replace src with actual image */}
        <div style={styles.photoWrap}>
          <img
            src="/welcome-1.png"
            alt="Welcome"
            style={styles.photo}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={styles.photoPlaceholder}>
            <span style={{ fontSize: '3rem' }}>🌸</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>
              welcome-1.png
            </span>
          </div>
        </div>

        {/* Text — replace with actual message */}
        <div style={styles.textBlock}>
          <h1 style={styles.title}>Keyoo♥️😁!!</h1>
          <p style={styles.subtitle}>Hello Keyoo, How you doing, Nice Image no Hehehe</p>
        </div>

        <div style={styles.tapHint}>Tap anywhere to continue →</div>
      </div>

      {/* SLIDE 2 */}
      <div
        style={{
          ...styles.slide,
          opacity: slide === 1 ? (animating ? 0 : 1) : 0,
          transform: slide === 1
            ? animating ? 'translateX(40px)' : 'translateX(0)'
            : 'translateX(40px)',
          pointerEvents: slide === 1 ? 'auto' : 'none',
          position: slide === 1 ? 'relative' : 'absolute',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Different photo — replace src with actual image */}
        <div style={styles.photoWrap}>
          <img
            src="/welcome-2.png"
            alt="Welcome"
            style={styles.photo}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={styles.photoPlaceholder}>
            <span style={{ fontSize: '3rem' }}>💊</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>
              welcome-2.png
            </span>
          </div>
        </div>

        <div style={styles.textBlock}>
          <h1 style={styles.title}>Keyooo Recover Fast Now 🧿🧿 </h1>
          <p style={styles.subtitle}>This is a med tracker built for you, Its super cool! </p>
        </div>

        <button style={styles.btn} onClick={goToOnboarding}>
          Let's get started →
        </button>
      </div>

      {/* Slide dots */}
      <div style={styles.dots}>
        <div style={{ ...styles.dot, background: slide === 0 ? 'var(--pink-400)' : 'var(--pink-200)', width: slide === 0 ? '20px' : '8px' }} />
        <div style={{ ...styles.dot, background: slide === 1 ? 'var(--pink-400)' : 'var(--pink-200)', width: slide === 1 ? '20px' : '8px' }} />
      </div>

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
    position: 'relative',
    overflow: 'hidden',
  },
  slide: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  photoWrap: {
    width: '220px',
    height: '220px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '4px solid var(--pink-200)',
    boxShadow: '0 8px 32px rgba(249, 81, 126, 0.15)',
    position: 'relative',
    background: 'var(--pink-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  photoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  textBlock: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '0 0.5rem',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    color: 'var(--gray-800)',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--gray-600)',
    lineHeight: 1.7,
  },
  tapHint: {
    fontSize: '0.8rem',
    color: 'var(--pink-300)',
    fontWeight: 500,
    marginTop: '0.5rem',
  },
  btn: {
    width: '100%',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--pink-400)',
    color: 'var(--white)',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  dots: {
    position: 'fixed',
    bottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  dot: {
    height: '8px',
    borderRadius: '99px',
    transition: 'all 0.3s ease',
  },
}
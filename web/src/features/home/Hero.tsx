import type React from 'react'
import { useState, useSyncExternalStore } from 'react'
import { useAppearance } from './useAppearance'

const petals = Array.from({ length: 12 }, (_, index) => index)

const mobileQuery = '(max-width: 760px)'
const subscribeDevice = (notify: () => void) => {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}

export function Hero() {
  const appearance = useAppearance()
  const mobile = useSyncExternalStore(
    subscribeDevice,
    () => window.matchMedia(mobileQuery).matches,
  )
  const background = mobile
    ? appearance.mobile_background_url || appearance.desktop_background_url
    : appearance.desktop_background_url
  const [failedURL, setFailedURL] = useState<string | null>(null)
  const hasBackground = Boolean(background && failedURL !== background)
  return (
    <section
      className={`hero${hasBackground ? ' has-background' : ''}${appearance.overlay_enabled ? ' has-overlay' : ''}`}
      id="home"
    >
      {hasBackground && (
        <img
          className="hero-background"
          src={background}
          alt=""
          fetchPriority="high"
          onError={() => setFailedURL(background)}
        />
      )}
      <div className="hero-illustration" aria-hidden="true">
        <div className="hero-sun" />
        <div className="hero-cloud cloud-one" />
        <div className="hero-cloud cloud-two" />
        <div className="mountain mountain-back" />
        <div className="mountain mountain-front" />
        <div className="hero-hill hill-back" />
        <div className="hero-hill hill-front" />
        <div className="hero-branch">
          <i />
          <i />
          <i />
        </div>
        <div className="petals" aria-hidden="true">
          {petals.map((petal) => (
            <i key={petal} style={{ '--i': petal } as React.CSSProperties} />
          ))}
        </div>
      </div>
      <div className="hero-mask" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-kicker">
          <span /> 一间生长在时光里的博客 <span />
        </div>
        <h1>Mossline</h1>
        <p className="hero-cn">时间留下的痕迹</p>
        <p className="hero-description">记录日常、灵感与每一次温柔的抵达</p>
      </div>

      <svg
        className="hero-waves"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 24Q360 90 720 35T1440 30V80H0Z" opacity=".3" />
        <path d="M0 42Q360 0 720 48T1440 35V80H0Z" opacity=".5" />
        <path d="M0 55Q360 95 720 60T1440 55V80H0Z" />
      </svg>
    </section>
  )
}

import { Icon } from './Icon'
import { Link } from 'react-router-dom'

const petals = Array.from({ length: 12 }, (_, index) => index)

export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-sun" />
      <div className="hero-cloud cloud-one" />
      <div className="hero-cloud cloud-two" />
      <div className="mountain mountain-back" />
      <div className="mountain mountain-front" />
      <div className="hero-hill hill-back" />
      <div className="hero-hill hill-front" />
      <div className="hero-branch"><i /><i /><i /></div>
      <div className="petals" aria-hidden="true">
        {petals.map((petal) => <i key={petal} style={{ '--i': petal }} />)}
      </div>

      <div className="hero-content">
        <div className="hero-kicker"><span /> 一间生长在时光里的博客 <span /></div>
        <h1>Mossline</h1>
        <p className="hero-cn">时间留下的痕迹</p>
        <p className="hero-description">记录日常、灵感与每一次温柔的抵达</p>
        <Link className="hero-button" to="/articles">
          开始阅读 <Icon name="arrow" size={18} />
        </Link>
      </div>

      <button className="scroll-cue" onClick={() => document.getElementById('home-stories')?.scrollIntoView({ behavior: 'smooth' })} aria-label="向下浏览文章">
        <span>SCROLL</span><i><Icon name="down" size={15} /></i>
      </button>
      <div className="hero-signature">EST. 2026 · SHANGHAI</div>
    </section>
  )
}

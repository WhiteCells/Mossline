import { useState } from 'react'
import { Icon } from './Icon'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
  }

  return (
    <section className="newsletter section-shell">
      <div className="newsletter-art" aria-hidden="true"><span /><i /><b /></div>
      <div className="newsletter-copy">
        <span className="eyebrow"><i /> LETTER FROM MOSSLINE</span>
        <h2>偶尔，寄一封信给你</h2>
        <p>不追赶更新频率，只分享最近读到的句子、去过的地方，和生活中值得被记住的小事。</p>
        {subscribed ? (
          <div className="subscribe-success" role="status"><span>✓</span><div><strong>欢迎来到这里</strong><small>下一封信，会在合适的日子抵达。</small></div></div>
        ) : (
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="newsletter-email">邮箱地址</label>
            <span><Icon name="mail" size={19} /></span>
            <input id="newsletter-email" type="email" placeholder="留下你的邮箱地址" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <button type="submit">订阅来信 <Icon name="arrow" size={17} /></button>
          </form>
        )}
        <small className="privacy-note">不打扰，不喧哗，随时可以离开。</small>
      </div>
    </section>
  )
}

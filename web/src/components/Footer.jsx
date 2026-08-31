import { Icon } from './Icon'
import { Link } from 'react-router-dom'

export function Footer() {
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer className="footer">
      <div className="footer-petals" aria-hidden="true"><i /><i /><i /></div>
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-mark"><Icon name="leaf" size={19} /></span>
          <strong>Mossline</strong>
          <p>循着时间的纹理，收藏日常的微光。</p>
        </div>
        <div className="footer-links">
          <div><strong>漫游</strong><Link to="/articles">文章归档</Link><Link to="/categories">拾光分类</Link><Link to="/tags">标签云朵</Link></div>
          <div><strong>相遇</strong><Link to="/moments">片刻动态</Link><a href="mailto:hello@mossline.example">给我留言</a><Link to="/about">关于这里</Link></div>
          <div><strong>邻居</strong><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a><Link to="/friends">春日放映室</Link><Link to="/friends">山茶邮局</Link></div>
        </div>
        <button className="back-to-top" onClick={toTop} aria-label="回到顶部"><Icon name="up" size={19} /><span>TOP</span></button>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Mossline. Made with <Icon name="heart" size={13} /> &amp; patience.</span>
        <span>时间会走远，文字会留下。</span>
      </div>
    </footer>
  )
}

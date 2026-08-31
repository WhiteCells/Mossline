import { Icon } from '../components/Icon'
import { Newsletter } from '../components/Newsletter'
import { PageHero } from '../components/PageHero'

const values = [
  { icon: 'heart', title: '认真生活', text: '记录寻常日子里的光，不急着抵达，也不忽略沿途。' },
  { icon: 'leaf', title: '缓慢生长', text: '保持好奇，允许答案像青苔一样，在时间里慢慢出现。' },
  { icon: 'spark', title: '自由创造', text: '用文字、影像与代码，把脑海中的一点微光变成真实。' },
]

export function AboutPage() {
  return (
    <>
      <PageHero eyebrow="ABOUT MOSSLINE" title="关于这里" description="Mossline，意为时间留下的痕迹。这是一间个人博客，也是一份仍在生长的生活档案。" />
      <section className="inner-page section-shell about-story">
        <div className="about-art"><span /><i /><b>M</b></div>
        <div className="about-copy">
          <span className="eyebrow"><i /> A QUIET CORNER</span>
          <h2>愿文字比时间<br />多停留一会儿</h2>
          <p>你好，我是这个博客的书写者。2026 年，我开始搭建 Mossline，希望在快速滚动的信息流之外，保留一处可以认真阅读、缓慢表达的空间。</p>
          <p>这里会写生活、旅途、设计与技术，也会收藏一些很小的瞬间：一场雨、一页书、一个突然有了答案的傍晚。</p>
          <div className="about-signature">Mossline <span>EST. 2026 · SHANGHAI</span></div>
        </div>
      </section>
      <section className="values-section">
        <div className="section-shell values-grid">
          {values.map((value, index) => <article key={value.title}><span>0{index + 1}</span><i><Icon name={value.icon} size={21} /></i><h3>{value.title}</h3><p>{value.text}</p></article>)}
        </div>
      </section>
      <Newsletter />
    </>
  )
}

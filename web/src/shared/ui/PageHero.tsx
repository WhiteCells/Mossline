import type { ReactNode } from 'react'
export interface PageHeroProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="page-hero-orb" />
      <div className="page-hero-hill one" />
      <div className="page-hero-hill two" />
      <div className="page-hero-inner section-shell">
        <span className="eyebrow">
          <i /> {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  )
}

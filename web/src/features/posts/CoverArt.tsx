interface CoverArtProps {
  variant: string
  title: string
}

export function CoverArt({ variant, title }: CoverArtProps) {
  return (
    <div
      className={`cover-art cover-art--${variant}`}
      role="img"
      aria-label={`${title}的抽象插画封面`}
    >
      <span className="cover-orb" />
      <span className="cover-shape shape-one" />
      <span className="cover-shape shape-two" />
      <span className="cover-line" />
      <small>MOSSLINE · JOURNAL</small>
    </div>
  )
}

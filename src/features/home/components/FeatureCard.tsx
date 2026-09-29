interface FeatureCardProps {
  number: string
  title: string
  description: string
  href: string
}

export function FeatureCard({ number, title, description, href }: FeatureCardProps) {
  return (
    <a className="feature-card" href={href}>
      <span className="feature-number">{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="feature-link">Explore →</span>
    </a>
  )
}

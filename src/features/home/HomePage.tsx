import { SectionHeading } from '../../components/ui/SectionHeading'
import { siteConfig } from '../../config/site'
import { FeatureCard } from './components/FeatureCard'

const learningAreas = [
  {
    number: '01',
    title: 'Courses & Batches',
    description: 'Structured learning paths with live teaching and organized recorded lectures.',
    href: '#courses',
  },
  {
    number: '02',
    title: 'Free Content',
    description: 'High-quality open lessons and resources before a student commits to a paid batch.',
    href: '#free-content',
  },
  {
    number: '03',
    title: 'Test Series',
    description: 'Topic-wise and full-length assessments designed around real examination patterns.',
    href: '#test-series',
  },
  {
    number: '04',
    title: 'PYQs & Materials',
    description: 'Searchable previous-year questions, notes, formula sheets and practice resources.',
    href: '#study-material',
  },
]

export function HomePage() {
  return (
    <>
      <section className="hero" id="home">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">A dedicated platform for statistics learners</span>
            <h1>
              Learn statistics with <span>clarity, structure and practice.</span>
            </h1>
            <p>{siteConfig.description}</p>
            <div className="hero-actions">
              <a className="button" href="#courses">Explore Courses</a>
              <a className="button button-secondary" href="#free-content">Start with Free Content</a>
            </div>
            <div className="hero-trust" aria-label="Platform highlights">
              <span>Live classes</span>
              <span>Recorded lectures</span>
              <span>Tests & PYQs</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Statistics Lover brand">
            <div className="logo-card">
              <img src={siteConfig.logoPath} alt="Statistics Lover — Learn Practice Succeed" />
            </div>
            <div className="floating-card floating-card-top">
              <strong>Learn</strong>
              <span>Concept-first teaching</span>
            </div>
            <div className="floating-card floating-card-bottom">
              <strong>Practice</strong>
              <span>Tests • PYQs • Assignments</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="courses">
        <div className="container">
          <SectionHeading
            eyebrow="Everything in one place"
            title="A complete statistics learning ecosystem"
            description="The first public shell is intentionally provider-independent. Courses, batches and learning content will come from the application database rather than being hard-coded into pages."
          />
          <div className="feature-grid">
            {learningAreas.map((area) => (
              <FeatureCard key={area.number} {...area} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft" id="free-content">
        <div className="container split-panel">
          <div>
            <SectionHeading
              eyebrow="Built to grow"
              title="Live today. App-ready tomorrow."
              description="The web platform will own the learning model while Google Meet, Drive, Cloudflare Stream and future services remain replaceable integrations."
            />
            <div className="principles">
              <div><strong>01</strong><span>No patch-on-patch development.</span></div>
              <div><strong>02</strong><span>External services are adapters, not the application.</span></div>
              <div><strong>03</strong><span>Owner/admin operations must not require code changes.</span></div>
            </div>
          </div>
          <aside className="architecture-card" aria-label="Initial platform architecture">
            <span className="architecture-label">Foundation</span>
            <h3>Statistics Lover Platform</h3>
            <ul>
              <li>Public coaching website</li>
              <li>Student portal</li>
              <li>Teacher portal</li>
              <li>Admin & owner control</li>
              <li>API-oriented backend</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="section" id="test-series">
        <div className="container callout">
          <span className="eyebrow">Foundation milestone</span>
          <h2>The shell is ready for real course data, authentication and dashboards next.</h2>
          <p>
            We will add one domain at a time and test it before starting the next one, rather than layering fixes over unfinished architecture.
          </p>
          <a className="button" href={`https://wa.me/${siteConfig.whatsappNumber}`} target="_blank" rel="noreferrer">
            Contact Statistics Lover
          </a>
        </div>
      </section>

      <span className="anchor-target" id="pyqs" />
      <span className="anchor-target" id="study-material" />
      <span className="anchor-target" id="about" />
      <span className="anchor-target" id="login" />
    </>
  )
}

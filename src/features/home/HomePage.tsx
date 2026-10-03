import { SectionHeading } from '../../components/ui/SectionHeading'
import { siteConfig } from '../../config/site'
import { FeatureCard } from './components/FeatureCard'

const learningAreas = [
  {
    number: '01',
    title: 'Courses & Batches',
    description: 'Browse active batches, enroll and continue into a structured subject, module and lecture hierarchy.',
    href: '/store',
  },
  {
    number: '02',
    title: 'Student Dashboard',
    description: 'Keep classes, tests, assignments, attendance, orders and notifications together in one learning space.',
    href: '/login',
  },
  {
    number: '03',
    title: 'Tests & Performance',
    description: 'Take scheduled tests, resume secure attempts and review released results with subject-level analytics.',
    href: '/login',
  },
  {
    number: '04',
    title: 'Assignments & Resources',
    description: 'Access released study resources, submit coursework and review grades and feedback from the same course.',
    href: '/login',
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
            <span className="hero-kicker">Statistics learning, organized in one place</span>
            <h1>
              Learn, practice and track progress with <span>one connected platform.</span>
            </h1>
            <p>{siteConfig.description}</p>
            <div className="hero-actions">
              <a className="button" href="/store">Browse Courses</a>
              <a className="button button-secondary" href="/login">Student Login</a>
            </div>
            <div className="hero-trust" aria-label="Platform highlights">
              <span>Live & recorded classes</span>
              <span>Tests & analytics</span>
              <span>Assignments & resources</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <SectionHeading
            eyebrow="Everything in one place"
            title="A complete learning workflow, not a collection of disconnected links"
            description="Statistics Lover connects course access, teaching, assessment, coursework, attendance and account activity so students can move through one consistent learning experience."
          />
          <div className="feature-grid">
            {learningAreas.map((area) => (
              <FeatureCard key={area.number} {...area} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft" id="assessments">
        <div className="container split-panel">
          <div>
            <SectionHeading
              eyebrow="From class to result"
              title="Study, submit and measure progress without leaving the platform"
              description="Enrolled students can move from lectures to resources, assignments and scheduled assessments while keeping attendance, released results and performance history connected to the same batch."
            />
            <div className="principles">
              <div><strong>01</strong><span>Resume timed tests with server-side scoring and controlled result release.</span></div>
              <div><strong>02</strong><span>Submit assignments privately and review grades and teacher feedback.</span></div>
              <div><strong>03</strong><span>Track attendance, upcoming classes and course-level performance.</span></div>
            </div>
          </div>
          <aside className="architecture-card" aria-label="Student learning workflow">
            <span className="architecture-label">Student workflow</span>
            <h3>Learn → Practice → Review</h3>
            <ul>
              <li>Enrolled course learning spaces</li>
              <li>Live and recorded lecture access</li>
              <li>Protected study resources</li>
              <li>Tests, PYQs and performance analytics</li>
              <li>Assignments, attendance and notifications</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="section" id="resources">
        <div className="container callout">
          <span className="eyebrow">PYQs & study resources</span>
          <h2>Practice material stays connected to the course where it belongs.</h2>
          <p>
            Previous-year questions, notes and other released resources can be organized by batch, subject, module or lecture instead of being scattered across separate pages and links.
          </p>
          <a className="button" href="/store">Explore available batches</a>
        </div>
      </section>

      <section className="section section-soft" id="about">
        <div className="container callout">
          <span className="eyebrow">Statistics Lover</span>
          <h2>Learn • Practice • Succeed</h2>
          <p>
            Use the course store to browse available batches, sign in to continue learning, or contact Statistics Lover if you need help choosing the right course.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <a className="button" href="/login">Open student portal</a>
            <a className="button button-secondary" href={`https://wa.me/${siteConfig.whatsappNumber}`} target="_blank" rel="noreferrer">
              Contact on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

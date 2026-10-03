import { siteConfig } from '../../config/site'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">{siteConfig.name}</div>
          <p>{siteConfig.tagline}</p>
        </div>
        <div>
          <h2>Contact</h2>
          <a href={`tel:+91${siteConfig.phone}`}>+91 {siteConfig.phone}</a>
          <a
            href={`https://wa.me/${siteConfig.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
        <div>
          <h2>Platform</h2>
          <a href="/store">Courses</a>
          <a href="/#assessments">Assessments</a>
          <a href="/#resources">PYQs & Resources</a>
          <a href="/login">Student Login</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Statistics Lover.</span>
        <span>Learn • Practice • Succeed</span>
      </div>
    </footer>
  )
}

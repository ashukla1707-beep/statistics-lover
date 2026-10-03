import { Link } from 'react-router-dom'

export function NotFoundPage(){
  return <section className="not-found-page">
    <div className="container not-found-card">
      <span className="eyebrow">404</span>
      <h1>Page not found.</h1>
      <p>The address may be incorrect, or the page may have moved.</p>
      <div className="system-error-actions">
        <Link className="button" to="/">Go home</Link>
        <Link className="button button-secondary" to="/dashboard">Dashboard</Link>
      </div>
    </div>
  </section>
}

import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { HomePage } from './features/home/HomePage'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <HomePage />
      </main>
      <Footer />
    </div>
  )
}

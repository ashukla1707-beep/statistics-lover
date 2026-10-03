import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './features/auth'
import './styles/globals.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/admin.css'
import './styles/admin-overview.css'
import './styles/enrollment-admin.css'
import './styles/content.css'
import './styles/delivery.css'
import './styles/resources.css'
import './styles/staff-teacher.css'
import './styles/teacher-dashboard.css'
import './styles/attendance.css'
import './styles/assignments.css'
import './styles/question-bank.css'
import './styles/test-builder.css'
import './styles/test-schedule.css'
import './styles/assessment-runner.css'
import './styles/assessment-analytics.css'
import './styles/commerce.css'
import './styles/communications.css'
import './styles/drive-player.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

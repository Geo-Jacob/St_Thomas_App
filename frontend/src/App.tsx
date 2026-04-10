import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { LanguageToggle } from './components/LanguageToggle'
import { DashboardPage } from './pages/DashboardPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { LoginPage } from './pages/LoginPage'
import { CertificateWizardPage } from './pages/CertificateWizardPage'
import { FirstLoginPasswordPage } from './pages/FirstLoginPasswordPage'
import { ProfilePage } from './pages/ProfilePage'
import { SchedulePage } from './pages/SchedulePage'
import type { AuthUser } from './types'

function HistoryArrows() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="fixed left-4 top-3 z-40 flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label={t('goBack')}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-navy/15 bg-white/90 text-slate-700 shadow-soft backdrop-blur transition hover:border-navy/30 hover:text-navy"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => navigate(1)}
        aria-label={t('goForward')}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-navy/15 bg-white/90 text-slate-700 shadow-soft backdrop-blur transition hover:border-navy/30 hover:text-navy"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}

function ProtectedShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { t } = useTranslation()
  const user = (() => {
    const stored = sessionStorage.getItem('ecclesia_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as AuthUser
    } catch {
      return null
    }
  })()

  return (
    <div className="min-h-screen">
      <HistoryArrows />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-4 sm:px-6 lg:px-8">
        <LanguageToggle />
        <div className="flex items-center gap-3">
          {user?.is_staff ? (
            <span className="rounded-full bg-gold/15 px-3 py-2 text-sm font-semibold text-navy">
              {t('admin')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-soft transition hover:border-navy/30 hover:text-navy"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('logout')}
          </button>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/directory" element={<DirectoryPage token={token} />} />
        <Route path="/certificates" element={<CertificateWizardPage token={token} />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('ecclesia_access') ?? '')
  const [firstLoginRequired, setFirstLoginRequired] = useState(() => sessionStorage.getItem('ecclesia_first_login') === 'true')

  const handleLogout = () => {
    sessionStorage.removeItem('ecclesia_access')
    sessionStorage.removeItem('ecclesia_refresh')
    sessionStorage.removeItem('ecclesia_first_login')
    sessionStorage.removeItem('ecclesia_user')
    setToken('')
    setFirstLoginRequired(false)
  }

  const handleLogin = (payload: { access: string; refresh?: string; is_first_login: boolean; user: AuthUser }) => {
    sessionStorage.setItem('ecclesia_access', payload.access)
    if (payload.refresh) {
      sessionStorage.setItem('ecclesia_refresh', payload.refresh)
    }
    sessionStorage.setItem('ecclesia_first_login', String(payload.is_first_login))
    sessionStorage.setItem('ecclesia_user', JSON.stringify(payload.user))
    setToken(payload.access)
    setFirstLoginRequired(payload.is_first_login)
  }

  const handlePasswordResetSuccess = (user: AuthUser) => {
    sessionStorage.setItem('ecclesia_first_login', 'false')
    sessionStorage.setItem('ecclesia_user', JSON.stringify(user))
    setFirstLoginRequired(false)
  }

  return (
    <BrowserRouter>
      {token ? (
        firstLoginRequired ? (
          <>
            <LanguageToggle />
            <FirstLoginPasswordPage onSuccess={handlePasswordResetSuccess} />
          </>
        ) : (
          <ProtectedShell token={token} onLogout={handleLogout} />
        )
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </BrowserRouter>
  )
}

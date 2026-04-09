import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/http'
import churchImage from '../assets/image.png'
import { LanguageToggle } from '../components/LanguageToggle'
import type { AuthUser } from '../types'

type Props = {
  onLogin: (payload: { access: string; refresh?: string; is_first_login: boolean; user: AuthUser }) => void
}

export function LoginPage({ onLogin }: Props) {
  const { t } = useTranslation()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/auth/login/', { phone_number: phoneNumber, password })
      onLogin(response.data)
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid h-[100dvh] overflow-hidden lg:grid-cols-2">
      <LanguageToggle className="absolute right-4 top-3 z-30 sm:right-6 lg:right-8" />

      <section className="relative min-h-[42dvh] lg:min-h-[100dvh]">
        <img src={churchImage} alt="St Thomas App" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/35 to-slate-900/15" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex h-full items-end px-6 pb-10 sm:px-10 sm:pb-14"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] sm:text-sm">
              Parish Directory
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
              St Thomas App
            </h1>
          </div>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center bg-[#f6f4ee] px-4 py-8 sm:px-8 lg:px-12"
      >
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" aria-label={t('loginTitle')}>
            <div>
              <h2 className="text-3xl font-extrabold leading-tight text-slate-900">{t('loginTitle')}</h2>
              <p className="mt-3 text-base leading-7 text-slate-700">{t('loginSubtitle')}</p>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-semibold text-slate-800">
                {t('phoneNumber')}
              </label>
              <input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                autoComplete="tel"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-2xl bg-navy px-4 py-3 text-base font-semibold text-white transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '...' : t('signIn')}
            </button>
          </form>
        </div>
      </motion.section>
    </main>
  )
}

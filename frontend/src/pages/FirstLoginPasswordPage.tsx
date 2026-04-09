import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/http'
import type { AuthUser } from '../types'

type Props = {
  onSuccess: (user: AuthUser) => void
}

export function FirstLoginPasswordPage({ onSuccess }: Props) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await api.post<AuthUser>('/auth/first-login-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      onSuccess(response.data)
    } catch {
      setError(t('passwordResetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto grid min-h-[100dvh] max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">St Thomas App</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900">{t('firstLoginTitle')}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">{t('firstLoginSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('currentPassword')}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base"
              autoComplete="current-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('newPassword')}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('confirmPassword')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base"
              autoComplete="new-password"
              required
            />
          </label>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-2xl bg-navy px-4 py-3 text-base font-semibold text-white disabled:opacity-70"
          >
            {loading ? '...' : t('updatePassword')}
          </button>
        </form>
      </section>
    </main>
  )
}

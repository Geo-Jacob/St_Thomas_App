import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/http'
import type { AuthUser, Member } from '../types'

type FamilyResponse = {
  results?: Member[]
}

export function ProfilePage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')
      try {
        const meResponse = await api.get<AuthUser>('/auth/me/')
        if (!active) return

        const profile = meResponse.data
        setUser(profile)
        sessionStorage.setItem('ecclesia_user', JSON.stringify(profile))

        if (profile.family) {
          const familyResponse = await api.get<FamilyResponse>(`/members/?family=${profile.family}`)
          if (!active) return
          setFamilyMembers(familyResponse.data.results ?? [])
        } else {
          setFamilyMembers([])
        }
      } catch {
        if (active) {
          setError(t('profileLoadError'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [t])

  const displayName = useMemo(() => {
    if (!user) return ''
    return user.display_name || `${user.first_name} ${user.last_name}`.trim()
  }, [user])

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
      return
    }

    setUpdatingPassword(true)
    try {
      const response = await api.post<AuthUser>('/auth/first-login-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      sessionStorage.setItem('ecclesia_user', JSON.stringify(response.data))
      sessionStorage.setItem('ecclesia_first_login', 'false')
      setUser(response.data)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(t('passwordUpdatedSuccess'))
    } catch {
      setPasswordError(t('passwordResetError'))
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-navy/10 bg-white p-8 text-slate-600 shadow-soft">{t('loadingProfile')}</div>
      </main>
    )
  }

  if (error || !user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 shadow-soft">{error || t('profileLoadError')}</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-church-radial p-5 sm:p-7">
        <div className="rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">{t('profile')}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{displayName}</h1>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <p>
              <span className="font-semibold">{t('phoneNumber')}:</span> {user.phone_number || '—'}
            </p>
            <p>
              <span className="font-semibold">{t('roleLabel')}:</span> {user.is_staff ? t('admin') : t('memberRole')}
            </p>
          </div>
        </div>

        {user.is_staff ? (
          <section className="mt-6 rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{t('adminProfileSection')}</h2>
            <p className="mt-2 text-sm text-slate-700">{t('adminProfileHint')}</p>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">{t('myDetails')}</h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">{t('firstName')}</dt>
                  <dd>{user.first_name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('lastName')}</dt>
                  <dd>{user.last_name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('houseName')}</dt>
                  <dd>{user.house_name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('relationToFamilyHead')}</dt>
                  <dd>{user.relation_to_family || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="mt-6 rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">{t('familyDetails')}</h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">{t('family')}</dt>
                  <dd>{user.family_name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('unit')}</dt>
                  <dd>{user.unit || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('ward')}</dt>
                  <dd>{user.ward || '—'}</dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-slate-700">{t('familyMembers')}</h3>
              <div className="mt-2 space-y-2">
                {familyMembers.length > 0 ? (
                  familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-cream px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">{member.display_name}</span>
                      <span className="text-slate-700">{member.phone_number || '—'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">{t('noFamilyMembers')}</p>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">{t('passwordSettings')}</h2>
              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
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

                {passwordError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p> : null}
                {passwordSuccess ? <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{passwordSuccess}</p> : null}

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {updatingPassword ? t('saving') : t('updatePassword')}
                </button>
              </form>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { api } from '../api/http'
import type { AuthUser, Family, Member, Unit, Ward } from '../types'
import { MemberCard } from '../components/MemberCard'

type Props = {
  token: string
}

type ApiResponse = {
  results?: Member[]
  count?: number
}

type ListResponse<T> = {
  results?: T[]
}

type CreateMemberForm = {
  first_name: string
  last_name: string
  phone_number: string
  house_name: string
  family: string
  relation_to_family: 'FATHER' | 'MOTHER' | 'SON' | 'DAUGHTER' | 'OTHER'
  date_of_birth: string
  is_deceased: boolean
  password: string
}

const listFromResponse = <T,>(payload: ListResponse<T> | T[]) => {
  if (Array.isArray(payload)) {
    return payload
  }
  return payload.results ?? []
}

export function DirectoryPage({ token }: Props) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<Member[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [search, setSearch] = useState('')
  const [ward, setWard] = useState('')
  const [unit, setUnit] = useState('')
  const [family, setFamily] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateMemberForm>({
    first_name: '',
    last_name: '',
    phone_number: '',
    house_name: '',
    family: '',
    relation_to_family: 'OTHER',
    date_of_birth: '',
    is_deceased: false,
    password: '',
  })
  const deferredSearch = useDeferredValue(search)
  const currentUser = useMemo(() => {
    const stored = sessionStorage.getItem('ecclesia_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as AuthUser
    } catch {
      return null
    }
  }, [])
  const isAdmin = Boolean(currentUser?.is_staff)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim())
    if (ward.trim()) params.set('ward', ward.trim())
    if (unit.trim()) params.set('unit', unit.trim())
    if (family.trim()) params.set('family', family.trim())
    return params.toString()
  }, [deferredSearch, ward, unit, family])

  useEffect(() => {
    let active = true

    async function loadHierarchy() {
      try {
        const [wardResponse, unitResponse, familyResponse] = await Promise.all([
          api.get<ListResponse<Ward> | Ward[]>('/wards/'),
          api.get<ListResponse<Unit> | Unit[]>('/units/'),
          api.get<ListResponse<Family> | Family[]>('/families/'),
        ])
        if (!active) return
        setWards(listFromResponse<Ward>(wardResponse.data))
        setUnits(listFromResponse<Unit>(unitResponse.data))
        setFamilies(listFromResponse<Family>(familyResponse.data))
      } catch {
        if (active) {
          setError(t('unableToLoadHierarchy'))
        }
      }
    }

    if (token) {
      void loadHierarchy()
    }

    return () => {
      active = false
    }
  }, [t, token])

  useEffect(() => {
    let active = true

    async function loadMembers() {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const response = await api.get<ApiResponse>(`/members/${queryString ? `?${queryString}` : ''}`)
        if (active) {
          setMembers(response.data.results ?? [])
        }
      } catch {
        if (active) {
          setError('Unable to load members right now.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadMembers()

    return () => {
      active = false
    }
  }, [queryString, token])

  const filteredUnits = useMemo(() => {
    if (!ward) return units
    return units.filter((item) => String(item.ward) === ward)
  }, [units, ward])

  const filteredFamilies = useMemo(() => {
    if (unit) return families.filter((item) => String(item.unit) === unit)
    if (ward) return families.filter((item) => String(item.ward) === ward)
    return families
  }, [families, ward, unit])

  const onWardChange = (value: string) => {
    setWard(value)
    setUnit('')
    setFamily('')
  }

  const onUnitChange = (value: string) => {
    setUnit(value)
    setFamily('')
  }

  const onCreateMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.family) {
      setCreateError(t('selectFamilyBeforeCreate'))
      return
    }

    setIsCreating(true)
    try {
      const payload = {
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        phone_number: createForm.phone_number.trim(),
        house_name: createForm.house_name.trim(),
        family: Number(createForm.family),
        relation_to_family: createForm.relation_to_family,
        date_of_birth: createForm.date_of_birth || null,
        is_deceased: createForm.is_deceased,
        password: createForm.password.trim(),
      }

      await api.post('/members/', payload)

      setCreateSuccess(t('memberCreatedSuccess'))
      setCreateForm({
        first_name: '',
        last_name: '',
        phone_number: '',
        house_name: '',
        family: createForm.family,
        relation_to_family: 'OTHER',
        date_of_birth: '',
        is_deceased: false,
        password: '',
      })

      const response = await api.get<ApiResponse>(`/members/${queryString ? `?${queryString}` : ''}`)
      setMembers(response.data.results ?? [])
    } catch {
      setCreateError(t('memberCreatedError'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-church-radial p-5 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">{t('memberDirectory')}</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('directory')}</h1>
          </div>
          <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-soft">
            {members.length} {t('members')}
          </div>
        </div>

        <div className="grid gap-4 rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5 lg:grid-cols-4">
          <label className="relative block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('search')}</span>
            <Search className="pointer-events-none absolute left-4 top-[calc(50%+0.75rem)] h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-cream pl-12 pr-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('ward')}</span>
            <select
              value={ward}
              onChange={(event) => onWardChange(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
            >
              <option value="">{t('allWards')}</option>
              {wards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('unit')}</span>
            <select
              value={unit}
              onChange={(event) => onUnitChange(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
            >
              <option value="">{t('allUnits')}</option>
              {filteredUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{t('family')}</span>
            <select
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
            >
              <option value="">{t('allFamilies')}</option>
              {filteredFamilies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isAdmin ? (
          <form onSubmit={onCreateMember} className="mt-6 rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t('addFamilyMember')}</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminOnly')}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={createForm.first_name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, first_name: event.target.value }))}
                placeholder={t('firstName')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                required
              />
              <input
                value={createForm.last_name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, last_name: event.target.value }))}
                placeholder={t('lastName')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              <input
                value={createForm.phone_number}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                placeholder={t('phoneNumber')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                required
              />
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={t('initialPassword')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              <input
                value={createForm.house_name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, house_name: event.target.value }))}
                placeholder={t('houseName')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
              <select
                value={createForm.family}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, family: event.target.value }))}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                required
              >
                <option value="">{t('selectFamily')}</option>
                {filteredFamilies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={createForm.relation_to_family}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    relation_to_family: event.target.value as CreateMemberForm['relation_to_family'],
                  }))
                }
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
              >
                <option value="FATHER">{t('relationFather')}</option>
                <option value="MOTHER">{t('relationMother')}</option>
                <option value="SON">{t('relationSon')}</option>
                <option value="DAUGHTER">{t('relationDaughter')}</option>
                <option value="OTHER">{t('relationOther')}</option>
              </select>
              <input
                type="date"
                value={createForm.date_of_birth}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={createForm.is_deceased}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, is_deceased: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
              />
              {t('isDeceased')}
            </label>

            {createError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p> : null}
            {createSuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{createSuccess}</p> : null}

            <div className="mt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating ? t('saving') : t('saveMember')}
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {t('unableToLoadMembers')}
          </p>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-3xl bg-white/80" />
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-navy/20 bg-white/80 p-8 text-center text-slate-600">
              {t('noMembersFound')}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

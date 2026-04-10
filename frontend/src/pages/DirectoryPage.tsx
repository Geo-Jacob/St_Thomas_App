import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { api } from '../api/http'
import type { AuthUser, Family, Member, Unit, Ward } from '../types'
import { MemberCard } from '../components/MemberCard'
import { transliterateNameToMalayalam } from '../utils/transliteration'

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
  gender: '' | 'MALE' | 'FEMALE' | 'OTHER'
  phone_number: string
  house_name: string
  family: string
  relation_to_family: '' | 'FATHER' | 'MOTHER' | 'SPOUSE' | 'SON' | 'DAUGHTER' | 'OTHER'
  date_of_birth: string
  is_deceased: boolean
  password: string
}

type HierarchyForm = {
  name: string
  name_ml: string
  code: string
}

const listFromResponse = <T,>(payload: ListResponse<T> | T[]) => {
  if (Array.isArray(payload)) {
    return payload
  }
  return payload.results ?? []
}

const RELATION_PRIORITY: Record<Member['relation_to_family'], number> = {
  FATHER: 0,
  MOTHER: 1,
  SPOUSE: 2,
  SON: 3,
  DAUGHTER: 4,
  OTHER: 5,
}

const sortMembersByFamilyPriority = (items: Member[]) =>
  [...items].sort((a, b) => {
    if (a.is_family_head && !b.is_family_head) return -1
    if (!a.is_family_head && b.is_family_head) return 1
    const relationDelta = RELATION_PRIORITY[a.relation_to_family] - RELATION_PRIORITY[b.relation_to_family]
    if (relationDelta !== 0) return relationDelta
    return a.id - b.id
  })

export function DirectoryPage({ token }: Props) {
  const { t, i18n } = useTranslation()

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
    gender: '',
    phone_number: '',
    house_name: '',
    family: '',
    relation_to_family: '',
    date_of_birth: '',
    is_deceased: false,
    password: '',
  })

  const [isManagingHierarchy, setIsManagingHierarchy] = useState(false)
  const [hierarchyError, setHierarchyError] = useState('')
  const [hierarchySuccess, setHierarchySuccess] = useState('')
  const [wardForm, setWardForm] = useState<HierarchyForm>({ name: '', name_ml: '', code: '' })
  const [unitForm, setUnitForm] = useState<HierarchyForm>({ name: '', name_ml: '', code: '' })
  const [familyForm, setFamilyForm] = useState<HierarchyForm>({ name: '', name_ml: '', code: '' })
  const [createUnitWardId, setCreateUnitWardId] = useState('')
  const [createFamilyUnitId, setCreateFamilyUnitId] = useState('')
  const [deleteWardId, setDeleteWardId] = useState('')
  const [deleteUnitId, setDeleteUnitId] = useState('')
  const [deleteFamilyId, setDeleteFamilyId] = useState('')
  const [editWardId, setEditWardId] = useState('')
  const [editWardName, setEditWardName] = useState('')
  const [editWardNameMl, setEditWardNameMl] = useState('')
  const [editUnitId, setEditUnitId] = useState('')
  const [editUnitName, setEditUnitName] = useState('')
  const [editUnitNameMl, setEditUnitNameMl] = useState('')
  const [editFamilyId, setEditFamilyId] = useState('')
  const [editFamilyName, setEditFamilyName] = useState('')
  const [editFamilyNameMl, setEditFamilyNameMl] = useState('')
  const [editMemberId, setEditMemberId] = useState('')
  const [editMemberFirstName, setEditMemberFirstName] = useState('')
  const [editMemberLastName, setEditMemberLastName] = useState('')
  const [isEditingNames, setIsEditingNames] = useState(false)
  const [editNamesError, setEditNamesError] = useState('')
  const [editNamesSuccess, setEditNamesSuccess] = useState('')

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedTargetFamilyId, setSelectedTargetFamilyId] = useState('')
  const [memberFamilyError, setMemberFamilyError] = useState('')
  const [memberFamilySuccess, setMemberFamilySuccess] = useState('')
  const [isSavingMemberFamily, setIsSavingMemberFamily] = useState(false)
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [familyModalTitle, setFamilyModalTitle] = useState('')
  const [familyMembers, setFamilyMembers] = useState<Member[]>([])
  const [isLoadingFamilyMembers, setIsLoadingFamilyMembers] = useState(false)
  const [familyModalError, setFamilyModalError] = useState('')
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({})

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
  const isChildRelation = createForm.relation_to_family === 'SON' || createForm.relation_to_family === 'DAUGHTER'

  const visibleMemberGroups = useMemo(() => {
    const grouped = new Map<string, Member[]>()

    members.forEach((member) => {
      const key = member.family ? `family-${member.family}` : `member-${member.id}`
      const existing = grouped.get(key) ?? []
      grouped.set(key, [...existing, member])
    })

    return Array.from(grouped.entries()).map(([key, familyMembers]) => {
      const sortedMembers = sortMembersByFamilyPriority(familyMembers)
      const representative =
        sortedMembers.find((item) => item.is_family_head) ||
        sortedMembers.find((item) => item.relation_to_family === 'FATHER') ||
        sortedMembers.find((item) => item.relation_to_family === 'MOTHER') ||
        sortedMembers.find((item) => item.relation_to_family === 'SPOUSE') ||
        sortedMembers[0]

      return {
        key,
        representative,
        members: sortedMembers,
      }
    })
  }, [members])

  const namesToTranslate = useMemo(() => {
    if (i18n.language !== 'ml') return []
    const unique = Array.from(new Set(members.map((item) => item.display_name).filter(Boolean)))
    return unique.filter((name) => !nameTranslations[name])
  }, [i18n.language, members, nameTranslations])

  useEffect(() => {
    if (namesToTranslate.length === 0) return

    let active = true
    const loadTranslations = async () => {
      const translatedPairs = await Promise.all(
        namesToTranslate.map(async (name) => ({
          source: name,
          translated: await transliterateNameToMalayalam(name),
        }))
      )

      if (!active) return
      setNameTranslations((prev) => {
        const next = { ...prev }
        translatedPairs.forEach(({ source, translated }) => {
          next[source] = translated
        })
        return next
      })
    }

    void loadTranslations()
    return () => {
      active = false
    }
  }, [namesToTranslate])

  const localizePersonName = (name: string) => {
    if (i18n.language !== 'ml') return name
    return nameTranslations[name] || name
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim())
    if (ward.trim()) params.set('ward', ward.trim())
    if (unit.trim()) params.set('unit', unit.trim())
    if (family.trim()) params.set('family', family.trim())
    return params.toString()
  }, [deferredSearch, ward, unit, family])

  const refreshHierarchy = async () => {
    const [wardResponse, unitResponse, familyResponse] = await Promise.all([
      api.get<ListResponse<Ward> | Ward[]>('/wards/'),
      api.get<ListResponse<Unit> | Unit[]>('/units/'),
      api.get<ListResponse<Family> | Family[]>('/families/'),
    ])

    setWards(listFromResponse<Ward>(wardResponse.data))
    setUnits(listFromResponse<Unit>(unitResponse.data))
    setFamilies(listFromResponse<Family>(familyResponse.data))
  }

  const refreshMembers = async () => {
    const response = await api.get<ApiResponse>(`/members/${queryString ? `?${queryString}` : ''}`)
    setMembers(response.data.results ?? [])
  }

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

  const houseNameOptions = useMemo(() => {
    const inSelectedFamily = members
      .filter((item) => createForm.family && String(item.family) === createForm.family)
      .map((item) => item.house_name?.trim())
      .filter((value): value is string => Boolean(value))

    const allKnown = members
      .map((item) => item.house_name?.trim())
      .filter((value): value is string => Boolean(value))

    const combined = inSelectedFamily.length > 0 ? [...inSelectedFamily, ...allKnown] : allKnown
    return Array.from(new Set(combined))
  }, [members, createForm.family])

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

    if (!createForm.relation_to_family) {
      setCreateError(t('selectRelationBeforeCreate'))
      return
    }

    if (!createForm.gender) {
      setCreateError(t('selectGenderBeforeCreate'))
      return
    }

    if (!createForm.date_of_birth) {
      setCreateError(t('selectDobBeforeCreate'))
      return
    }

    setIsCreating(true)
    try {
      const payload = {
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        gender: createForm.gender,
        phone_number: createForm.phone_number.trim() || null,
        house_name: createForm.house_name.trim(),
        family: Number(createForm.family),
        relation_to_family: createForm.relation_to_family,
        date_of_birth: createForm.date_of_birth,
        is_deceased: createForm.is_deceased,
        password: createForm.password.trim(),
      }

      await api.post('/members/', payload)

      setCreateSuccess(t('memberCreatedSuccess'))
      setCreateForm({
        first_name: '',
        last_name: '',
        gender: '',
        phone_number: '',
        house_name: '',
        family: '',
        relation_to_family: '',
        date_of_birth: '',
        is_deceased: false,
        password: '',
      })

      await refreshMembers()
    } catch {
      setCreateError(t('memberCreatedError'))
    } finally {
      setIsCreating(false)
    }
  }

  const onCreateWard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHierarchyError('')
    setHierarchySuccess('')
    setIsManagingHierarchy(true)
    try {
      await api.post('/wards/', {
        name: wardForm.name.trim(),
        name_ml: wardForm.name_ml.trim(),
        code: wardForm.code.trim(),
      })
      await refreshHierarchy()
      setWardForm({ name: '', name_ml: '', code: '' })
      setHierarchySuccess(t('wardSavedSuccess'))
    } catch {
      setHierarchyError(t('wardSaveError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onCreateUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHierarchyError('')
    setHierarchySuccess('')

    if (!createUnitWardId) {
      setHierarchyError(t('selectWardBeforeUnitCreate'))
      return
    }

    setIsManagingHierarchy(true)
    try {
      await api.post('/units/', {
        ward: Number(createUnitWardId),
        name: unitForm.name.trim(),
        name_ml: unitForm.name_ml.trim(),
        code: unitForm.code.trim(),
      })
      await refreshHierarchy()
      setUnitForm({ name: '', name_ml: '', code: '' })
      setHierarchySuccess(t('unitSavedSuccess'))
    } catch {
      setHierarchyError(t('unitSaveError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onCreateFamily = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHierarchyError('')
    setHierarchySuccess('')

    if (!createFamilyUnitId) {
      setHierarchyError(t('selectUnitBeforeFamilyCreate'))
      return
    }

    setIsManagingHierarchy(true)
    try {
      await api.post('/families/', {
        unit: Number(createFamilyUnitId),
        name: familyForm.name.trim(),
        name_ml: familyForm.name_ml.trim(),
        code: familyForm.code.trim(),
      })
      await refreshHierarchy()
      setFamilyForm({ name: '', name_ml: '', code: '' })
      setHierarchySuccess(t('familySavedSuccess'))
    } catch {
      setHierarchyError(t('familySaveError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onDeleteWard = async () => {
    if (!deleteWardId) {
      setHierarchyError(t('selectWardBeforeDelete'))
      return
    }

    setHierarchyError('')
    setHierarchySuccess('')
    setIsManagingHierarchy(true)
    try {
      await api.delete(`/wards/${deleteWardId}/`)
      setDeleteWardId('')
      await refreshHierarchy()
      await refreshMembers()
      setHierarchySuccess(t('wardDeletedSuccess'))
    } catch {
      setHierarchyError(t('wardDeleteError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onDeleteUnit = async () => {
    if (!deleteUnitId) {
      setHierarchyError(t('selectUnitBeforeDelete'))
      return
    }

    setHierarchyError('')
    setHierarchySuccess('')
    setIsManagingHierarchy(true)
    try {
      await api.delete(`/units/${deleteUnitId}/`)
      setDeleteUnitId('')
      await refreshHierarchy()
      await refreshMembers()
      setHierarchySuccess(t('unitDeletedSuccess'))
    } catch {
      setHierarchyError(t('unitDeleteError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onDeleteFamily = async () => {
    if (!deleteFamilyId) {
      setHierarchyError(t('selectFamilyBeforeDelete'))
      return
    }

    setHierarchyError('')
    setHierarchySuccess('')
    setIsManagingHierarchy(true)
    try {
      await api.delete(`/families/${deleteFamilyId}/`)
      setDeleteFamilyId('')
      await refreshHierarchy()
      await refreshMembers()
      setHierarchySuccess(t('familyDeletedSuccess'))
    } catch {
      setHierarchyError(t('familyDeleteError'))
    } finally {
      setIsManagingHierarchy(false)
    }
  }

  const onPickWardForEdit = (wardId: string) => {
    setEditWardId(wardId)
    const selected = wards.find((item) => String(item.id) === wardId)
    setEditWardName(selected?.name ?? '')
    setEditWardNameMl(selected?.name_ml ?? '')
  }

  const onPickUnitForEdit = (unitId: string) => {
    setEditUnitId(unitId)
    const selected = units.find((item) => String(item.id) === unitId)
    setEditUnitName(selected?.name ?? '')
    setEditUnitNameMl(selected?.name_ml ?? '')
  }

  const onPickFamilyForEdit = (familyId: string) => {
    setEditFamilyId(familyId)
    const selected = families.find((item) => String(item.id) === familyId)
    setEditFamilyName(selected?.name ?? '')
    setEditFamilyNameMl(selected?.name_ml ?? '')
  }

  const onPickMemberForEdit = (memberId: string) => {
    setEditMemberId(memberId)
    const selected = members.find((item) => String(item.id) === memberId)
    setEditMemberFirstName(selected?.first_name ?? '')
    setEditMemberLastName(selected?.last_name ?? '')
  }

  const onUpdateWardName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditNamesError('')
    setEditNamesSuccess('')
    if (!editWardId) {
      setEditNamesError(t('selectWardBeforeEdit'))
      return
    }
    setIsEditingNames(true)
    try {
      await api.patch(`/wards/${editWardId}/`, {
        name: editWardName.trim(),
        name_ml: editWardNameMl.trim(),
      })
      await refreshHierarchy()
      await refreshMembers()
      setEditNamesSuccess(t('wardUpdatedSuccess'))
    } catch {
      setEditNamesError(t('wardUpdateError'))
    } finally {
      setIsEditingNames(false)
    }
  }

  const onUpdateUnitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditNamesError('')
    setEditNamesSuccess('')
    if (!editUnitId) {
      setEditNamesError(t('selectUnitBeforeEdit'))
      return
    }
    setIsEditingNames(true)
    try {
      await api.patch(`/units/${editUnitId}/`, {
        name: editUnitName.trim(),
        name_ml: editUnitNameMl.trim(),
      })
      await refreshHierarchy()
      await refreshMembers()
      setEditNamesSuccess(t('unitUpdatedSuccess'))
    } catch {
      setEditNamesError(t('unitUpdateError'))
    } finally {
      setIsEditingNames(false)
    }
  }

  const onUpdateFamilyName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditNamesError('')
    setEditNamesSuccess('')
    if (!editFamilyId) {
      setEditNamesError(t('selectFamilyBeforeEdit'))
      return
    }
    setIsEditingNames(true)
    try {
      await api.patch(`/families/${editFamilyId}/`, {
        name: editFamilyName.trim(),
        name_ml: editFamilyNameMl.trim(),
      })
      await refreshHierarchy()
      await refreshMembers()
      setEditNamesSuccess(t('familyUpdatedSuccess'))
    } catch {
      setEditNamesError(t('familyUpdateError'))
    } finally {
      setIsEditingNames(false)
    }
  }

  const onUpdateMemberName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEditNamesError('')
    setEditNamesSuccess('')
    if (!editMemberId) {
      setEditNamesError(t('selectMemberBeforeEdit'))
      return
    }
    if (!editMemberFirstName.trim() || !editMemberLastName.trim()) {
      setEditNamesError(t('memberNameRequiredForEdit'))
      return
    }
    setIsEditingNames(true)
    try {
      await api.patch(`/members/${editMemberId}/`, {
        first_name: editMemberFirstName.trim(),
        last_name: editMemberLastName.trim(),
      })
      await refreshMembers()
      setEditNamesSuccess(t('memberUpdatedSuccess'))
    } catch {
      setEditNamesError(t('memberUpdateError'))
    } finally {
      setIsEditingNames(false)
    }
  }

  const onAssignMemberToFamily = async () => {
    setMemberFamilyError('')
    setMemberFamilySuccess('')

    if (!selectedMemberId || !selectedTargetFamilyId) {
      setMemberFamilyError(t('selectMemberAndFamilyBeforeAssign'))
      return
    }

    setIsSavingMemberFamily(true)
    try {
      await api.patch(`/members/${selectedMemberId}/`, { family: Number(selectedTargetFamilyId) })
      await refreshMembers()
      setMemberFamilySuccess(t('memberAssignedToFamilySuccess'))
    } catch {
      setMemberFamilyError(t('memberAssignToFamilyError'))
    } finally {
      setIsSavingMemberFamily(false)
    }
  }

  const onRemoveMemberFromFamily = async () => {
    setMemberFamilyError('')
    setMemberFamilySuccess('')

    if (!selectedMemberId) {
      setMemberFamilyError(t('selectMemberBeforeFamilyRemove'))
      return
    }

    setIsSavingMemberFamily(true)
    try {
      await api.patch(`/members/${selectedMemberId}/`, {
        family: null,
        relation_to_family: 'OTHER',
        is_family_head: false,
      })
      await refreshMembers()
      setMemberFamilySuccess(t('memberRemovedFromFamilySuccess'))
    } catch {
      setMemberFamilyError(t('memberRemoveFromFamilyError'))
    } finally {
      setIsSavingMemberFamily(false)
    }
  }

  const onOpenMemberFamily = async (member: Member) => {
    setFamilyModalError('')
    setFamilyMembers([])
    setFamilyModalTitle(member.family_name || t('familyMembers'))
    setIsFamilyModalOpen(true)

    if (!member.family) {
      setFamilyModalError(t('memberNoFamilyAssigned'))
      return
    }

    setIsLoadingFamilyMembers(true)
    try {
      const response = await api.get<ApiResponse>(`/members/?family=${member.family}`)
      setFamilyMembers(sortMembersByFamilyPriority(response.data.results ?? []))
    } catch {
      setFamilyModalError(t('unableToLoadFamilyMembers'))
    } finally {
      setIsLoadingFamilyMembers(false)
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
            {visibleMemberGroups.length} {t('families')}
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
          <div className="mt-6 space-y-6">
            <section className="rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{t('manageHierarchy')}</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminOnly')}</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <form onSubmit={onCreateWard} className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('addWard')}</h3>
                  <input
                    value={wardForm.name}
                    onChange={(event) => setWardForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={t('wardName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <input
                    value={wardForm.name_ml}
                    onChange={(event) => setWardForm((prev) => ({ ...prev, name_ml: event.target.value }))}
                    placeholder={t('wardNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  />
                  <input
                    value={wardForm.code}
                    onChange={(event) => setWardForm((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder={t('wardCode')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isManagingHierarchy}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isManagingHierarchy ? t('saving') : t('saveWard')}
                  </button>
                </form>

                <form onSubmit={onCreateUnit} className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('addUnit')}</h3>
                  <select
                    value={createUnitWardId}
                    onChange={(event) => setCreateUnitWardId(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  >
                    <option value="">{t('selectWard')}</option>
                    {wards.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={unitForm.name}
                    onChange={(event) => setUnitForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={t('unitName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <input
                    value={unitForm.name_ml}
                    onChange={(event) => setUnitForm((prev) => ({ ...prev, name_ml: event.target.value }))}
                    placeholder={t('unitNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  />
                  <input
                    value={unitForm.code}
                    onChange={(event) => setUnitForm((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder={t('unitCode')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isManagingHierarchy}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isManagingHierarchy ? t('saving') : t('saveUnit')}
                  </button>
                </form>

                <form onSubmit={onCreateFamily} className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('addFamily')}</h3>
                  <select
                    value={createFamilyUnitId}
                    onChange={(event) => setCreateFamilyUnitId(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  >
                    <option value="">{t('selectUnit')}</option>
                    {units.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={familyForm.name}
                    onChange={(event) => setFamilyForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={t('familyName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <input
                    value={familyForm.name_ml}
                    onChange={(event) => setFamilyForm((prev) => ({ ...prev, name_ml: event.target.value }))}
                    placeholder={t('familyNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  />
                  <input
                    value={familyForm.code}
                    onChange={(event) => setFamilyForm((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder={t('familyCode')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isManagingHierarchy}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isManagingHierarchy ? t('saving') : t('saveFamily')}
                  </button>
                </form>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
                  <h3 className="mb-2 text-sm font-bold text-red-800">{t('removeWard')}</h3>
                  <select
                    value={deleteWardId}
                    onChange={(event) => setDeleteWardId(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  >
                    <option value="">{t('selectWard')}</option>
                    {wards.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onDeleteWard}
                    disabled={isManagingHierarchy}
                    className="mt-2 inline-flex min-h-11 items-center rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('deleteWard')}
                  </button>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
                  <h3 className="mb-2 text-sm font-bold text-red-800">{t('removeUnit')}</h3>
                  <select
                    value={deleteUnitId}
                    onChange={(event) => setDeleteUnitId(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  >
                    <option value="">{t('selectUnit')}</option>
                    {units.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onDeleteUnit}
                    disabled={isManagingHierarchy}
                    className="mt-2 inline-flex min-h-11 items-center rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('deleteUnit')}
                  </button>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
                  <h3 className="mb-2 text-sm font-bold text-red-800">{t('removeFamily')}</h3>
                  <select
                    value={deleteFamilyId}
                    onChange={(event) => setDeleteFamilyId(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  >
                    <option value="">{t('selectFamily')}</option>
                    {families.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onDeleteFamily}
                    disabled={isManagingHierarchy}
                    className="mt-2 inline-flex min-h-11 items-center rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('deleteFamily')}
                  </button>
                </div>
              </div>

              {hierarchyError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{hierarchyError}</p> : null}
              {hierarchySuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{hierarchySuccess}</p> : null}
            </section>

            <section className="rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{t('editNames')}</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminOnly')}</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={onUpdateWardName} className="space-y-2 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('editWard')}</h3>
                  <select
                    value={editWardId}
                    onChange={(event) => onPickWardForEdit(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  >
                    <option value="">{t('selectWard')}</option>
                    {wards.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editWardName}
                    onChange={(event) => setEditWardName(event.target.value)}
                    placeholder={t('wardName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                    required
                  />
                  <input
                    value={editWardNameMl}
                    onChange={(event) => setEditWardNameMl(event.target.value)}
                    placeholder={t('wardNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isEditingNames}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isEditingNames ? t('saving') : t('saveWardName')}
                  </button>
                </form>

                <form onSubmit={onUpdateUnitName} className="space-y-2 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('editUnit')}</h3>
                  <select
                    value={editUnitId}
                    onChange={(event) => onPickUnitForEdit(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  >
                    <option value="">{t('selectUnit')}</option>
                    {units.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editUnitName}
                    onChange={(event) => setEditUnitName(event.target.value)}
                    placeholder={t('unitName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                    required
                  />
                  <input
                    value={editUnitNameMl}
                    onChange={(event) => setEditUnitNameMl(event.target.value)}
                    placeholder={t('unitNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isEditingNames}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isEditingNames ? t('saving') : t('saveUnitName')}
                  </button>
                </form>

                <form onSubmit={onUpdateFamilyName} className="space-y-2 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('editFamily')}</h3>
                  <select
                    value={editFamilyId}
                    onChange={(event) => onPickFamilyForEdit(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  >
                    <option value="">{t('selectFamily')}</option>
                    {families.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editFamilyName}
                    onChange={(event) => setEditFamilyName(event.target.value)}
                    placeholder={t('familyName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                    required
                  />
                  <input
                    value={editFamilyNameMl}
                    onChange={(event) => setEditFamilyNameMl(event.target.value)}
                    placeholder={t('familyNameMl')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isEditingNames}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isEditingNames ? t('saving') : t('saveFamilyName')}
                  </button>
                </form>

                <form onSubmit={onUpdateMemberName} className="space-y-2 rounded-2xl border border-slate-200 p-3">
                  <h3 className="text-sm font-bold text-slate-900">{t('editMember')}</h3>
                  <select
                    value={editMemberId}
                    onChange={(event) => onPickMemberForEdit(event.target.value)}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                  >
                    <option value="">{t('selectMember')}</option>
                    {members.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.display_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editMemberFirstName}
                    onChange={(event) => setEditMemberFirstName(event.target.value)}
                    placeholder={t('firstName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                    required
                  />
                  <input
                    value={editMemberLastName}
                    onChange={(event) => setEditMemberLastName(event.target.value)}
                    placeholder={t('lastName')}
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isEditingNames}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isEditingNames ? t('saving') : t('saveMemberName')}
                  </button>
                </form>
              </div>

              {editNamesError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{editNamesError}</p> : null}
              {editNamesSuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{editNamesSuccess}</p> : null}
            </section>

            <section className="rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{t('manageMemberFamily')}</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('adminOnly')}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">{t('selectMember')}</option>
                  {members.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name} {item.family_name ? `- ${item.family_name}` : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTargetFamilyId}
                  onChange={(event) => setSelectedTargetFamilyId(event.target.value)}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">{t('selectFamily')}</option>
                  {families.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onAssignMemberToFamily}
                  disabled={isSavingMemberFamily}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {t('addMemberToFamily')}
                </button>

                <button
                  type="button"
                  onClick={onRemoveMemberFromFamily}
                  disabled={isSavingMemberFamily}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {t('removeMemberFromFamily')}
                </button>
              </div>

              {memberFamilyError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{memberFamilyError}</p> : null}
              {memberFamilySuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{memberFamilySuccess}</p> : null}
            </section>

            <form onSubmit={onCreateMember} className="rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
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
                  required
                />
                <select
                  value={createForm.gender}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      gender: event.target.value as CreateMemberForm['gender'],
                    }))
                  }
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  required
                >
                  <option value="">{t('selectGender')}</option>
                  <option value="MALE">{t('genderMale')}</option>
                  <option value="FEMALE">{t('genderFemale')}</option>
                  <option value="OTHER">{t('genderOther')}</option>
                </select>
                <input
                  value={createForm.phone_number}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                  placeholder={t('phoneNumber')}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  required={!isChildRelation}
                />
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={t('initialPassword')}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
                <select
                  value={createForm.house_name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, house_name: event.target.value }))}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">{t('selectHouseName')}</option>
                  {houseNameOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={createForm.family}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, family: event.target.value }))}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  required
                >
                  <option value="">{t('selectFamily')}</option>
                  {families.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.code ? `(${item.code})` : ''}
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
                  required
                >
                  <option value="">{t('selectRelation')}</option>
                  <option value="FATHER">{t('relationFather')}</option>
                  <option value="MOTHER">{t('relationMother')}</option>
                  <option value="SPOUSE">{t('relationSpouse')}</option>
                  <option value="SON">{t('relationSon')}</option>
                  <option value="DAUGHTER">{t('relationDaughter')}</option>
                  <option value="OTHER">{t('relationOther')}</option>
                </select>
                <input
                  type="date"
                  value={createForm.date_of_birth}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/20"
                  required
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
          </div>
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
          ) : visibleMemberGroups.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleMemberGroups.map((group) => (
                <MemberCard
                  key={group.key}
                  member={group.representative}
                  familyMembers={group.members}
                  onOpenFamily={onOpenMemberFamily}
                  localizeName={localizePersonName}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-navy/20 bg-white/80 p-8 text-center text-slate-600">
              {t('noMembersFound')}
            </div>
          )}
        </div>

        {isFamilyModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center">
            <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-soft sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('familyMembers')}</h3>
                  <p className="mt-1 text-sm text-slate-600">{familyModalTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFamilyModalOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {t('close')}
                </button>
              </div>

              {isLoadingFamilyMembers ? <p className="text-sm text-slate-600">{t('loadingMembers')}</p> : null}
              {familyModalError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{familyModalError}</p> : null}

              {!isLoadingFamilyMembers && !familyModalError ? (
                familyMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {familyMembers.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                        <span className="font-medium text-slate-900">{localizePersonName(item.display_name)}</span>
                        <a href={item.phone_number ? `tel:${item.phone_number}` : '#'} className="text-sm font-semibold text-navy">
                          {item.phone_number || '—'}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">{t('noMembersFound')}</p>
                )
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

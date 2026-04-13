import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/http'
import type { AuthUser, ScheduleEvent, WeeklyScheduleDay, WeeklyScheduleResponse } from '../types'

const WEEKDAY_ORDER: Array<WeeklyScheduleDay['weekday_key']> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const PRESETS = {
  weekdays: [0, 1, 2, 3, 4],
  weekend: [5, 6],
  sunday: [6],
  all: [0, 1, 2, 3, 4, 5, 6],
} as const

const todayIso = new Date().toISOString().slice(0, 10)
const scheduleHeroImage = '/schedule/holing-host-scaled.jpg'

export function SchedulePage() {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState(todayIso)

  const [schedule, setSchedule] = useState<WeeklyScheduleDay[]>([])
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eventLoadError, setEventLoadError] = useState('')

  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [isActive, setIsActive] = useState(true)
  const [scheduleSlots, setScheduleSlots] = useState<Array<{ time: string; label: string }>>([{ time: '', label: '' }])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState<'MASS' | 'MEETING' | 'FESTIVAL' | 'OTHER'>('MASS')
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventSuccess, setEventSuccess] = useState('')

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

  const orderedSchedule = useMemo(() => {
    const byKey = new Map(schedule.map((item) => [item.weekday_key, item]))
    return WEEKDAY_ORDER.map((key) => byKey.get(key)).filter((item): item is WeeklyScheduleDay => Boolean(item))
  }, [schedule])

  const selectedDaySchedule = useMemo(() => {
    if (!selectedDate || orderedSchedule.length === 0) return null
    const dateObj = new Date(`${selectedDate}T00:00:00`)
    if (Number.isNaN(dateObj.getTime())) return null
    const jsDay = dateObj.getDay()
    const weekday = jsDay === 0 ? 6 : jsDay - 1
    return orderedSchedule.find((item) => item.weekday === weekday) ?? null
  }, [orderedSchedule, selectedDate])

  const getScheduleSlotList = (item: WeeklyScheduleDay) => {
    if (item.service_slots && item.service_slots.length > 0) {
      return item.service_slots
    }

    if (item.service_time) {
      return [{ time: item.service_time, label: item.service_label }]
    }

    return []
  }

  const getEventTime = (eventDate: string) => {
    const parsed = new Date(eventDate)
    if (Number.isNaN(parsed.getTime())) {
      return '--:--'
    }
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getScheduleSlotLabel = (slot: { time: string; label: string }) => {
    if (slot.label?.trim()) {
      return slot.label.trim()
    }

    const normalizedTime = slot.time?.slice(0, 5)
    if (normalizedTime === '06:00') {
      return t('morningMass')
    }

    return ''
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    setEventLoadError('')

    const [scheduleResult, eventResult] = await Promise.allSettled([
      api.get<WeeklyScheduleResponse>(`/schedule/weekly/?date=${selectedDate}`),
      api.get<ScheduleEvent[]>(`/events/?date=${selectedDate}`),
    ])

    if (scheduleResult.status === 'fulfilled') {
      setSchedule(scheduleResult.value.data.days)
    } else {
      setError(t('scheduleLoadError'))
      setSchedule([])
    }

    if (eventResult.status === 'fulfilled') {
      setEvents(eventResult.value.data)
    } else {
      setEvents([])
      setEventLoadError(t('eventLoadError'))
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [selectedDate])

  useEffect(() => {
    const refresh = () => {
      void loadData()
    }

    const intervalId = window.setInterval(refresh, 20000)
    window.addEventListener('focus', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
    }
  }, [selectedDate])

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]))
  }

  const setPreset = (days: number[]) => {
    setSelectedDays(days)
  }

  const addScheduleSlot = () => {
    setScheduleSlots((prev) => [...prev, { time: '', label: '' }])
  }

  const removeScheduleSlot = (index: number) => {
    setScheduleSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const updateScheduleSlot = (index: number, field: 'time' | 'label', value: string) => {
    setScheduleSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)))
  }

  const applySchedule = async () => {
    setSaveError('')
    setSaveSuccess('')

    if (selectedDays.length === 0) {
      setSaveError(t('scheduleSelectDaysError'))
      return
    }

    const normalizedSlots = scheduleSlots
      .map((slot) => ({ time: slot.time.trim(), label: slot.label.trim() }))
      .filter((slot) => Boolean(slot.time))

    if (isActive && normalizedSlots.length === 0) {
      setSaveError(t('scheduleTimeRequiredError'))
      return
    }

    setSaving(true)
    try {
      const payload: {
        days: number[]
        is_active: boolean
        service_slots?: Array<{ time: string; label: string }>
        effective_from: string
      } = {
        days: selectedDays,
        is_active: isActive,
        effective_from: selectedDate,
      }

      if (isActive) {
        payload.service_slots = normalizedSlots.map((slot) => ({
          time: `${slot.time}:00`,
          label: slot.label,
        }))
      } else {
        payload.service_slots = []
      }

      const response = await api.post<WeeklyScheduleResponse>('/schedule/apply/', payload)
      setSchedule(response.data.days)
      await loadData()
      setSaveSuccess(t('scheduleSavedSuccess'))
    } catch {
      setSaveError(t('scheduleSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const createEvent = async () => {
    setEventError('')
    setEventSuccess('')

    if (!eventTitle.trim()) {
      setEventError(t('eventTitleRequired'))
      return
    }

    if (!eventTime) {
      setEventError(t('eventTimeRequired'))
      return
    }

    setEventSaving(true)
    try {
      const eventDate = `${selectedDate}T${eventTime}:00`
      await api.post('/events/', {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        type: eventType,
        event_date: eventDate,
        location: eventLocation.trim(),
        is_recurring: false,
        recurrence_rule: '',
      })

      setEventTitle('')
      setEventDescription('')
      setEventLocation('')
      setEventTime('')
      setEventType('MASS')
      setEventSuccess(t('eventSavedSuccess'))
      await loadData()
    } catch {
      setEventError(t('eventSaveError'))
    } finally {
      setEventSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">{t('schedule')}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('weeklySchedule')}</h1>
        </div>
        <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{t('chooseDate')}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-cream px-3 text-sm outline-none"
          />
        </div>
      </section>

      {!isAdmin ? (
        <section className="rounded-[2rem] bg-church-radial p-4 shadow-soft sm:p-6 lg:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-full max-w-[620px]">
                <div className="absolute -inset-4 rounded-full bg-gold/20 blur-3xl" aria-hidden="true" />
                <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[48%] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.15)]">
                  <img
                    src={scheduleHeroImage}
                    alt={t('scheduleHeroAlt')}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy/60">{t('schedule')}</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('holyMassTiming')}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t('scheduleHeroSubtitle')}</p>
                </div>
                <div className="rounded-full border border-navy/15 bg-cream px-4 py-2 text-sm font-semibold text-slate-700">
                  {t('selectedDateLabel')}: {selectedDate}
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[1fr_2fr] bg-[#f0bc7d] px-4 py-3 text-sm font-bold text-slate-900">
                  <div>{t('day')}</div>
                  <div>{t('timing')}</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {orderedSchedule.map((item) => {
                    const slots = getScheduleSlotList(item)
                    return (
                      <div key={item.weekday} className="grid grid-cols-[1fr_2fr] gap-3 px-4 py-4 text-sm">
                        <div className="font-bold text-slate-900">{t(item.weekday_key)}</div>
                        <div className="space-y-2 text-slate-700">
                          {item.is_active && slots.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {slots.map((slot, index) => (
                                <span
                                  key={`${slot.time}-${index}`}
                                  className="inline-flex items-center rounded-full border border-navy/15 bg-cream px-3 py-1 text-xs font-semibold text-slate-800"
                                >
                                  {slot.time ? slot.time.slice(0, 5) : '--:--'}
                                  {getScheduleSlotLabel(slot) ? ` • ${getScheduleSlotLabel(slot)}` : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">{t('noService')}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

        {isAdmin ? (
          <section className="mb-6 rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">{t('manageSchedule')}</h2>
            <p className="mt-2 text-sm text-slate-700">{t('scheduleCarryForwardHint')}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreset([...PRESETS.weekdays])} className="rounded-full border border-navy/20 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{t('presetWeekdays')}</button>
              <button type="button" onClick={() => setPreset([...PRESETS.weekend])} className="rounded-full border border-navy/20 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{t('presetWeekend')}</button>
              <button type="button" onClick={() => setPreset([...PRESETS.sunday])} className="rounded-full border border-navy/20 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{t('presetSunday')}</button>
              <button type="button" onClick={() => setPreset([...PRESETS.all])} className="rounded-full border border-navy/20 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{t('presetAllDays')}</button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {orderedSchedule.map((item) => (
                <label key={item.weekday} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-cream px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(item.weekday)}
                    onChange={() => toggleDay(item.weekday)}
                    className="h-4 w-4 rounded border-slate-300 text-navy"
                  />
                  {t(item.weekday_key)}
                </label>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-1">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-cream px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-navy"
                />
                {t('dayEnabled')}
              </label>

              <div className="space-y-2">
                {scheduleSlots.map((slot, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(event) => updateScheduleSlot(index, 'time', event.target.value)}
                      className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                      disabled={!isActive}
                    />
                    <input
                      value={slot.label}
                      onChange={(event) => updateScheduleSlot(index, 'label', event.target.value)}
                      placeholder={t('serviceLabelOptional')}
                      className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
                      disabled={!isActive}
                    />
                    <button
                      type="button"
                      onClick={() => removeScheduleSlot(index)}
                      disabled={!isActive || scheduleSlots.length === 1}
                      className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('removeTimeSlot')}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addScheduleSlot}
                  disabled={!isActive}
                  className="inline-flex min-h-11 items-center rounded-2xl border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('addTimeSlot')}
                </button>
              </div>
            </div>

            {saveError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p> : null}
            {saveSuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{saveSuccess}</p> : null}

            <div className="mt-4">
              <button type="button" onClick={applySchedule} disabled={saving} className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                {saving ? t('saving') : t('applySchedule')}
              </button>
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <section className="mb-6 rounded-[2rem] border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">{t('addEventForDate')}</h2>
            <p className="mt-2 text-sm text-slate-700">{t('eventDateHint')}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder={t('eventTitle')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
              />
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value as 'MASS' | 'MEETING' | 'FESTIVAL' | 'OTHER')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
              >
                <option value="MASS">{t('eventTypeMass')}</option>
                <option value="MEETING">{t('eventTypeMeeting')}</option>
                <option value="FESTIVAL">{t('eventTypeFestival')}</option>
                <option value="OTHER">{t('eventTypeOther')}</option>
              </select>
              <input
                type="time"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
              />
              <input
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                placeholder={t('eventLocation')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none"
              />
              <input
                value={eventDescription}
                onChange={(event) => setEventDescription(event.target.value)}
                placeholder={t('notes')}
                className="min-h-11 rounded-2xl border border-slate-300 bg-cream px-4 text-sm outline-none lg:col-span-2"
              />
            </div>

            {eventError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{eventError}</p> : null}
            {eventSuccess ? <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{eventSuccess}</p> : null}

            <div className="mt-4">
              <button type="button" onClick={createEvent} disabled={eventSaving} className="inline-flex min-h-11 items-center rounded-2xl bg-navy px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                {eventSaving ? t('saving') : t('saveEvent')}
              </button>
            </div>
          </section>
        ) : null}

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('scheduleForSelectedDate')}</h2>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-cream p-4">
              {loading ? (
                <p className="text-sm text-slate-600">{t('loadingSchedule')}</p>
              ) : selectedDaySchedule ? (
                selectedDaySchedule.is_active && getScheduleSlotList(selectedDaySchedule).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getScheduleSlotList(selectedDaySchedule).map((slot, index) => (
                      <span
                        key={`${slot.time}-${index}`}
                        className="inline-flex items-center rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-semibold text-slate-800"
                      >
                        {slot.time ? slot.time.slice(0, 5) : '--:--'}
                        {getScheduleSlotLabel(slot) ? ` • ${getScheduleSlotLabel(slot)}` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">{t('noService')}</p>
                )
              ) : (
                <p className="text-sm text-slate-600">{t('scheduleLoadError')}</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('eventsForSelectedDate')}</h2>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-cream p-4">
              {eventLoadError ? (
                <p className="text-sm text-red-700">{eventLoadError}</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-slate-600">{t('noEventsForDate')}</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((event) => (
                    <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{event.title}</p>
                        <span className="rounded-full border border-navy/15 bg-cream px-2 py-1 text-xs font-semibold text-slate-700">
                          {getEventTime(event.event_date)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{event.type}</p>
                      {event.location ? <p className="mt-1 text-sm text-slate-700">{event.location}</p> : null}
                      {event.description ? <p className="mt-1 text-sm text-slate-600">{event.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}

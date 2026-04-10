import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { api } from '../api/http'
import { FourTileNav } from '../components/FourTileNav'
import type { DashboardBannerImage, DashboardBannerResponse } from '../types'

export function DashboardPage() {
  const { t } = useTranslation()
  const [bannerItems, setBannerItems] = useState<DashboardBannerImage[]>([])
  const [bannerUrls, setBannerUrls] = useState<string[]>(['/banners/image.png', '/banners/church.jpg'])
  const [activeIndex, setActiveIndex] = useState(0)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminError, setAdminError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const user = useMemo(() => {
    const stored = sessionStorage.getItem('ecclesia_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as { is_staff?: boolean }
    } catch {
      return null
    }
  }, [])

  const isAdmin = Boolean(user?.is_staff)

  const syncBannerUrls = (images: DashboardBannerImage[]) => {
    const urls = images.map((item) => item.image_url).filter(Boolean)
    if (urls.length > 0) {
      setBannerUrls(urls)
      return
    }
    setBannerUrls(['/banners/image.png', '/banners/church.jpg'])
  }

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const { data } = await api.get<DashboardBannerResponse>('/banners/')
        const images = data.images ?? []
        setBannerItems(images)
        syncBannerUrls(images)
      } catch {
        setBannerItems([])
        setBannerUrls(['/banners/image.png', '/banners/church.jpg'])
      }
    }

    void loadBanners()
  }, [])

  useEffect(() => {
    if (!bannerUrls.length) {
      setActiveIndex(0)
      return
    }
    if (activeIndex > bannerUrls.length - 1) {
      setActiveIndex(0)
    }
  }, [activeIndex, bannerUrls.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % bannerUrls.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [bannerUrls.length])

  const onSaveBanners = async () => {
    if (!selectedFiles.length) {
      setAdminError(t('bannerSelectOneImage'))
      setAdminMessage('')
      return
    }

    setAdminSaving(true)
    setAdminMessage('')
    setAdminError('')

    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append('images', file))

    try {
      const { data } = await api.request<DashboardBannerResponse>({
        url: '/banners/',
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const images = data.images ?? []
      setBannerItems(images)
      syncBannerUrls(images)
      setSelectedFiles([])
      setAdminMessage(t('bannerUpdatedSuccess'))
      setAdminError('')
    } catch {
      setAdminError(t('bannerUpdateError'))
      setAdminMessage('')
    } finally {
      setAdminSaving(false)
    }
  }

  const onDeleteBanner = async (bannerId: number) => {
    if (!isAdmin) return

    setAdminSaving(true)
    setAdminMessage('')
    setAdminError('')

    try {
      const { data } = await api.delete<DashboardBannerResponse>(`/banners/${bannerId}/`)
      const images = data.images ?? []
      setBannerItems(images)
      syncBannerUrls(images)
      setAdminMessage(t('bannerDeletedSuccess'))
    } catch {
      setAdminError(t('bannerDeleteError'))
    } finally {
      setAdminSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-navy/70">{t('appName')}</p>
        <h1 className="mt-3 text-4xl font-extrabold text-slate-900">{t('dashboardTitle')}</h1>
      </motion.header>

      <section className="relative left-1/2 mb-10 w-screen -translate-x-1/2 overflow-hidden border-y border-navy/20 bg-slate-950 shadow-soft">
        <div className="relative h-[58vh] min-h-[420px] w-full max-h-[760px]">
          {bannerUrls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={t('bannerAlt', { number: index + 1 })}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-black/35" />

          <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between px-3 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev - 1 + bannerUrls.length) % bannerUrls.length)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/20 text-2xl font-bold text-white backdrop-blur transition hover:bg-white/35"
              aria-label={t('bannerPrev')}
            >
              &#8249;
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % bannerUrls.length)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/20 text-2xl font-bold text-white backdrop-blur transition hover:bg-white/35"
              aria-label={t('bannerNext')}
            >
              &#8250;
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-10 z-20 px-6 text-center text-white">
            <h2 className="text-3xl font-bold drop-shadow sm:text-4xl">{t('appName')}</h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm font-medium text-white/90 sm:text-base">
              {t('dashboardBannerSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev + 1) % bannerUrls.length)}
            className="absolute inset-0 z-10"
            aria-label={t('bannerNext')}
          />

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {bannerUrls.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t('bannerGoTo', { number: index + 1 })}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-8 rounded-full transition ${
                  index === activeIndex ? 'bg-white' : 'bg-white/45'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="mb-8 rounded-3xl border border-navy/15 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-slate-900">{t('manageBanners')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('manageBannersHint')}</p>
          <div className="mt-4 space-y-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>{t('bannerImages')}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                className="block w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-slate-500">{t('bannerSelectedCount', { count: selectedFiles.length })}</p>
          </div>

          {bannerItems.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bannerItems.map((item, idx) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-navy/15">
                  <img src={item.image_url} alt={t('bannerAlt', { number: idx + 1 })} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold text-slate-600">#{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteBanner(item.id)}
                      disabled={adminSaving}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('deleteBanner')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              onClick={onSaveBanners}
              disabled={adminSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adminSaving ? t('saving') : t('uploadBanners')}
            </button>
          </div>
          {adminMessage ? <p className="mt-3 text-sm text-emerald-700">{adminMessage}</p> : null}
          {adminError ? <p className="mt-3 text-sm text-rose-700">{adminError}</p> : null}
        </section>
      ) : null}

      <FourTileNav />
    </main>
  )
}

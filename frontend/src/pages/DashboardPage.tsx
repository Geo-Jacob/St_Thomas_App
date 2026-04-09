import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FourTileNav } from '../components/FourTileNav'

export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-navy/70">{t('appName')}</p>
        <h1 className="mt-3 text-4xl font-extrabold text-slate-900">{t('dashboardTitle')}</h1>
      </motion.header>

      <FourTileNav />
    </main>
  )
}

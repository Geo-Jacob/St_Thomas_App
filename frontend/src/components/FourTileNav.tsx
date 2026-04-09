import { BookOpenText, CalendarDays, CreditCard, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const items = [
  { to: '/directory', labelKey: 'directory', icon: BookOpenText },
  { to: '/certificates', labelKey: 'certificates', icon: CreditCard },
  { to: '/schedule', labelKey: 'schedule', icon: CalendarDays },
  { to: '/profile', labelKey: 'profile', icon: UserRound },
]

export function FourTileNav() {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('dashboardTitle')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-36 flex-col justify-between rounded-3xl border p-5 shadow-soft transition ${isActive ? 'border-gold bg-navy text-white' : 'border-navy/10 bg-white hover:-translate-y-1 hover:border-navy/25'}`
            }
          >
            <Icon className="h-10 w-10" aria-hidden="true" />
            <span className="text-lg font-semibold">{t(item.labelKey)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

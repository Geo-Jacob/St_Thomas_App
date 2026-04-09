import { PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Member } from '../types'

type Props = {
  member: Member
}

export function MemberCard({ member }: Props) {
  const { t } = useTranslation()
  const familyLabel = member.family_name ? `${member.family_name}${member.family_code ? ` (${member.family_code})` : ''}` : '—'
  const unitLabel = member.unit_name ? `${member.unit_name}${member.unit_code ? ` (${member.unit_code})` : ''}` : '—'
  const wardLabel = member.ward_name ? `${member.ward_name}${member.ward_code ? ` (${member.ward_code})` : ''}` : '—'

  return (
    <article className="rounded-3xl border border-navy/10 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{member.display_name}</h3>
          <p className="mt-1 text-sm text-slate-600">{member.house_name || '—'}</p>
        </div>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-navy">
          {wardLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium">{t('family')}</dt>
          <dd>{familyLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium">{t('unit')}</dt>
          <dd>{unitLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium">{t('phone')}</dt>
          <dd className="text-right">{member.phone_number || '—'}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <a
          href={member.phone_number ? `tel:${member.phone_number}` : '#'}
          aria-label={`Call ${member.display_name}`}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${member.phone_number ? 'bg-navy text-white hover:bg-navy/90' : 'pointer-events-none bg-slate-200 text-slate-500'}`}
        >
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
          {t('quickCall')}
        </a>
      </div>
    </article>
  )
}

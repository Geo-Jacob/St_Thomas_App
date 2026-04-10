import { PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Member } from '../types'

type Props = {
  member: Member
  familyMembers?: Member[]
  onOpenFamily?: (member: Member) => void
  localizeName?: (name: string) => string
}

export function MemberCard({ member, familyMembers, onOpenFamily, localizeName }: Props) {
  const { t } = useTranslation()
  const translateName = localizeName ?? ((name: string) => name)
  const displayName = translateName(member.family_head_name || member.display_name)
  const familyLabel = member.family_name ? `${member.family_name}${member.family_code ? ` (${member.family_code})` : ''}` : '—'
  const unitLabel = member.unit_name ? `${member.unit_name}${member.unit_code ? ` (${member.unit_code})` : ''}` : '—'
  const wardLabel = member.ward_name ? `${member.ward_name}${member.ward_code ? ` (${member.ward_code})` : ''}` : '—'
  const relationPriority: Record<Member['relation_to_family'], number> = {
    FATHER: 0,
    MOTHER: 1,
    SPOUSE: 2,
    SON: 3,
    DAUGHTER: 4,
    OTHER: 5,
  }
  const membersToShow = (familyMembers && familyMembers.length > 0 ? familyMembers : [member]).slice().sort((a, b) => {
    if (a.is_family_head && !b.is_family_head) return -1
    if (!a.is_family_head && b.is_family_head) return 1
    const relationDelta = relationPriority[a.relation_to_family] - relationPriority[b.relation_to_family]
    if (relationDelta !== 0) return relationDelta
    return a.id - b.id
  })

  return (
    <article
      className="rounded-3xl border border-navy/10 bg-white p-5 shadow-soft transition hover:border-navy/30"
      role={onOpenFamily ? 'button' : undefined}
      tabIndex={onOpenFamily ? 0 : undefined}
      onClick={onOpenFamily ? () => onOpenFamily(member) : undefined}
      onKeyDown={
        onOpenFamily
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpenFamily(member)
              }
            }
          : undefined
      }
      aria-label={onOpenFamily ? `${t('viewFamilyMembersFor')} ${displayName}` : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-cream/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('familyMembers')}</p>
        <div className="mt-2 space-y-2">
          {membersToShow.map((familyMember) => (
            <div key={familyMember.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="font-medium text-slate-900">{translateName(familyMember.display_name)}</span>
              <a
                href={familyMember.phone_number ? `tel:${familyMember.phone_number}` : '#'}
                onClick={(event) => event.stopPropagation()}
                className="text-navy"
              >
                {familyMember.phone_number || '—'}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <a
          href={member.phone_number ? `tel:${member.phone_number}` : '#'}
          aria-label={`Call ${displayName}`}
          onClick={(event) => event.stopPropagation()}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${member.phone_number ? 'bg-navy text-white hover:bg-navy/90' : 'pointer-events-none bg-slate-200 text-slate-500'}`}
        >
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
          {t('quickCall')}
        </a>
      </div>
    </article>
  )
}

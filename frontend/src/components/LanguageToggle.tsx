import { Radio, RadioGroup } from '@headlessui/react'
import { useTranslation } from 'react-i18next'

const options = [
  { id: 'en', label: 'EN' },
  { id: 'ml', label: 'ML' },
]

type Props = {
  className?: string
}

export function LanguageToggle({ className = '' }: Props) {
  const { i18n, t } = useTranslation()
  const active = i18n.language.startsWith('ml') ? 'ml' : 'en'

  return (
    <div className={`flex justify-end ${className}`.trim()}>
      <RadioGroup
        aria-label={t('language')}
        value={active}
        onChange={(value) => i18n.changeLanguage(value)}
        className="flex rounded-full border border-navy/15 bg-white/90 p-1 shadow-soft backdrop-blur"
      >
        {options.map((option) => (
          <Radio
            key={option.id}
            value={option.id}
            className="group min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 data-[checked]:bg-navy data-[checked]:text-white"
          >
            {option.label}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  )
}

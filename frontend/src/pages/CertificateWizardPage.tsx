import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react'
import { api } from '../api/http'
import type { AuthUser, CertificateRequest, CertificateType } from '../types'

type Props = {
  token: string
}

type ApiList<T> = {
  results?: T[]
}

const formatType = (type: CertificateType) => (type === 'BAPTISM' ? 'Baptism' : 'Marriage')

export function CertificateWizardPage({ token }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [certificateType, setCertificateType] = useState<CertificateType>('BAPTISM')
  const [applicantName, setApplicantName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<CertificateRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  const currentUser = useMemo(() => {
    const raw = sessionStorage.getItem('ecclesia_user')
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  }, [])

  const isAdmin = Boolean(currentUser?.is_staff)

  const loadRequests = async () => {
    if (!token) return
    setLoadingRequests(true)
    try {
      const response = await api.get<ApiList<CertificateRequest>>('/certificates/')
      setRequests(response.data.results ?? [])
    } catch {
      setStatus(t('requestLoadError'))
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      void loadRequests()
    }
  }, [isAdmin, token])

  const submitRequest = async () => {
    if (!token) return
    setSubmitting(true)
    setStatus('')
    try {
      await api.post('/certificates/', {
        certificate_type: certificateType,
        applicant_name: applicantName,
        notes,
      })
      setStatus(t('requestSubmittedSuccess'))
      setStep(1)
      setApplicantName('')
      setNotes('')
      setCertificateType('BAPTISM')
    } catch {
      setStatus(t('requestSubmitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const approveRequest = async (id: number) => {
    try {
      await api.post(`/certificates/${id}/approve/`, {
        verification_base_url: window.location.origin,
      })
      setStatus(t('requestApprovedSuccess'))
      await loadRequests()
    } catch {
      setStatus(t('requestApproveError'))
    }
  }

  const issueRequest = async (id: number) => {
    try {
      await api.post(`/certificates/${id}/issue/`)
      setStatus(t('requestIssuedSuccess'))
      await loadRequests()
    } catch {
      setStatus(t('requestIssueError'))
    }
  }

  if (isAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">{t('admin')}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{t('certificateApprovals')}</h1>
          <p className="mt-2 text-slate-700">{t('certificateApprovalHint')}</p>

          {status ? (
            <p role="status" className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {status}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            {loadingRequests ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-slate-600">{t('loadingMembers')}</div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-600">
                {t('noCertificateRequests')}
              </div>
            ) : (
              requests.map((request) => (
                <article key={request.id} className="rounded-3xl border border-slate-200 bg-cream p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{request.applicant_name}</h2>
                      <p className="mt-1 text-sm text-slate-700">{formatType(request.certificate_type)}</p>
                      <p className="mt-1 text-sm text-slate-600">{t('status')}: {request.status}</p>
                    </div>
                    <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy">
                      #{request.id}
                    </span>
                  </div>

                  {request.notes ? <p className="mt-3 text-sm text-slate-700">{request.notes}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    {request.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => void approveRequest(request.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-navy px-4 py-2 font-semibold text-white"
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        {t('approveCertificate')}
                      </button>
                    ) : null}

                    {request.status === 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={() => void issueRequest(request.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-navy bg-white px-4 py-2 font-semibold text-navy"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {t('issueCertificate')}
                      </button>
                    ) : null}

                    {request.pdf_file ? (
                      <a
                        href={request.pdf_file}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
                      >
                        {t('viewPdf')}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-navy/10 bg-white p-5 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy/70">{t('requestCertificate')}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{t('requestCertificate')}</h1>

        <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span className={`rounded-full px-3 py-1 ${step === 1 ? 'bg-navy text-white' : 'bg-slate-100'}`}>{t('stepOne')}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          <span className={`rounded-full px-3 py-1 ${step === 2 ? 'bg-navy text-white' : 'bg-slate-100'}`}>{t('stepTwo')}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          <span className={`rounded-full px-3 py-1 ${step === 3 ? 'bg-navy text-white' : 'bg-slate-100'}`}>{t('stepThree')}</span>
        </div>

        <div className="mt-6 space-y-5">
          {step === 1 ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">{t('certificateType')}</span>
              <select
                value={certificateType}
                onChange={(event) => setCertificateType(event.target.value as CertificateType)}
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base"
              >
                <option value="BAPTISM">Baptism</option>
                <option value="MARRIAGE">Marriage</option>
              </select>
            </label>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-800">{t('applicantName')}</span>
                <input
                  value={applicantName}
                  onChange={(event) => setApplicantName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-cream px-4 text-base"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-800">{t('notes')}</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-cream px-4 py-3 text-base"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="rounded-3xl border border-gold/30 bg-gold/10 p-5 text-slate-800">
              <p className="font-semibold">{t('review')}</p>
              <p className="mt-2">Type: {certificateType}</p>
              <p>Applicant: {applicantName || '—'}</p>
              <p>Notes: {notes || '—'}</p>
            </div>
          ) : null}

          {status ? (
            <p role="status" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {status}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((current) => current - 1)} className="min-h-11 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">
                {t('back')}
              </button>
            ) : null}

            {step < 3 ? (
              <button type="button" onClick={() => setStep((current) => current + 1)} className="min-h-11 rounded-2xl bg-navy px-4 py-2 font-semibold text-white">
                {t('next')}
              </button>
            ) : (
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-navy px-4 py-2 font-semibold text-white disabled:opacity-70"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {submitting ? '...' : t('submitRequest')}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

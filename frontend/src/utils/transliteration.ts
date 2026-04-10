const transliterationCache = new Map<string, Promise<string>>()

export async function transliterateNameToMalayalam(name: string): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return name
  }

  const cached = transliterationCache.get(trimmed)
  if (cached) {
    return cached
  }

  const request = fetch(
    `https://inputtools.google.com/request?itc=ml-t-i0-und&num=1&text=${encodeURIComponent(trimmed)}`
  )
    .then(async (response) => {
      if (!response.ok) {
        return trimmed
      }

      const data = (await response.json()) as unknown
      if (!Array.isArray(data) || data[0] !== 'SUCCESS') {
        return trimmed
      }

      const transliterated = (data as unknown[])[1]
      if (!Array.isArray(transliterated) || transliterated.length === 0) {
        return trimmed
      }

      const firstCandidateGroup = transliterated[0] as unknown[]
      if (!Array.isArray(firstCandidateGroup) || firstCandidateGroup.length < 2) {
        return trimmed
      }

      const candidates = firstCandidateGroup[1] as unknown[]
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return trimmed
      }

      const firstCandidate = candidates[0]
      if (typeof firstCandidate === 'string' && firstCandidate.trim()) {
        return firstCandidate
      }

      return trimmed
    })
    .catch(() => trimmed)

  transliterationCache.set(trimmed, request)
  return request
}

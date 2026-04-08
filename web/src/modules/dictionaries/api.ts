import { http } from '@/lib/http'

export const DICTIONARY_TYPE_OPTIONS = [
  { label: '承接单位', value: 'undertaking_unit' },
  { label: '项目类别', value: 'project_category' },
] as const

export type DictionaryType = typeof DICTIONARY_TYPE_OPTIONS[number]['value']

export type DictionaryOption = {
  type: DictionaryType
  code: string
  label: string
}

export type DictionaryEntry = {
  id: number
  type: DictionaryType
  typeLabel: string
  code: string
  label: string
  sortOrder: number
  enabled: boolean
  referenceCount: number
}

export type DictionaryEntryPayload = {
  type: DictionaryType
  code: string
  label: string
  sortOrder: number
  enabled: boolean
}

export async function getDictionaryOptions(type: DictionaryType) {
  const { data } = await http.get<DictionaryOption[]>('/api/dictionaries', { params: { type } })
  return data
}

export async function getDictionaryEntries(type?: DictionaryType) {
  const { data } = await http.get<DictionaryEntry[]>('/api/dictionaries/admin', {
    params: type ? { type } : undefined,
  })
  return data
}

export async function createDictionaryEntry(payload: DictionaryEntryPayload) {
  const { data } = await http.post<DictionaryEntry>('/api/dictionaries', payload)
  return data
}

export async function updateDictionaryEntry(entryId: number, payload: DictionaryEntryPayload) {
  const { data } = await http.put<DictionaryEntry>(`/api/dictionaries/${entryId}`, payload)
  return data
}

export async function deleteDictionaryEntry(entryId: number) {
  await http.delete(`/api/dictionaries/${entryId}`)
}

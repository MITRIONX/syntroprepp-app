import AsyncStorage from '@react-native-async-storage/async-storage'

const SERVER_URL_KEY = 'syntroprepp_server_url'
const DEFAULT_SERVER_URL = 'http://192.168.1.100:3200'

let serverUrl: string | null = null

export async function getServerUrl(): Promise<string> {
  if (!serverUrl) {
    serverUrl = await AsyncStorage.getItem(SERVER_URL_KEY) || DEFAULT_SERVER_URL
  }
  return serverUrl
}

export async function setServerUrl(url: string) {
  serverUrl = url
  await AsyncStorage.setItem(SERVER_URL_KEY, url)
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getServerUrl()
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

export const api = {
  health: () => apiFetch<{ status: string }>('/api/health'),
  lagerorte: {
    list: () => apiFetch<unknown[]>('/api/lagerorte'),
    create: (data: { id?: string; name: string }) => apiFetch('/api/lagerorte', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name: string }) => apiFetch(`/api/lagerorte/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/lagerorte/${id}`, { method: 'DELETE' }),
  },
  kategorien: {
    list: () => apiFetch<unknown[]>('/api/kategorien'),
    create: (data: { id?: string; name: string }) => apiFetch('/api/kategorien', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name: string }) => apiFetch(`/api/kategorien/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/kategorien/${id}`, { method: 'DELETE' }),
  },
  kisten: {
    list: (lagerortId?: string) => apiFetch<unknown[]>(`/api/kisten${lagerortId ? `?lagerort_id=${lagerortId}` : ''}`),
    get: (id: string) => apiFetch<unknown>(`/api/kisten/${id}`),
    create: (data: { id?: string; nummer: string; name?: string; lagerort_id?: string }) => apiFetch('/api/kisten', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { nummer: string; name?: string; lagerort_id?: string }) => apiFetch(`/api/kisten/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/kisten/${id}`, { method: 'DELETE' }),
  },
  produkte: {
    list: () => apiFetch<unknown[]>('/api/produkte'),
    get: (id: string) => apiFetch<unknown>(`/api/produkte/${id}`),
    create: (data: Record<string, unknown>) => apiFetch('/api/produkte', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/produkte/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  waren: {
    list: (kisteId?: string) => apiFetch<unknown[]>(`/api/waren${kisteId ? `?kiste_id=${kisteId}` : ''}`),
    get: (id: string) => apiFetch<unknown>(`/api/waren/${id}`),
    create: (data: Record<string, unknown>) => apiFetch('/api/waren', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/waren/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/waren/${id}`, { method: 'DELETE' }),
  },
  ean: {
    lookup: (code: string) => apiFetch<{ found: boolean; source?: string; product?: unknown }>(`/api/ean/${code}`),
  },
  sync: {
    pull: (since: string) => apiFetch<{ changes: Record<string, unknown[]>; server_time: string }>(`/api/sync/pull?since=${encodeURIComponent(since)}`),
    push: (changes: Record<string, unknown[]>) => apiFetch<{ applied: Record<string, number>; server_time: string }>('/api/sync/push', { method: 'POST', body: JSON.stringify({ changes }) }),
  },
}

export async function isServerReachable(): Promise<boolean> {
  try { await api.health(); return true } catch { return false }
}

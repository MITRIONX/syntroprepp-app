export interface Lagerort {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted: boolean
}

export interface Kategorie {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted: boolean
}

export interface Kiste {
  id: string
  nummer: string
  name: string | null
  lagerort_id: string | null
  lagerort_name?: string
  artikel_count?: number
  created_at: string
  updated_at: string
  deleted: boolean
}

export interface Produkt {
  id: string
  ean: string | null
  name: string
  bild_url: string | null
  kategorie_id: string | null
  kategorie_name?: string
  gewicht: string | null
  naehrwerte: Record<string, unknown> | null
  beschreibung: string | null
  beipackzettel_url: string | null
  quelle: 'gescannt' | 'manuell'
  created_at: string
  updated_at: string
  deleted: boolean
}

export interface Ware {
  id: string
  produkt_id: string
  kiste_id: string
  menge: number
  mhd_datum: string | null
  mhd_geschaetzt: string | null
  mhd_typ: 'exakt' | 'geschaetzt'
  einlagerungsdatum: string
  notizen: string | null
  produkt_name?: string
  bild_url?: string
  ean?: string
  kisten_nummer?: string
  kisten_name?: string
  lagerort_name?: string
  kategorie_name?: string
  created_at: string
  updated_at: string
  device_id: string | null
  deleted: boolean
}

export type SyncStatus = 'synced' | 'pending' | 'offline'

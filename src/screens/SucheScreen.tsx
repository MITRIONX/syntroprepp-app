import React, { useCallback, useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Search } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll } from '../lib/db'
import { Ware, Lagerort, Kategorie, Kiste } from '../types'
import MhdBadge from '../components/MhdBadge'
import FilterBar from '../components/FilterBar'
import EmptyState from '../components/EmptyState'

export default function SucheScreen() {
  const navigation = useNavigation<any>()
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<Ware[]>([])
  const [lagerorte, setLagerorte] = useState<Lagerort[]>([])
  const [kategorien, setKategorien] = useState<Kategorie[]>([])
  const [kisten, setKisten] = useState<Kiste[]>([])
  const [filterLagerort, setFilterLagerort] = useState<string | null>(null)
  const [filterKategorie, setFilterKategorie] = useState<string | null>(null)
  const [filterKiste, setFilterKiste] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { loadFilters() }, []))

  async function loadFilters() {
    setLagerorte(await dbGetAll('SELECT * FROM lagerorte WHERE deleted = 0 ORDER BY name'))
    setKategorien(await dbGetAll('SELECT * FROM kategorien WHERE deleted = 0 ORDER BY name'))
    setKisten(await dbGetAll('SELECT * FROM kisten WHERE deleted = 0 ORDER BY nummer'))
  }

  async function doSearch() {
    let sql = `SELECT w.*, p.name as produkt_name, p.bild_url, p.ean, p.kategorie_id,
      k.nummer as kisten_nummer, k.name as kisten_name, k.lagerort_id,
      l.name as lagerort_name, ka.name as kategorie_name
      FROM waren w LEFT JOIN produkte p ON w.produkt_id = p.id LEFT JOIN kisten k ON w.kiste_id = k.id
      LEFT JOIN lagerorte l ON k.lagerort_id = l.id LEFT JOIN kategorien ka ON p.kategorie_id = ka.id
      WHERE w.deleted = 0`
    const params: unknown[] = []
    if (searchText.trim()) { sql += ' AND (p.name LIKE ? OR p.ean LIKE ? OR w.notizen LIKE ?)'; const term = `%${searchText.trim()}%`; params.push(term, term, term) }
    if (filterLagerort) { sql += ' AND k.lagerort_id = ?'; params.push(filterLagerort) }
    if (filterKategorie) { sql += ' AND p.kategorie_id = ?'; params.push(filterKategorie) }
    if (filterKiste) { sql += ' AND w.kiste_id = ?'; params.push(filterKiste) }
    sql += ' ORDER BY p.name LIMIT 100'
    setResults(await dbGetAll<Ware>(sql, params))
  }

  useEffect(() => { doSearch() }, [searchText, filterLagerort, filterKategorie, filterKiste])

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search size={20} color={theme.colors.textMuted} />
        <TextInput style={styles.searchInput} value={searchText} onChangeText={setSearchText} placeholder="Produkt, EAN oder Notiz suchen..." placeholderTextColor={theme.colors.textMuted} />
      </View>
      <View style={styles.filters}>
        <FilterBar label="Lagerort" options={lagerorte.map(l => ({ id: l.id, label: l.name }))} selected={filterLagerort} onSelect={setFilterLagerort} />
        <FilterBar label="Kategorie" options={kategorien.map(k => ({ id: k.id, label: k.name }))} selected={filterKategorie} onSelect={setFilterKategorie} />
        <FilterBar label="Kiste" options={kisten.map(k => ({ id: k.id, label: k.nummer }))} selected={filterKiste} onSelect={setFilterKiste} />
      </View>
      <FlatList data={results} keyExtractor={item => item.id}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<EmptyState icon={<Search size={48} color={theme.colors.textMuted} />} title={searchText ? 'Keine Ergebnisse' : 'Suche starten'} subtitle={searchText ? 'Versuche einen anderen Suchbegriff' : 'Gib einen Suchbegriff ein oder nutze die Filter'} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProduktDetail', { id: item.produkt_id })}>
            <View style={styles.cardTop}><Text style={styles.produktName}>{item.produkt_name}</Text><MhdBadge mhd_datum={item.mhd_datum} mhd_geschaetzt={item.mhd_geschaetzt} mhd_typ={item.mhd_typ} /></View>
            <Text style={styles.meta}>Kiste {item.kisten_nummer} | {item.lagerort_name || 'Kein Ort'} | x{item.menge}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: theme.fontSize.md, paddingVertical: theme.spacing.md },
  filters: { paddingHorizontal: theme.spacing.md },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  produktName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600', flex: 1, marginRight: 8 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
})

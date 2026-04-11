import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { Package, Plus, Trash2, Edit } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll, dbGetFirst, dbRun } from '../lib/db'
import { Kiste, Ware } from '../types'
import MhdBadge from '../components/MhdBadge'
import EmptyState from '../components/EmptyState'

export default function KisteDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { id } = route.params
  const [kiste, setKiste] = useState<Kiste | null>(null)
  const [waren, setWaren] = useState<Ware[]>([])

  useFocusEffect(useCallback(() => { loadData() }, [id]))

  async function loadData() {
    const k = await dbGetFirst<Kiste>('SELECT * FROM kisten WHERE id = ? AND deleted = 0', [id])
    setKiste(k)
    if (k) navigation.setOptions({ title: `Kiste ${k.nummer}` })
    const w = await dbGetAll<Ware>(`
      SELECT w.*, p.name as produkt_name, p.bild_url, p.ean
      FROM waren w LEFT JOIN produkte p ON w.produkt_id = p.id
      WHERE w.kiste_id = ? AND w.deleted = 0 ORDER BY w.einlagerungsdatum DESC
    `, [id])
    setWaren(w)
  }

  function confirmDelete() {
    Alert.alert('Kiste loeschen', `Kiste ${kiste?.nummer} wirklich loeschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loeschen', style: 'destructive', onPress: async () => {
        await dbRun('UPDATE kisten SET deleted = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), id])
        navigation.goBack()
      }},
    ])
  }

  if (!kiste) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.nummer}>{kiste.nummer}</Text>
          {kiste.name && <Text style={styles.name}>{kiste.name}</Text>}
          <Text style={styles.count}>{waren.length} Artikel</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('KisteForm', { id: kiste.id })}><Edit size={22} color={theme.colors.primaryLight} /></TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete}><Trash2 size={22} color={theme.colors.danger} /></TouchableOpacity>
        </View>
      </View>
      <FlatList data={waren} keyExtractor={item => item.id}
        contentContainerStyle={waren.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon={<Package size={48} color={theme.colors.textMuted} />} title="Kiste ist leer" subtitle="Scanne einen EAN oder lege manuell einen Artikel an" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProduktDetail', { id: item.produkt_id })}>
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.produktName}>{item.produkt_name || 'Unbekannt'}</Text>
                <Text style={styles.menge}>Menge: {item.menge}</Text>
              </View>
              <MhdBadge mhd_datum={item.mhd_datum} mhd_geschaetzt={item.mhd_geschaetzt} mhd_typ={item.mhd_typ} />
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('WareForm', { kiste_id: id })}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerInfo: { flex: 1 }, headerActions: { flexDirection: 'row', gap: 16 },
  nummer: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  name: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginTop: 2 },
  count: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  list: { padding: theme.spacing.md },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: theme.spacing.sm },
  produktName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  menge: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 2 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
})

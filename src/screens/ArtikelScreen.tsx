import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Package, Trash2, Clock } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll, dbRun } from '../lib/db'
import { Produkt } from '../types'
import EmptyState from '../components/EmptyState'

export default function ArtikelScreen() {
  const navigation = useNavigation<any>()
  const [produkte, setProdukte] = useState<(Produkt & { waren_count: number })[]>([])

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    const rows = await dbGetAll<Produkt & { waren_count: number }>(`
      SELECT p.*, (SELECT COUNT(*) FROM waren w WHERE w.produkt_id = p.id AND w.deleted = 0) as waren_count
      FROM produkte p WHERE p.deleted = 0 ORDER BY p.name
    `)
    setProdukte(rows)
  }

  function confirmDelete(item: Produkt) {
    Alert.alert('Produkt loeschen', `"${item.name}" wirklich loeschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loeschen', style: 'destructive', onPress: async () => {
        await dbRun('UPDATE produkte SET deleted = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), item.id])
        load()
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('VerzehrHistorie')}>
        <Clock size={18} color={theme.colors.primaryLight} />
        <Text style={styles.historyBtnText}>Verzehr-Historie</Text>
      </TouchableOpacity>

      <FlatList data={produkte} keyExtractor={item => item.id}
        contentContainerStyle={produkte.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon={<Package size={48} color={theme.colors.textMuted} />} title="Keine Artikel" subtitle="Scanne einen EAN oder lege manuell an" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProduktDetail', { id: item.id })}>
            <View style={styles.cardRow}>
              {item.bild_url ? (
                <Image source={{ uri: item.bild_url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}><Package size={20} color={theme.colors.textMuted} /></View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.produktName}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.ean ? `EAN: ${item.ean}` : item.quelle === 'manuell' ? 'Manuell angelegt' : 'Gescannt'}
                  {item.waren_count > 0 ? ` | ${item.waren_count}x in Kisten` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                <Trash2 size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1 },
  list: { padding: theme.spacing.md },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: theme.spacing.md, marginBottom: 0,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  historyBtnText: { color: theme.colors.primaryLight, fontSize: theme.fontSize.md, fontWeight: '600' },
  card: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 44, height: 44, borderRadius: theme.borderRadius.sm },
  thumbPlaceholder: { backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  produktName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  deleteBtn: { padding: 8 },
})

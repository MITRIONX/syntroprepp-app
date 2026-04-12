import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Package, Trash2, Clock, MapPin, Box } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll, dbRun } from '../lib/db'
import { Produkt } from '../types'
import EmptyState from '../components/EmptyState'

interface ProduktMitBestand extends Produkt {
  gesamt_menge: number
  standorte: string
}

export default function ArtikelScreen() {
  const navigation = useNavigation<any>()
  const [produkte, setProdukte] = useState<ProduktMitBestand[]>([])

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    // Erst alle Produkte holen
    const rows = await dbGetAll<Produkt & { gesamt_menge: number }>(`
      SELECT p.*,
        COALESCE((SELECT SUM(w.menge) FROM waren w WHERE w.produkt_id = p.id AND w.deleted = 0), 0) as gesamt_menge
      FROM produkte p WHERE p.deleted = 0 ORDER BY p.name
    `)

    // Dann fuer jedes Produkt die Standorte laden
    const result: ProduktMitBestand[] = []
    for (const p of rows) {
      const orte = await dbGetAll<{ kisten_nummer: string; lagerort_name: string | null; menge: number }>(`
        SELECT k.nummer as kisten_nummer, l.name as lagerort_name, w.menge
        FROM waren w
        LEFT JOIN kisten k ON w.kiste_id = k.id
        LEFT JOIN lagerorte l ON k.lagerort_id = l.id
        WHERE w.produkt_id = ? AND w.deleted = 0
      `, [p.id])

      const standorte = orte.map(o =>
        `${o.menge}x ${o.kisten_nummer}${o.lagerort_name ? ` (${o.lagerort_name})` : ''}`
      ).join(', ')

      result.push({ ...p, standorte })
    }
    setProdukte(result)
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
                {item.gesamt_menge > 0 ? (
                  <View style={styles.bestandRow}>
                    <Box size={12} color={theme.colors.success} />
                    <Text style={styles.bestand}>{item.gesamt_menge}x vorhanden</Text>
                  </View>
                ) : (
                  <Text style={styles.keinBestand}>Nicht eingelagert</Text>
                )}
                {item.standorte ? (
                  <View style={styles.ortRow}>
                    <MapPin size={12} color={theme.colors.textMuted} />
                    <Text style={styles.ortText} numberOfLines={2}>{item.standorte}</Text>
                  </View>
                ) : null}
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
  bestandRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  bestand: { color: theme.colors.success, fontSize: theme.fontSize.sm, fontWeight: '600' },
  keinBestand: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 3 },
  ortRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 },
  ortText: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, flex: 1 },
  deleteBtn: { padding: 8 },
})

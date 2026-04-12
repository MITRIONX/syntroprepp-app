import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { UtensilsCrossed } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll } from '../lib/db'
import EmptyState from '../components/EmptyState'

interface VerzehrEintrag {
  id: string
  produkt_id: string
  produkt_name: string
  menge: number
  verzehrt_am: string
  kiste_nummer: string
}

function formatDateTime(dateStr: string): string {
  const parts = dateStr.split('T')
  if (parts.length < 2) return dateStr
  const dateParts = parts[0].split('-')
  const timeParts = parts[1].split(':')
  return `${dateParts[2]}.${dateParts[1]}.${dateParts[0]} ${timeParts[0]}:${timeParts[1]}`
}

export default function VerzehrHistorieScreen() {
  const [eintraege, setEintraege] = useState<VerzehrEintrag[]>([])

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    setEintraege(await dbGetAll<VerzehrEintrag>('SELECT * FROM verzehr_historie ORDER BY verzehrt_am DESC'))
  }

  return (
    <View style={styles.container}>
      <FlatList data={eintraege} keyExtractor={item => item.id}
        contentContainerStyle={eintraege.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon={<UtensilsCrossed size={48} color={theme.colors.textMuted} />} title="Noch nichts verzehrt" subtitle="Swipe einen Artikel nach rechts um ihn als verzehrt zu markieren" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <UtensilsCrossed size={18} color={theme.colors.primaryLight} />
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.produkt_name}</Text>
                <Text style={styles.meta}>
                  x{item.menge} | {item.kiste_nummer ? `aus Kiste ${item.kiste_nummer}` : 'Keine Kiste'}
                </Text>
              </View>
              <Text style={styles.date}>{formatDateTime(item.verzehrt_am)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1 },
  list: { padding: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md, marginBottom: theme.spacing.xs,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1 },
  name: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  date: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs },
})

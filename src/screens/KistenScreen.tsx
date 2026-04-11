import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Box, Plus, MapPin } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll } from '../lib/db'
import { Kiste } from '../types'
import EmptyState from '../components/EmptyState'

export default function KistenScreen() {
  const navigation = useNavigation<any>()
  const [kisten, setKisten] = useState<Kiste[]>([])

  useFocusEffect(useCallback(() => { loadKisten() }, []))

  async function loadKisten() {
    const rows = await dbGetAll<Kiste>(`
      SELECT k.*, l.name as lagerort_name FROM kisten k
      LEFT JOIN lagerorte l ON k.lagerort_id = l.id
      WHERE k.deleted = 0 ORDER BY k.nummer
    `)
    setKisten(rows)
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={kisten} keyExtractor={item => item.id}
        contentContainerStyle={kisten.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon={<Box size={48} color={theme.colors.textMuted} />} title="Keine Kisten" subtitle="Tippe + um eine neue Kiste anzulegen" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('KisteDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <Box size={20} color={theme.colors.primaryLight} />
              <Text style={styles.nummer}>{item.nummer}</Text>
            </View>
            {item.name && <Text style={styles.name}>{item.name}</Text>}
            {(item as any).lagerort_name && (
              <View style={styles.lagerortRow}>
                <MapPin size={12} color={theme.colors.textSecondary} />
                <Text style={styles.lagerort}>{(item as any).lagerort_name}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('KisteForm')}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1 },
  list: { padding: theme.spacing.md },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nummer: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  name: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginTop: 4 },
  lagerortRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  lagerort: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
})

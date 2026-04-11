import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Box, Package, AlertTriangle, Clock } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetAll, dbGetFirst } from '../lib/db'
import { Ware } from '../types'
import MhdBadge from '../components/MhdBadge'

interface Stats { kistenCount: number; warenCount: number; abgelaufen: number; baldAblaufend: number }

export default function DashboardScreen() {
  const navigation = useNavigation<any>()
  const [stats, setStats] = useState<Stats>({ kistenCount: 0, warenCount: 0, abgelaufen: 0, baldAblaufend: 0 })
  const [expiring, setExpiring] = useState<Ware[]>([])
  const [recent, setRecent] = useState<Ware[]>([])

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    const kisten = await dbGetFirst<{ count: number }>('SELECT COUNT(*) as count FROM kisten WHERE deleted = 0')
    const waren = await dbGetFirst<{ count: number }>('SELECT COUNT(*) as count FROM waren WHERE deleted = 0')
    const today = new Date().toISOString().split('T')[0]
    const in90days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const abgelaufen = await dbGetFirst<{ count: number }>("SELECT COUNT(*) as count FROM waren WHERE deleted = 0 AND mhd_typ = 'exakt' AND mhd_datum < ?", [today])
    const bald = await dbGetFirst<{ count: number }>("SELECT COUNT(*) as count FROM waren WHERE deleted = 0 AND mhd_typ = 'exakt' AND mhd_datum >= ? AND mhd_datum <= ?", [today, in90days])
    setStats({ kistenCount: kisten?.count || 0, warenCount: waren?.count || 0, abgelaufen: abgelaufen?.count || 0, baldAblaufend: bald?.count || 0 })
    setExpiring(await dbGetAll<Ware>(`SELECT w.*, p.name as produkt_name, k.nummer as kisten_nummer FROM waren w LEFT JOIN produkte p ON w.produkt_id = p.id LEFT JOIN kisten k ON w.kiste_id = k.id WHERE w.deleted = 0 AND w.mhd_typ = 'exakt' AND w.mhd_datum <= ? ORDER BY w.mhd_datum ASC LIMIT 10`, [in90days]))
    setRecent(await dbGetAll<Ware>(`SELECT w.*, p.name as produkt_name, k.nummer as kisten_nummer FROM waren w LEFT JOIN produkte p ON w.produkt_id = p.id LEFT JOIN kisten k ON w.kiste_id = k.id WHERE w.deleted = 0 ORDER BY w.created_at DESC LIMIT 5`))
  }

  return (
    <FlatList style={styles.container}
      ListHeaderComponent={<>
        <View style={styles.statsRow}>
          <StatCard icon={<Box size={24} color={theme.colors.primaryLight} />} label="Kisten" value={stats.kistenCount} />
          <StatCard icon={<Package size={24} color={theme.colors.primaryLight} />} label="Artikel" value={stats.warenCount} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon={<AlertTriangle size={24} color={theme.colors.danger} />} label="Abgelaufen" value={stats.abgelaufen} color={theme.colors.danger} />
          <StatCard icon={<Clock size={24} color={theme.colors.warning} />} label="Bald ablaufend" value={stats.baldAblaufend} color={theme.colors.warning} />
        </View>
        {expiring.length > 0 && <Text style={styles.sectionTitle}>Bald ablaufend / Abgelaufen</Text>}
      </>}
      data={expiring} keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('ProduktDetail', { id: item.produkt_id })}>
          <View style={styles.itemInfo}><Text style={styles.itemName}>{item.produkt_name}</Text><Text style={styles.itemKiste}>{item.kisten_nummer ? `Kiste ${item.kisten_nummer}` : 'Keine Kiste'}</Text></View>
          <MhdBadge mhd_datum={item.mhd_datum} mhd_geschaetzt={item.mhd_geschaetzt} mhd_typ={item.mhd_typ} />
        </TouchableOpacity>
      )}
      ListFooterComponent={recent.length > 0 ? <View><Text style={styles.sectionTitle}>Zuletzt hinzugefuegt</Text>
        {recent.map(item => <View key={item.id} style={styles.itemCard}><View style={styles.itemInfo}><Text style={styles.itemName}>{item.produkt_name}</Text><Text style={styles.itemKiste}>{item.kisten_nummer ? `Kiste ${item.kisten_nummer}` : 'Keine Kiste'} | x{item.menge}</Text></View></View>)}
      </View> : null}
    />
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return <View style={statStyles.card}>{icon}<Text style={[statStyles.value, color ? { color } : null]}>{value}</Text><Text style={statStyles.label}>{label}</Text></View>
}

const statStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  value: { color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: '700', marginTop: 4 },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 2 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.primaryLight, fontSize: theme.fontSize.lg, fontWeight: '600', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  itemInfo: { flex: 1, marginRight: theme.spacing.sm },
  itemName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  itemKiste: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
})

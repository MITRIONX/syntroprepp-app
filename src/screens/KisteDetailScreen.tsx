import React, { useCallback, useRef, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, Animated, Modal } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { Package, Plus, Trash2, Edit, UtensilsCrossed, Printer } from 'lucide-react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { theme } from '../lib/theme'
import { dbGetAll, dbGetFirst, dbRun } from '../lib/db'
import { uuidv4 } from '../lib/uuid'
import { Kiste, Ware } from '../types'
import MhdBadge from '../components/MhdBadge'
import EmptyState from '../components/EmptyState'
import { printKistenLabel } from '../lib/label-printer'

export default function KisteDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { id } = route.params
  const [kiste, setKiste] = useState<Kiste | null>(null)
  const [waren, setWaren] = useState<Ware[]>([])
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map())
  const [verzehrItem, setVerzehrItem] = useState<Ware | null>(null)
  const [verzehrMenge, setVerzehrMenge] = useState('1')

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

  async function druckeEtikett() {
    if (!kiste) return
    const lagerort = await dbGetFirst<{ name: string }>('SELECT name FROM lagerorte WHERE id = ?', [kiste.lagerort_id])
    const now = new Date()
    const datum = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`
    try {
      await printKistenLabel({
        kistenNummer: kiste.nummer,
        kistenName: kiste.name,
        lagerort: lagerort?.name || null,
        artikel: waren.map(w => ({ name: w.produkt_name || 'Unbekannt', menge: w.menge })),
        datum,
      })
    } catch (err) {
      Alert.alert('Druckfehler', String(err))
    }
  }

  async function deleteWare(item: Ware) {
    swipeableRefs.current.get(item.id)?.close()
    Alert.alert('Artikel entfernen', `"${item.produkt_name}" aus Kiste entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: async () => {
        await dbRun('UPDATE waren SET deleted = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), item.id])
        loadData()
      }},
    ])
  }

  function verzehren(item: Ware) {
    swipeableRefs.current.get(item.id)?.close()
    setVerzehrMenge(String(item.menge))
    setVerzehrItem(item)
  }

  async function doVerzehr(item: Ware, anzahl: number) {
    if (anzahl <= 0 || isNaN(anzahl)) return
    const now = new Date().toISOString()
    const verzehrMenge = Math.min(anzahl, item.menge)
    await dbRun(
      'INSERT INTO verzehr_historie (id, produkt_id, produkt_name, menge, verzehrt_am, kiste_nummer) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), item.produkt_id, item.produkt_name || 'Unbekannt', verzehrMenge, now, kiste?.nummer || '']
    )
    if (verzehrMenge >= item.menge) {
      await dbRun('UPDATE waren SET deleted = 1, updated_at = ? WHERE id = ?', [now, item.id])
    } else {
      await dbRun('UPDATE waren SET menge = ?, updated_at = ? WHERE id = ?', [item.menge - verzehrMenge, now, item.id])
    }
    loadData()
  }

  function renderLeftActions(_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' })
    return (
      <Animated.View style={[swipeStyles.leftAction, { transform: [{ scale }] }]}>
        <UtensilsCrossed size={22} color="#fff" />
        <Text style={swipeStyles.actionText}>Verzehrt</Text>
      </Animated.View>
    )
  }

  function renderRightActions(_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' })
    return (
      <Animated.View style={[swipeStyles.rightAction, { transform: [{ scale }] }]}>
        <Trash2 size={22} color="#fff" />
        <Text style={swipeStyles.actionText}>Loeschen</Text>
      </Animated.View>
    )
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
          <TouchableOpacity onPress={druckeEtikett}><Printer size={22} color={theme.colors.primaryLight} /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('KisteForm', { id: kiste.id })}><Edit size={22} color={theme.colors.primaryLight} /></TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete}><Trash2 size={22} color={theme.colors.danger} /></TouchableOpacity>
        </View>
      </View>
      <FlatList data={waren} keyExtractor={item => item.id}
        contentContainerStyle={waren.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon={<Package size={48} color={theme.colors.textMuted} />} title="Kiste ist leer" subtitle="Scanne einen EAN oder lege manuell einen Artikel an" />}
        renderItem={({ item }) => (
          <Swipeable
            ref={ref => { if (ref) swipeableRefs.current.set(item.id, ref) }}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            onSwipeableOpen={(direction) => {
              if (direction === 'left') verzehren(item)
              else if (direction === 'right') deleteWare(item)
            }}
            overshootLeft={false}
            overshootRight={false}
          >
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProduktDetail', { id: item.produkt_id })}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.produktName}>{item.produkt_name || 'Unbekannt'}</Text>
                  <Text style={styles.menge}>Menge: {item.menge}</Text>
                </View>
                <MhdBadge mhd_datum={item.mhd_datum} mhd_geschaetzt={item.mhd_geschaetzt} mhd_typ={item.mhd_typ} />
              </View>
            </TouchableOpacity>
          </Swipeable>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('WareForm', { kiste_id: id })}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={verzehrItem !== null} transparent animationType="fade" onRequestClose={() => setVerzehrItem(null)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Text style={modalStyles.title}>Verzehren</Text>
            <Text style={modalStyles.subtitle}>"{verzehrItem?.produkt_name}"</Text>
            <Text style={modalStyles.label}>Wie viele verzehrt? (Vorhanden: {verzehrItem?.menge})</Text>
            <View style={modalStyles.mengeRow}>
              <TouchableOpacity style={modalStyles.mengeBtn} onPress={() => setVerzehrMenge(String(Math.max(1, parseInt(verzehrMenge || '1') - 1)))}>
                <Text style={modalStyles.mengeBtnText}>-</Text>
              </TouchableOpacity>
              <TextInput style={modalStyles.mengeInput} value={verzehrMenge} onChangeText={setVerzehrMenge} keyboardType="numeric" />
              <TouchableOpacity style={modalStyles.mengeBtn} onPress={() => setVerzehrMenge(String(Math.min(verzehrItem?.menge || 99, parseInt(verzehrMenge || '0') + 1)))}>
                <Text style={modalStyles.mengeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={modalStyles.actions}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setVerzehrItem(null)}>
                <Text style={modalStyles.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirmBtn} onPress={() => { if (verzehrItem) { doVerzehr(verzehrItem, parseInt(verzehrMenge || '0')); setVerzehrItem(null) } }}>
                <UtensilsCrossed size={18} color="#fff" />
                <Text style={modalStyles.confirmText}>Verzehren</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const swipeStyles = StyleSheet.create({
  leftAction: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'column',
    gap: 4,
  },
  rightAction: {
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'column',
    gap: 4,
  },
  actionText: { color: '#fff', fontSize: theme.fontSize.xs, fontWeight: '600' },
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, width: '100%', maxWidth: 340 },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: theme.colors.primaryLight, fontSize: theme.fontSize.md, textAlign: 'center', marginTop: 4 },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.md },
  mengeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: theme.spacing.md },
  mengeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  mengeBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  mengeInput: { backgroundColor: theme.colors.background, color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', textAlign: 'center', width: 70, height: 44, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  actions: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.lg },
  cancelBtn: { flex: 1, padding: 12, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.background, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  confirmBtn: { flex: 1, flexDirection: 'row', gap: 6, padding: 12, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
})

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

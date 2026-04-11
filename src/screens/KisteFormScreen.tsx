import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { uuidv4 } from '../lib/uuid'
import { theme } from '../lib/theme'
import { dbGetAll, dbGetFirst, dbRun } from '../lib/db'
import { Kiste, Lagerort } from '../types'

export default function KisteFormScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const editId = route.params?.id as string | undefined
  const [nummer, setNummer] = useState('')
  const [name, setName] = useState('')
  const [lagerortId, setLagerortId] = useState<string | null>(null)
  const [lagerorte, setLagerorte] = useState<Lagerort[]>([])

  useEffect(() => {
    loadLagerorte()
    if (editId) loadKiste()
  }, [editId])

  async function loadLagerorte() {
    setLagerorte(await dbGetAll<Lagerort>('SELECT * FROM lagerorte WHERE deleted = 0 ORDER BY name'))
  }

  async function loadKiste() {
    const k = await dbGetFirst<Kiste>('SELECT * FROM kisten WHERE id = ?', [editId!])
    if (k) { setNummer(k.nummer); setName(k.name || ''); setLagerortId(k.lagerort_id); navigation.setOptions({ title: `Kiste ${k.nummer} bearbeiten` }) }
  }

  async function save() {
    if (!nummer.trim()) return
    const now = new Date().toISOString()
    if (editId) {
      await dbRun('UPDATE kisten SET nummer = ?, name = ?, lagerort_id = ?, updated_at = ? WHERE id = ?', [nummer.trim(), name.trim() || null, lagerortId, now, editId])
    } else {
      await dbRun('INSERT INTO kisten (id, nummer, name, lagerort_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [uuidv4(), nummer.trim(), name.trim() || null, lagerortId, now, now])
    }
    navigation.goBack()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Kistennummer *</Text>
      <TextInput style={styles.input} value={nummer} onChangeText={setNummer} placeholder="z.B. K-001" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>Bezeichnung</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="z.B. Konserven Kiste 1" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>Lagerort</Text>
      <View style={styles.chipList}>
        <TouchableOpacity style={[styles.chip, !lagerortId && styles.chipActive]} onPress={() => setLagerortId(null)}>
          <Text style={[styles.chipText, !lagerortId && styles.chipTextActive]}>Keiner</Text>
        </TouchableOpacity>
        {lagerorte.map(l => (
          <TouchableOpacity key={l.id} style={[styles.chip, lagerortId === l.id && styles.chipActive]} onPress={() => setLagerortId(l.id)}>
            <Text style={[styles.chipText, lagerortId === l.id && styles.chipTextActive]}>{l.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>{editId ? 'Speichern' : 'Kiste anlegen'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginBottom: 6, marginTop: theme.spacing.md },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.border },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.xl },
  saveBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
})

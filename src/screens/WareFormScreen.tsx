import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { v4 as uuidv4 } from 'uuid'
import { theme } from '../lib/theme'
import { dbGetAll, dbRun } from '../lib/db'
import { Produkt } from '../types'

export default function WareFormScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { kiste_id, produkt_id: preselectedProduktId } = route.params || {}
  const [produktId, setProduktId] = useState<string>(preselectedProduktId || '')
  const [produkte, setProdukte] = useState<Produkt[]>([])
  const [menge, setMenge] = useState('1')
  const [mhdTyp, setMhdTyp] = useState<'exakt' | 'geschaetzt'>('exakt')
  const [mhdDatum, setMhdDatum] = useState('')
  const [mhdGeschaetzt, setMhdGeschaetzt] = useState('')
  const [notizen, setNotizen] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [produktName, setProduktName] = useState('')

  useEffect(() => { loadProdukte() }, [])

  async function loadProdukte() {
    setProdukte(await dbGetAll<Produkt>('SELECT * FROM produkte WHERE deleted = 0 ORDER BY name'))
  }

  async function save() {
    let finalProduktId = produktId
    if (manualMode && produktName.trim()) {
      finalProduktId = uuidv4()
      const now = new Date().toISOString()
      await dbRun('INSERT INTO produkte (id, name, quelle, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [finalProduktId, produktName.trim(), 'manuell', now, now])
    }
    if (!finalProduktId) return
    const now = new Date().toISOString()
    await dbRun(
      `INSERT INTO waren (id, produkt_id, kiste_id, menge, mhd_datum, mhd_geschaetzt, mhd_typ, einlagerungsdatum, notizen, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), finalProduktId, kiste_id, parseInt(menge) || 1,
       mhdTyp === 'exakt' && mhdDatum ? mhdDatum : null,
       mhdTyp === 'geschaetzt' && mhdGeschaetzt ? mhdGeschaetzt : null,
       mhdTyp, now.split('T')[0], notizen.trim() || null, now, now]
    )
    navigation.goBack()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.modeSwitch}>
        <TouchableOpacity style={[styles.modeBtn, !manualMode && styles.modeBtnActive]} onPress={() => setManualMode(false)}>
          <Text style={[styles.modeBtnText, !manualMode && styles.modeBtnTextActive]}>Vorhandenes Produkt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, manualMode && styles.modeBtnActive]} onPress={() => setManualMode(true)}>
          <Text style={[styles.modeBtnText, manualMode && styles.modeBtnTextActive]}>Neues Produkt</Text>
        </TouchableOpacity>
      </View>
      {manualMode ? (
        <><Text style={styles.label}>Produktname *</Text>
        <TextInput style={styles.input} value={produktName} onChangeText={setProduktName} placeholder="z.B. Dosenbrot" placeholderTextColor={theme.colors.textMuted} /></>
      ) : (
        <><Text style={styles.label}>Produkt waehlen *</Text>
        <View style={styles.chipList}>{produkte.map(p => (
          <TouchableOpacity key={p.id} style={[styles.chip, produktId === p.id && styles.chipActive]} onPress={() => setProduktId(p.id)}>
            <Text style={[styles.chipText, produktId === p.id && styles.chipTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}</View></>
      )}
      <Text style={styles.label}>Menge</Text>
      <TextInput style={styles.input} value={menge} onChangeText={setMenge} keyboardType="numeric" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>MHD-Typ</Text>
      <View style={styles.modeSwitch}>
        <TouchableOpacity style={[styles.modeBtn, mhdTyp === 'exakt' && styles.modeBtnActive]} onPress={() => setMhdTyp('exakt')}>
          <Text style={[styles.modeBtnText, mhdTyp === 'exakt' && styles.modeBtnTextActive]}>Exaktes Datum</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mhdTyp === 'geschaetzt' && styles.modeBtnActive]} onPress={() => setMhdTyp('geschaetzt')}>
          <Text style={[styles.modeBtnText, mhdTyp === 'geschaetzt' && styles.modeBtnTextActive]}>Geschaetzt</Text>
        </TouchableOpacity>
      </View>
      {mhdTyp === 'exakt' ? (
        <><Text style={styles.label}>MHD Datum (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={mhdDatum} onChangeText={setMhdDatum} placeholder="2027-06-15" placeholderTextColor={theme.colors.textMuted} /></>
      ) : (
        <><Text style={styles.label}>Geschaetzte Haltbarkeit</Text>
        <TextInput style={styles.input} value={mhdGeschaetzt} onChangeText={setMhdGeschaetzt} placeholder="z.B. 5 Jahre" placeholderTextColor={theme.colors.textMuted} /></>
      )}
      <Text style={styles.label}>Notizen</Text>
      <TextInput style={[styles.input, styles.textArea]} value={notizen} onChangeText={setNotizen} placeholder="Optionale Notizen..." placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={3} />
      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>Artikel hinzufuegen</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginBottom: 6, marginTop: theme.spacing.md },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modeSwitch: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.sm },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  modeBtnText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.xl },
  saveBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
})

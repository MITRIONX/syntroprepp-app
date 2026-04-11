import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { MapPin, Plus, Trash2 } from 'lucide-react-native'
import { v4 as uuidv4 } from 'uuid'
import { theme } from '../lib/theme'
import { dbGetAll, dbRun } from '../lib/db'
import { Lagerort } from '../types'

export default function LagerorteScreen() {
  const [lagerorte, setLagerorte] = useState<Lagerort[]>([])
  const [newName, setNewName] = useState('')
  useFocusEffect(useCallback(() => { load() }, []))
  async function load() { setLagerorte(await dbGetAll('SELECT * FROM lagerorte WHERE deleted = 0 ORDER BY name')) }
  async function add() {
    if (!newName.trim()) return
    const now = new Date().toISOString()
    await dbRun('INSERT INTO lagerorte (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [uuidv4(), newName.trim(), now, now])
    setNewName(''); load()
  }
  function confirmDelete(item: Lagerort) {
    Alert.alert('Loeschen', `"${item.name}" wirklich loeschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loeschen', style: 'destructive', onPress: async () => { await dbRun('UPDATE lagerorte SET deleted = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), item.id]); load() }},
    ])
  }
  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Neuer Lagerort..." placeholderTextColor={theme.colors.textMuted} onSubmitEditing={add} />
        <TouchableOpacity style={styles.addBtn} onPress={add}><Plus size={22} color="#fff" /></TouchableOpacity>
      </View>
      <FlatList data={lagerorte} keyExtractor={item => item.id} renderItem={({ item }) => (
        <View style={styles.row}><MapPin size={18} color={theme.colors.primaryLight} /><Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity onPress={() => confirmDelete(item)}><Trash2 size={18} color={theme.colors.danger} /></TouchableOpacity></View>
      )} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  input: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.md, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  name: { flex: 1, color: theme.colors.text, fontSize: theme.fontSize.md },
})

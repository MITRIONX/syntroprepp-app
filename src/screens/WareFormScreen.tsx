import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { Camera, ImagePlus } from 'lucide-react-native'
import { Box } from 'lucide-react-native'
import { uuidv4 } from '../lib/uuid'
import { theme } from '../lib/theme'
import { dbGetAll, dbRun } from '../lib/db'
import { Produkt, Kiste } from '../types'

export default function WareFormScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { kiste_id: initialKisteId, produkt_id: preselectedProduktId } = route.params || {}
  const [kisteId, setKisteId] = useState<string>(initialKisteId || '')
  const [kisten, setKisten] = useState<Kiste[]>([])
  const [produktId, setProduktId] = useState<string>(preselectedProduktId || '')
  const [produkte, setProdukte] = useState<Produkt[]>([])
  const [menge, setMenge] = useState('1')
  const [mhdTyp, setMhdTyp] = useState<'exakt' | 'geschaetzt'>('exakt')
  const [mhdDatum, setMhdDatum] = useState('')
  const [mhdGeschaetzt, setMhdGeschaetzt] = useState('')
  const [notizen, setNotizen] = useState('')
  const [manualMode, setManualMode] = useState(!preselectedProduktId)
  const [produktName, setProduktName] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)

  useEffect(() => { loadProdukte(); loadKisten() }, [])

  async function loadProdukte() {
    setProdukte(await dbGetAll<Produkt>('SELECT * FROM produkte WHERE deleted = 0 ORDER BY name'))
  }

  async function loadKisten() {
    setKisten(await dbGetAll<Kiste>(`
      SELECT k.*, l.name as lagerort_name FROM kisten k
      LEFT JOIN lagerorte l ON k.lagerort_id = l.id
      WHERE k.deleted = 0 ORDER BY k.nummer
    `))
  }

  async function pickImage(useCamera: boolean) {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    }

    let result: ImagePicker.ImagePickerResult
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) { Alert.alert('Kamerazugriff benoetigt'); return }
      result = await ImagePicker.launchCameraAsync(options)
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) { Alert.alert('Galerie-Zugriff benoetigt'); return }
      result = await ImagePicker.launchImageLibraryAsync(options)
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      // Copy to app's persistent directory
      const fileName = `product_${uuidv4()}.jpg`
      const destDir = `${FileSystem.documentDirectory}images/`
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true })
      const destPath = `${destDir}${fileName}`
      await FileSystem.copyAsync({ from: asset.uri, to: destPath })
      setImageUri(destPath)
    }
  }

  function showImagePicker() {
    Alert.alert('Foto hinzufuegen', 'Woher soll das Bild kommen?', [
      { text: 'Kamera', onPress: () => pickImage(true) },
      { text: 'Galerie', onPress: () => pickImage(false) },
      { text: 'Abbrechen', style: 'cancel' },
    ])
  }

  async function save() {
    let finalProduktId = produktId
    if (manualMode && produktName.trim()) {
      finalProduktId = uuidv4()
      const now = new Date().toISOString()
      await dbRun(
        'INSERT INTO produkte (id, name, bild_url, quelle, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [finalProduktId, produktName.trim(), imageUri, 'manuell', now, now]
      )
    }
    if (!finalProduktId || !kisteId) { Alert.alert('Fehler', 'Bitte Kiste waehlen'); return }
    const now = new Date().toISOString()
    await dbRun(
      `INSERT INTO waren (id, produkt_id, kiste_id, menge, mhd_datum, mhd_geschaetzt, mhd_typ, einlagerungsdatum, notizen, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), finalProduktId, kisteId, parseInt(menge) || 1,
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
        <>
          <Text style={styles.label}>Produktname *</Text>
          <TextInput style={styles.input} value={produktName} onChangeText={setProduktName} placeholder="z.B. Dosenbrot" placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.label}>Foto</Text>
          {imageUri ? (
            <TouchableOpacity onPress={showImagePicker}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <Text style={styles.imageHint}>Tippen zum Aendern</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(true)}>
                <Camera size={24} color={theme.colors.primaryLight} />
                <Text style={styles.imageBtnText}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(false)}>
                <ImagePlus size={24} color={theme.colors.primaryLight} />
                <Text style={styles.imageBtnText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.label}>Produkt waehlen *</Text>
          <View style={styles.chipList}>{produkte.map(p => (
            <TouchableOpacity key={p.id} style={[styles.chip, produktId === p.id && styles.chipActive]} onPress={() => setProduktId(p.id)}>
              <Text style={[styles.chipText, produktId === p.id && styles.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}</View>
        </>
      )}

      <Text style={styles.label}>In Kiste packen *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kistenList}>
        {kisten.map(k => (
          <TouchableOpacity key={k.id} style={[styles.kisteChip, kisteId === k.id && styles.chipActive]} onPress={() => setKisteId(k.id)}>
            <Box size={14} color={kisteId === k.id ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.chipText, kisteId === k.id && styles.chipTextActive]}>{k.nummer}</Text>
            {(k as any).lagerort_name && <Text style={[styles.kisteOrt, kisteId === k.id && { color: 'rgba(255,255,255,0.7)' }]}>{(k as any).lagerort_name}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

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
        <>
          <Text style={styles.label}>MHD Datum (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={mhdDatum} onChangeText={setMhdDatum} placeholder="2027-06-15" placeholderTextColor={theme.colors.textMuted} />
        </>
      ) : (
        <>
          <Text style={styles.label}>Geschaetzte Haltbarkeit</Text>
          <TextInput style={styles.input} value={mhdGeschaetzt} onChangeText={setMhdGeschaetzt} placeholder="z.B. 5 Jahre" placeholderTextColor={theme.colors.textMuted} />
        </>
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
  imageButtons: { flexDirection: 'row', gap: 12 },
  imageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  imageBtnText: { color: theme.colors.primaryLight, fontSize: theme.fontSize.md, fontWeight: '600' },
  kistenList: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  kisteChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  kisteOrt: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginLeft: 2 },
  imagePreview: { width: '100%', height: 200, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface },
  imageHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, textAlign: 'center', marginTop: 4 },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.xl },
  saveBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
})

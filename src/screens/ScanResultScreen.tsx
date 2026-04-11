import React, { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { uuidv4 } from '../lib/uuid'
import { theme } from '../lib/theme'
import { api, isServerReachable } from '../lib/api'
import { dbRun, dbGetFirst, dbGetAll } from '../lib/db'
import { Kiste } from '../types'

interface LookupResult { name: string; bild_url: string | null; gewicht: string | null; naehrwerte: Record<string, unknown> | null; beschreibung: string | null; kategorie_vorschlag: string | null; beipackzettel_url: string | null }

export default function ScanResultScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { ean } = route.params
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [importName, setImportName] = useState(true)
  const [importBild, setImportBild] = useState(true)
  const [importGewicht, setImportGewicht] = useState(true)
  const [importNaehrwerte, setImportNaehrwerte] = useState(true)
  const [importBeschreibung, setImportBeschreibung] = useState(true)
  const [importBeipackzettel, setImportBeipackzettel] = useState(true)

  useEffect(() => { lookup() }, [ean])

  async function lookup() {
    const existing = await dbGetFirst<{ id: string; name: string }>('SELECT id, name FROM produkte WHERE ean = ? AND deleted = 0', [ean])
    if (existing) {
      askAddToBox(existing.id, existing.name)
      return
    }
    const online = await isServerReachable()
    if (!online) { setNotFound(true); setLoading(false); return }
    try {
      const response = await api.ean.lookup(ean)
      if (response.found && response.product) { setResult(response.product as LookupResult) } else { setNotFound(true) }
    } catch { setNotFound(true) }
    setLoading(false)
  }

  function askAddToBox(produktId: string, produktName: string) {
    Alert.alert(
      'Produkt bekannt',
      `"${produktName}" ist bereits gespeichert.\nIn eine Kiste packen?`,
      [
        { text: 'Nur anzeigen', style: 'cancel', onPress: () => navigation.replace('ProduktDetail', { id: produktId }) },
        { text: 'In Kiste packen', onPress: () => navigation.replace('WareForm', { produkt_id: produktId }) },
      ]
    )
  }

  async function saveProduct() {
    if (!result) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await dbRun(
      `INSERT INTO produkte (id, ean, name, bild_url, gewicht, naehrwerte, beschreibung, beipackzettel_url, quelle, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ean, importName ? result.name : 'Unbenannt', importBild ? result.bild_url : null, importGewicht ? result.gewicht : null,
       importNaehrwerte && result.naehrwerte ? JSON.stringify(result.naehrwerte) : null, importBeschreibung ? result.beschreibung : null,
       importBeipackzettel ? result.beipackzettel_url : null, 'gescannt', now, now]
    )
    // Ask if user wants to add to a box
    Alert.alert(
      'Produkt gespeichert',
      `"${importName ? result.name : 'Unbenannt'}" wurde angelegt.\nIn eine Kiste packen?`,
      [
        { text: 'Spaeter', onPress: () => navigation.navigate('Tabs') },
        { text: 'In Kiste packen', onPress: () => navigation.replace('WareForm', { produkt_id: id }) },
      ]
    )
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primaryLight} /><Text style={styles.loadingText}>Suche nach EAN {ean}...</Text></View>
  if (notFound) return <View style={styles.center}><Text style={styles.notFoundTitle}>Produkt nicht gefunden</Text><Text style={styles.notFoundSub}>EAN: {ean}</Text><TouchableOpacity style={styles.btn} onPress={() => navigation.replace('WareForm', {})}><Text style={styles.btnText}>Manuell anlegen</Text></TouchableOpacity></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.ean}>EAN: {ean}</Text>
      {result!.bild_url && <Image source={{ uri: result!.bild_url }} style={styles.image} resizeMode="contain" />}
      <Text style={styles.sectionTitle}>Gefundene Daten - was uebernehmen?</Text>
      <CheckRow label="Name" value={result!.name} checked={importName} onToggle={setImportName} />
      {result!.bild_url && <CheckRow label="Bild" value="Vorhanden" checked={importBild} onToggle={setImportBild} />}
      {result!.gewicht && <CheckRow label="Gewicht/Menge" value={result!.gewicht} checked={importGewicht} onToggle={setImportGewicht} />}
      {result!.naehrwerte && <CheckRow label="Naehrwerte" value="Vorhanden" checked={importNaehrwerte} onToggle={setImportNaehrwerte} />}
      {result!.beschreibung && <CheckRow label="Beschreibung" value={result!.beschreibung} checked={importBeschreibung} onToggle={setImportBeschreibung} />}
      {result!.beipackzettel_url && <CheckRow label="Beipackzettel" value="PDF vorhanden" checked={importBeipackzettel} onToggle={setImportBeipackzettel} />}
      <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}><Text style={styles.saveBtnText}>Produkt uebernehmen</Text></TouchableOpacity>
    </ScrollView>
  )
}

function CheckRow({ label, value, checked, onToggle }: { label: string; value: string; checked: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={checkStyles.row}>
      <Switch value={checked} onValueChange={onToggle} trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary }} thumbColor={checked ? theme.colors.primaryLight : theme.colors.textMuted} />
      <View style={checkStyles.info}><Text style={checkStyles.label}>{label}</Text><Text style={checkStyles.value} numberOfLines={2}>{value}</Text></View>
    </View>
  )
}

const checkStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  info: { flex: 1 },
  label: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  value: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 2 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  center: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  ean: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.md },
  image: { width: '100%', height: 200, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, marginBottom: theme.spacing.md },
  sectionTitle: { color: theme.colors.primaryLight, fontSize: theme.fontSize.lg, fontWeight: '600', marginBottom: theme.spacing.sm },
  loadingText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontSize: theme.fontSize.md },
  notFoundTitle: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  notFoundSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  btn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  btnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.xl },
  saveBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
})

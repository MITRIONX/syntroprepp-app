import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Switch } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useNavigation } from '@react-navigation/native'
import { Scan, Keyboard, Box, MapPin, Check, ChevronRight, ChevronLeft, Package, UtensilsCrossed } from 'lucide-react-native'
import { uuidv4 } from '../lib/uuid'
import { theme } from '../lib/theme'
import { api, isServerReachable } from '../lib/api'
import { dbRun, dbGetFirst, dbGetAll } from '../lib/db'
import { Kiste } from '../types'

interface LookupResult {
  name: string
  bild_url: string | null
  gewicht: string | null
  naehrwerte: Record<string, unknown> | null
  beschreibung: string | null
  beipackzettel_url: string | null
}

type Step = 'scan' | 'produkt' | 'kiste' | 'menge' | 'done'

export default function BuchenScreen() {
  const navigation = useNavigation<any>()
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState<Step>('scan')

  // Step 1: Scan
  const [scanned, setScanned] = useState(false)
  const [manualEan, setManualEan] = useState('')
  const [showManual, setShowManual] = useState(false)

  // Step 2: Produkt
  const [ean, setEan] = useState('')
  const [loading, setLoading] = useState(false)
  const [produktId, setProduktId] = useState<string | null>(null)
  const [produktName, setProduktName] = useState('')
  const [produktBild, setProduktBild] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [importFields, setImportFields] = useState<Record<string, boolean>>({})

  // Step 3: Kiste
  const [kisten, setKisten] = useState<(Kiste & { lagerort_name?: string })[]>([])
  const [selectedKisteId, setSelectedKisteId] = useState<string | null>(null)

  // Step 4: Menge
  const [menge, setMenge] = useState('1')
  const [mhdTyp, setMhdTyp] = useState<'exakt' | 'geschaetzt' | 'keine'>('keine')
  const [mhdDatum, setMhdDatum] = useState('')
  const [mhdGeschaetzt, setMhdGeschaetzt] = useState('')

  useEffect(() => {
    loadKisten()
  }, [])

  async function loadKisten() {
    setKisten(await dbGetAll<Kiste & { lagerort_name?: string }>(`
      SELECT k.*, l.name as lagerort_name FROM kisten k
      LEFT JOIN lagerorte l ON k.lagerort_id = l.id
      WHERE k.deleted = 0 ORDER BY k.nummer
    `))
  }

  // Step 1: Handle scan
  function handleBarCodeScanned(result: { data: string }) {
    if (scanned) return
    setScanned(true)
    processEan(result.data)
  }

  function submitManualEan() {
    if (manualEan.trim()) processEan(manualEan.trim())
  }

  async function processEan(code: string) {
    setEan(code)
    setLoading(true)
    setStep('produkt')

    // Check local DB
    const existing = await dbGetFirst<{ id: string; name: string; bild_url: string | null }>(
      'SELECT id, name, bild_url FROM produkte WHERE ean = ? AND deleted = 0', [code]
    )
    if (existing) {
      setProduktId(existing.id)
      setProduktName(existing.name)
      setProduktBild(existing.bild_url)
      setIsNew(false)
      setLoading(false)
      return
    }

    // Online lookup
    setIsNew(true)
    const online = await isServerReachable()
    if (online) {
      try {
        const response = await api.ean.lookup(code)
        if (response.found && response.product) {
          const r = response.product as LookupResult
          setLookupResult(r)
          setProduktName(r.name || '')
          setProduktBild(r.bild_url)
          setImportFields({ name: true, bild: !!r.bild_url, gewicht: !!r.gewicht, naehrwerte: !!r.naehrwerte, beschreibung: !!r.beschreibung, beipackzettel: !!r.beipackzettel_url })
          setLoading(false)
          return
        }
      } catch {}
    }

    // Not found
    setProduktName('')
    setLookupResult(null)
    setLoading(false)
  }

  // Step 2 -> 3: Save product if new
  async function confirmProdukt() {
    if (isNew) {
      if (!produktName.trim()) { Alert.alert('Name fehlt', 'Bitte Produktname eingeben'); return }
      const id = uuidv4()
      const now = new Date().toISOString()
      const r = lookupResult
      await dbRun(
        `INSERT OR REPLACE INTO produkte (id, ean, name, bild_url, gewicht, naehrwerte, beschreibung, beipackzettel_url, quelle, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, ean, produktName.trim(),
         r && importFields.bild ? r.bild_url : null,
         r && importFields.gewicht ? r.gewicht : null,
         r && importFields.naehrwerte ? JSON.stringify(r.naehrwerte) : null,
         r && importFields.beschreibung ? r.beschreibung : null,
         r && importFields.beipackzettel ? r.beipackzettel_url : null,
         'gescannt', now, now]
      )
      setProduktId(id)
    }
    setStep('kiste')
  }

  // Step 4: Save
  async function buchen() {
    if (!produktId || !selectedKisteId) return
    const now = new Date().toISOString()
    await dbRun(
      `INSERT INTO waren (id, produkt_id, kiste_id, menge, mhd_datum, mhd_geschaetzt, mhd_typ, einlagerungsdatum, notizen, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), produktId, selectedKisteId, parseInt(menge) || 1,
       mhdTyp === 'exakt' && mhdDatum ? mhdDatum : null,
       mhdTyp === 'geschaetzt' && mhdGeschaetzt ? mhdGeschaetzt : null,
       mhdTyp === 'keine' ? 'geschaetzt' : mhdTyp,
       now.split('T')[0], null, now, now]
    )
    setStep('done')
  }

  function reset() {
    setStep('scan')
    setScanned(false)
    setManualEan('')
    setEan('')
    setProduktId(null)
    setProduktName('')
    setProduktBild(null)
    setIsNew(false)
    setLookupResult(null)
    setImportFields({})
    setSelectedKisteId(null)
    setMenge('1')
    setMhdTyp('keine')
    setMhdDatum('')
    setMhdGeschaetzt('')
  }

  // Progress indicator
  const steps: Step[] = ['scan', 'produkt', 'kiste', 'menge']
  const stepIndex = steps.indexOf(step)
  const stepLabels = ['Scannen', 'Produkt', 'Kiste', 'Menge']

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      {step !== 'done' && (
        <View style={styles.progressBar}>
          {stepLabels.map((label, i) => (
            <View key={label} style={styles.progressStep}>
              <View style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]} />
              <Text style={[styles.progressLabel, i <= stepIndex && styles.progressLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Step 1: Scan */}
      {step === 'scan' && (
        <View style={styles.stepContainer}>
          {!showManual ? (
            <>
              {permission?.granted ? (
                <>
                  <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                    onBarcodeScanned={handleBarCodeScanned}
                  />
                  <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.hint}>Barcode in den Rahmen halten</Text>
                  </View>
                </>
              ) : (
                <View style={styles.center}>
                  <Text style={styles.centerText}>Kamerazugriff benoetigt</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnText}>Kamera erlauben</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.manualContainer}>
              <Scan size={48} color={theme.colors.primaryLight} />
              <Text style={styles.manualTitle}>EAN eingeben</Text>
              <TextInput style={styles.eanInput} value={manualEan} onChangeText={setManualEan}
                placeholder="EAN-Code" placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric" autoFocus onSubmitEditing={submitManualEan} />
              <TouchableOpacity style={styles.primaryBtn} onPress={submitManualEan}>
                <Text style={styles.primaryBtnText}>Suchen</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.toggleBtn} onPress={() => { setShowManual(!showManual); setScanned(false) }}>
            {showManual ? <Scan size={20} color={theme.colors.text} /> : <Keyboard size={20} color={theme.colors.text} />}
            <Text style={styles.toggleText}>{showManual ? 'Kamera nutzen' : 'Manuell eingeben'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Produkt */}
      {step === 'produkt' && (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primaryLight} />
              <Text style={styles.centerText}>Suche EAN {ean}...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.eanLabel}>EAN: {ean}</Text>

              {produktBild && <Image source={{ uri: produktBild }} style={styles.produktImage} resizeMode="contain" />}

              {isNew ? (
                <>
                  <View style={styles.badge}><Text style={styles.badgeText}>Neues Produkt</Text></View>
                  <Text style={styles.fieldLabel}>Produktname *</Text>
                  <TextInput style={styles.input} value={produktName} onChangeText={setProduktName}
                    placeholder="Produktname eingeben" placeholderTextColor={theme.colors.textMuted} />

                  {lookupResult && (
                    <>
                      <Text style={styles.fieldLabel}>Gefundene Daten uebernehmen:</Text>
                      {lookupResult.gewicht && (
                        <SwitchRow label={`Gewicht: ${lookupResult.gewicht}`} value={importFields.gewicht} onToggle={v => setImportFields({...importFields, gewicht: v})} />
                      )}
                      {lookupResult.naehrwerte && (
                        <SwitchRow label="Naehrwerte" value={importFields.naehrwerte} onToggle={v => setImportFields({...importFields, naehrwerte: v})} />
                      )}
                      {lookupResult.beschreibung && (
                        <SwitchRow label={`Beschreibung: ${lookupResult.beschreibung}`} value={importFields.beschreibung} onToggle={v => setImportFields({...importFields, beschreibung: v})} />
                      )}
                    </>
                  )}

                  {!lookupResult && <Text style={styles.notFoundText}>Online nicht gefunden. Manuell anlegen.</Text>}
                </>
              ) : (
                <>
                  <View style={[styles.badge, styles.badgeKnown]}><Text style={styles.badgeText}>Bereits bekannt</Text></View>
                  <Text style={styles.produktNameLarge}>{produktName}</Text>
                </>
              )}

              <View style={styles.navButtons}>
                <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('scan'); setScanned(false) }}>
                  <ChevronLeft size={20} color={theme.colors.text} /><Text style={styles.backBtnText}>Zurueck</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={confirmProdukt}>
                  <Text style={styles.nextBtnText}>Weiter</Text><ChevronRight size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Step 3: Kiste */}
      {step === 'kiste' && (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
          <Text style={styles.stepTitle}>In welche Kiste?</Text>
          <Text style={styles.stepSubtitle}>{produktName}</Text>

          {kisten.length === 0 ? (
            <View style={styles.center}>
              <Box size={48} color={theme.colors.textMuted} />
              <Text style={styles.centerText}>Keine Kisten vorhanden</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('KisteForm')}>
                <Text style={styles.primaryBtnText}>Kiste anlegen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            kisten.map(k => (
              <TouchableOpacity key={k.id}
                style={[styles.kisteCard, selectedKisteId === k.id && styles.kisteCardActive]}
                onPress={() => setSelectedKisteId(k.id)}>
                <Box size={22} color={selectedKisteId === k.id ? '#fff' : theme.colors.primaryLight} />
                <View style={styles.kisteInfo}>
                  <Text style={[styles.kisteNummer, selectedKisteId === k.id && { color: '#fff' }]}>{k.nummer}</Text>
                  {k.name && <Text style={[styles.kisteName, selectedKisteId === k.id && { color: 'rgba(255,255,255,0.8)' }]}>{k.name}</Text>}
                </View>
                {k.lagerort_name && (
                  <View style={styles.kisteOrt}>
                    <MapPin size={14} color={selectedKisteId === k.id ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted} />
                    <Text style={[styles.kisteOrtText, selectedKisteId === k.id && { color: 'rgba(255,255,255,0.7)' }]}>{k.lagerort_name}</Text>
                  </View>
                )}
                {selectedKisteId === k.id && <Check size={22} color="#fff" />}
              </TouchableOpacity>
            ))
          )}

          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('produkt')}>
              <ChevronLeft size={20} color={theme.colors.text} /><Text style={styles.backBtnText}>Zurueck</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nextBtn, !selectedKisteId && styles.btnDisabled]}
              onPress={() => selectedKisteId && setStep('menge')} disabled={!selectedKisteId}>
              <Text style={styles.nextBtnText}>Weiter</Text><ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Step 4: Menge + MHD */}
      {step === 'menge' && (
        <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
          <Text style={styles.stepTitle}>Menge & Haltbarkeit</Text>
          <Text style={styles.stepSubtitle}>{produktName} → Kiste {kisten.find(k => k.id === selectedKisteId)?.nummer}</Text>

          <Text style={styles.fieldLabel}>Menge</Text>
          <View style={styles.mengeRow}>
            <TouchableOpacity style={styles.mengeBtn} onPress={() => setMenge(String(Math.max(1, parseInt(menge || '1') - 1)))}>
              <Text style={styles.mengeBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput style={styles.mengeInput} value={menge} onChangeText={setMenge} keyboardType="numeric" />
            <TouchableOpacity style={styles.mengeBtn} onPress={() => setMenge(String(parseInt(menge || '0') + 1))}>
              <Text style={styles.mengeBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>MHD</Text>
          <View style={styles.mhdOptions}>
            {(['keine', 'exakt', 'geschaetzt'] as const).map(typ => (
              <TouchableOpacity key={typ} style={[styles.mhdChip, mhdTyp === typ && styles.mhdChipActive]} onPress={() => setMhdTyp(typ)}>
                <Text style={[styles.mhdChipText, mhdTyp === typ && styles.mhdChipTextActive]}>
                  {typ === 'keine' ? 'Keins' : typ === 'exakt' ? 'Exakt' : 'Geschaetzt'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mhdTyp === 'exakt' && (
            <TextInput style={styles.input} value={mhdDatum} onChangeText={setMhdDatum}
              placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textMuted} />
          )}
          {mhdTyp === 'geschaetzt' && (
            <TextInput style={styles.input} value={mhdGeschaetzt} onChangeText={setMhdGeschaetzt}
              placeholder="z.B. 5 Jahre" placeholderTextColor={theme.colors.textMuted} />
          )}

          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('kiste')}>
              <ChevronLeft size={20} color={theme.colors.text} /><Text style={styles.backBtnText}>Zurueck</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buchenBtn} onPress={buchen}>
              <Package size={20} color="#fff" /><Text style={styles.buchenBtnText}>Einbuchen</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <View style={[styles.stepContainer, styles.center]}>
          <Check size={64} color={theme.colors.success} />
          <Text style={styles.doneTitle}>Eingebucht!</Text>
          <Text style={styles.doneSubtitle}>{parseInt(menge) || 1}x {produktName}</Text>
          <Text style={styles.doneKiste}>→ Kiste {kisten.find(k => k.id === selectedKisteId)?.nummer}</Text>

          <View style={styles.doneButtons}>
            <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
              <Scan size={20} color="#fff" /><Text style={styles.primaryBtnText}>  Naechster Artikel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>Fertig</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

function SwitchRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={switchStyles.row}>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary }}
        thumbColor={value ? theme.colors.primaryLight : theme.colors.textMuted} />
      <Text style={switchStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const switchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  label: { color: theme.colors.text, fontSize: theme.fontSize.sm, flex: 1 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  progressStep: { alignItems: 'center', gap: 4 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.border },
  progressDotActive: { backgroundColor: theme.colors.primaryLight },
  progressLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  progressLabelActive: { color: theme.colors.primaryLight, fontWeight: '600' },

  stepContainer: { flex: 1 },
  stepScroll: { flex: 1 },
  stepContent: { padding: theme.spacing.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  centerText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },

  // Scan
  camera: { flex: 1, width: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 150, borderWidth: 2, borderColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md },
  hint: { color: '#fff', fontSize: theme.fontSize.md, marginTop: theme.spacing.md, textShadowColor: '#000', textShadowRadius: 4 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: theme.spacing.md, backgroundColor: theme.colors.surface, justifyContent: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border },
  toggleText: { color: theme.colors.text, fontSize: theme.fontSize.md },
  manualContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl, gap: 16 },
  manualTitle: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  eanInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: theme.fontSize.xl, textAlign: 'center', letterSpacing: 2, width: '100%', padding: theme.spacing.md, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },

  // Produkt
  eanLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center' },
  produktImage: { width: '100%', height: 160, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, marginVertical: theme.spacing.md },
  badge: { alignSelf: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 4, borderRadius: theme.borderRadius.lg, marginVertical: theme.spacing.sm },
  badgeKnown: { backgroundColor: theme.colors.success },
  badgeText: { color: '#fff', fontSize: theme.fontSize.sm, fontWeight: '600' },
  produktNameLarge: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', textAlign: 'center', marginTop: theme.spacing.md },
  notFoundText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.md },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: theme.spacing.md, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.border },

  // Kiste
  stepTitle: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', textAlign: 'center' },
  stepSubtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: 'center', marginBottom: theme.spacing.lg },
  kisteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 2, borderColor: theme.colors.border },
  kisteCardActive: { borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.primary },
  kisteInfo: { flex: 1 },
  kisteNummer: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  kisteName: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  kisteOrt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kisteOrtText: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },

  // Menge
  mengeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: theme.spacing.md },
  mengeBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  mengeBtnText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  mengeInput: { backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: '700', textAlign: 'center', width: 80, height: 50, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  mhdOptions: { flexDirection: 'row', gap: 8 },
  mhdChip: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  mhdChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  mhdChipText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  mhdChipTextActive: { color: '#fff', fontWeight: '600' },

  // Navigation
  navButtons: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.xl },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 14, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  backBtnText: { color: theme.colors.text, fontSize: theme.fontSize.md },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 14, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primary },
  nextBtnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
  buchenBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.success },
  buchenBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  primaryBtnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
  secondaryBtn: { marginTop: theme.spacing.md, padding: theme.spacing.md },
  secondaryBtnText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },

  // Done
  doneTitle: { color: theme.colors.success, fontSize: theme.fontSize.xxl, fontWeight: '700', marginTop: theme.spacing.md },
  doneSubtitle: { color: theme.colors.text, fontSize: theme.fontSize.lg, marginTop: theme.spacing.sm },
  doneKiste: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginTop: 4 },
  doneButtons: { marginTop: theme.spacing.xl, alignItems: 'center', gap: 8 },
})

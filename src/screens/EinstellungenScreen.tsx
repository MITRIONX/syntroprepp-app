import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { MapPin, Tag, RefreshCw, Download, Server, Printer, Search, X, Check } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { getServerUrl, setServerUrl } from '../lib/api'
import { syncNow, getSyncStatus, onSyncStatusChange } from '../lib/sync'
import { checkForUpdate } from '../lib/updater'
import { discoverPrinters, loadAssignments, saveAssignment, removeAssignment, printTestLabel, NetworkPrinter, PrinterAssignment } from '../lib/label-printer'
import SyncIndicator from '../components/SyncIndicator'
import { SyncStatus } from '../types'

const PRINTER_CONTEXTS = [
  { key: 'kisten-etikett', label: 'Kisten-Etikett' },
]

export default function EinstellungenScreen() {
  const navigation = useNavigation<any>()
  const [url, setUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncStatusState, setSyncStatusState] = useState<SyncStatus>(getSyncStatus())

  // Printer state
  const [scanning, setScanning] = useState(false)
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [assignments, setAssignments] = useState<PrinterAssignment[]>([])
  const [selectContext, setSelectContext] = useState<string | null>(null)

  useEffect(() => {
    getServerUrl().then(setUrl)
    loadAssignments().then(setAssignments)
    return onSyncStatusChange(setSyncStatusState)
  }, [])

  async function saveUrl() { await setServerUrl(url.trim()); Alert.alert('Gespeichert', `Server-URL: ${url.trim()}`) }
  async function triggerSync() {
    setSyncing(true)
    await syncNow()
    setSyncStatusState(getSyncStatus())
    setSyncing(false)
    if (getSyncStatus() === 'offline') {
      const currentUrl = await getServerUrl()
      Alert.alert('Sync fehlgeschlagen', `Server nicht erreichbar:\n${currentUrl}`)
    }
  }

  async function scanPrinters() {
    setScanning(true)
    const found = await discoverPrinters(5000)
    setPrinters(found)
    setScanning(false)
    if (found.length === 0) {
      Alert.alert('Keine Drucker gefunden', 'Stelle sicher dass der Brother QL-1110 im gleichen WLAN ist und eingeschaltet.')
    }
  }

  async function assignPrinter(context: string, printer: NetworkPrinter) {
    await saveAssignment(context, printer)
    setAssignments(await loadAssignments())
    setSelectContext(null)
  }

  async function unassignPrinter(context: string) {
    await removeAssignment(context)
    setAssignments(await loadAssignments())
  }

  function getAssignedPrinter(context: string): NetworkPrinter | undefined {
    return assignments.find(a => a.context === context)?.printer
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md }}>
      <Text style={styles.sectionTitle}>Server</Text>
      <View style={styles.urlRow}>
        <Server size={18} color={theme.colors.primaryLight} />
        <TextInput style={styles.urlInput} value={url} onChangeText={setUrl} placeholder="http://192.168.1.100:3200" placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />
        <TouchableOpacity style={styles.saveBtn} onPress={saveUrl}><Text style={styles.saveBtnText}>OK</Text></TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Synchronisation</Text>
      <View style={styles.syncRow}>
        <SyncIndicator status={syncStatusState} />
        <Text style={styles.syncText}>{syncStatusState === 'synced' ? 'Synchronisiert' : syncStatusState === 'pending' ? 'Aenderungen warten...' : 'Offline'}</Text>
        <TouchableOpacity style={styles.syncBtn} onPress={triggerSync} disabled={syncing}>
          <RefreshCw size={18} color="#fff" /><Text style={styles.syncBtnText}>{syncing ? 'Sync...' : 'Jetzt sync'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Etiketten-Drucker</Text>
      <TouchableOpacity style={styles.scanBtn} onPress={scanPrinters} disabled={scanning}>
        {scanning ? <ActivityIndicator size="small" color={theme.colors.primaryLight} /> : <Search size={18} color={theme.colors.primaryLight} />}
        <Text style={styles.scanBtnText}>{scanning ? 'Suche Drucker...' : 'Drucker suchen'}</Text>
        {printers.length > 0 && <Text style={styles.scanCount}>{printers.length} gefunden</Text>}
      </TouchableOpacity>

      {PRINTER_CONTEXTS.map(ctx => {
        const assigned = getAssignedPrinter(ctx.key)
        return (
          <TouchableOpacity key={ctx.key} style={styles.menuItem}
            onPress={() => {
              if (printers.length === 0) { Alert.alert('Erst Drucker suchen', 'Tippe oben auf "Drucker suchen"'); return }
              setSelectContext(ctx.key)
            }}
            onLongPress={() => {
              if (assigned) {
                Alert.alert('Zuweisung entfernen', `Drucker fuer "${ctx.label}" entfernen?`, [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Entfernen', style: 'destructive', onPress: () => unassignPrinter(ctx.key) },
                ])
              }
            }}>
            <Printer size={18} color={assigned ? theme.colors.primaryLight : theme.colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>{ctx.label}</Text>
              <Text style={{ color: assigned ? theme.colors.textSecondary : theme.colors.textMuted, fontSize: theme.fontSize.xs }}>
                {assigned ? `${assigned.name} (${assigned.host})` : 'Nicht zugewiesen'}
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}

      <TouchableOpacity style={[styles.menuItem, { marginTop: theme.spacing.sm }]} onPress={async () => {
        try { await printTestLabel() } catch (err) { Alert.alert('Druckfehler', String(err)) }
      }}>
        <Printer size={18} color={theme.colors.textSecondary} />
        <Text style={styles.menuText}>Testdruck</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Verwaltung</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Lagerorte')}>
        <MapPin size={18} color={theme.colors.primaryLight} /><Text style={styles.menuText}>Lagerorte verwalten</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Kategorien')}>
        <Tag size={18} color={theme.colors.primaryLight} /><Text style={styles.menuText}>Kategorien verwalten</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>App</Text>
      <TouchableOpacity style={styles.menuItem} onPress={checkForUpdate}>
        <Download size={18} color={theme.colors.primaryLight} /><Text style={styles.menuText}>Auf Updates pruefen</Text>
      </TouchableOpacity>
      <Text style={styles.version}>SyntroPrepp v{Constants.expoConfig?.version || '1.0.0'}</Text>

      {/* Printer Selection Modal */}
      <Modal visible={selectContext !== null} transparent animationType="fade" onRequestClose={() => setSelectContext(null)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Drucker waehlen</Text>
              <TouchableOpacity onPress={() => setSelectContext(null)}><X size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={modalStyles.subtitle}>{PRINTER_CONTEXTS.find(c => c.key === selectContext)?.label}</Text>
            {printers.map(p => {
              const isAssigned = getAssignedPrinter(selectContext || '')?.host === p.host
              return (
                <TouchableOpacity key={`${p.host}:${p.port}`} style={[modalStyles.printerRow, isAssigned && modalStyles.printerRowActive]}
                  onPress={() => selectContext && assignPrinter(selectContext, p)}>
                  <Printer size={18} color={isAssigned ? '#fff' : theme.colors.primaryLight} />
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.printerName, isAssigned && { color: '#fff' }]}>{p.name}</Text>
                    <Text style={[modalStyles.printerHost, isAssigned && { color: 'rgba(255,255,255,0.7)' }]}>{p.host}:{p.port}</Text>
                  </View>
                  {isAssigned && <Check size={18} color="#fff" />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, width: '100%', maxWidth: 360 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.md },
  printerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: theme.spacing.md, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.background, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  printerRowActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  printerName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  printerHost: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  sectionTitle: { color: theme.colors.primaryLight, fontSize: theme.fontSize.sm, fontWeight: '600', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urlInput: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, fontSize: theme.fontSize.sm },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingHorizontal: 16, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  syncText: { flex: 1, color: theme.colors.text, fontSize: theme.fontSize.md },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  syncBtnText: { color: '#fff', fontSize: theme.fontSize.sm },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  scanBtnText: { color: theme.colors.primaryLight, fontSize: theme.fontSize.md, fontWeight: '600', flex: 1 },
  scanCount: { color: theme.colors.success, fontSize: theme.fontSize.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  menuText: { color: theme.colors.text, fontSize: theme.fontSize.md },
  version: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.xl },
})

import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { MapPin, Tag, RefreshCw, Download, Server, Printer } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { getServerUrl, setServerUrl } from '../lib/api'
import { syncNow, getSyncStatus, onSyncStatusChange } from '../lib/sync'
import { checkForUpdate } from '../lib/updater'
import { printTestLabel } from '../lib/label-printer'
import SyncIndicator from '../components/SyncIndicator'
import { SyncStatus } from '../types'

export default function EinstellungenScreen() {
  const navigation = useNavigation<any>()
  const [url, setUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncStatusState, setSyncStatusState] = useState<SyncStatus>(getSyncStatus())

  useEffect(() => {
    getServerUrl().then(setUrl)
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
      <TouchableOpacity style={styles.menuItem} onPress={async () => {
        try { await printTestLabel() } catch (err) { Alert.alert('Druckfehler', String(err)) }
      }}>
        <Printer size={18} color={theme.colors.primaryLight} />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuText}>Testdruck</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.xs }}>Drucker im Druckdialog waehlen - Android merkt sich die Auswahl</Text>
        </View>
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
    </ScrollView>
  )
}

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
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  menuText: { color: theme.colors.text, fontSize: theme.fontSize.md },
  version: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: theme.spacing.xl },
})

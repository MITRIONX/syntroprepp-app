import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import { Link as LinkIcon, Clipboard as ClipboardIcon } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { api } from '../lib/api'
import { uuidv4 } from '../lib/uuid'

export default function LinkImportScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const initialUrl: string | undefined = route.params?.url
  const [url, setUrl] = useState(initialUrl || '')
  const [loading, setLoading] = useState(false)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (initialUrl && !autoStartedRef.current) {
      autoStartedRef.current = true
      importLink(initialUrl)
    }
  }, [initialUrl])

  async function pasteFromClipboard() {
    const text = (await Clipboard.getStringAsync()).trim()
    if (text) setUrl(text)
  }

  function validUrl(candidate: string): boolean {
    try {
      const p = new URL(candidate)
      return p.protocol === 'http:' || p.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function downloadImage(imageUrl: string): Promise<string | null> {
    try {
      const destDir = `${FileSystem.documentDirectory}images/`
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true })
      const destPath = `${destDir}product_${uuidv4()}.jpg`
      const res = await FileSystem.downloadAsync(imageUrl, destPath)
      if (res.status !== 200) return null
      return destPath
    } catch {
      return null
    }
  }

  async function importLink(candidate: string) {
    const target = candidate.trim()
    if (!validUrl(target)) {
      Alert.alert('Ungueltiger Link', 'Bitte eine http(s)-URL eingeben.')
      return
    }
    setLoading(true)
    try {
      const meta = await api.linkLookup.fetch(target)
      const imageUri = meta.image_url ? await downloadImage(meta.image_url) : null
      navigation.replace('WareForm', {
        prefill: {
          name: meta.title || '',
          imageUri,
          description: meta.description || '',
          kaufquelleUrl: target,
        },
      })
    } catch (err) {
      console.log('[link-import] lookup failed:', err)
      Alert.alert(
        'Keine Daten gefunden',
        'Der Link wird uebernommen, bitte Name und Foto manuell ergaenzen.',
        [{ text: 'OK', onPress: () => navigation.replace('WareForm', { prefill: { kaufquelleUrl: target } }) }],
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shop-Link einfuegen</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://www.amazon.de/..."
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TouchableOpacity style={styles.pasteBtn} onPress={pasteFromClipboard} disabled={loading}>
        <ClipboardIcon size={18} color={theme.colors.primaryLight} />
        <Text style={styles.pasteText}>Aus Zwischenablage</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.importBtn, loading && styles.importBtnDisabled]} onPress={() => importLink(url)} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <LinkIcon size={20} color="#fff" />
            <Text style={styles.importText}>Importieren</Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>Funktioniert mit Amazon, Otto, Globetrotter und vielen anderen Shops. Bei Problemen wird nur der Link gespeichert, Name/Foto muessen dann manuell nachgetragen werden.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginBottom: 6, marginTop: theme.spacing.md },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: theme.colors.border },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: theme.spacing.sm, paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  pasteText: { color: theme.colors.primaryLight, fontSize: theme.fontSize.sm, fontWeight: '600' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.xl },
  importBtnDisabled: { opacity: 0.6 },
  importText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: theme.spacing.md, lineHeight: 18 },
})

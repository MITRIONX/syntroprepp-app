import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useNavigation } from '@react-navigation/native'
import { Keyboard } from 'lucide-react-native'
import { theme } from '../lib/theme'

export default function ScannerScreen() {
  const navigation = useNavigation<any>()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [manualEan, setManualEan] = useState('')
  const [showManual, setShowManual] = useState(false)

  function handleBarCodeScanned(result: { data: string }) {
    if (scanned) return
    setScanned(true)
    navigation.navigate('ScanResult', { ean: result.data })
    setTimeout(() => setScanned(false), 2000)
  }

  function submitManual() {
    if (manualEan.trim()) { navigation.navigate('ScanResult', { ean: manualEan.trim() }); setManualEan('') }
  }

  if (!permission) return <View style={styles.container} />
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Kamerazugriff wird benoetigt fuer den EAN-Scanner.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}><Text style={styles.btnText}>Kamera erlauben</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!showManual ? (
        <>
          <CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={handleBarCodeScanned} />
          <View style={styles.overlay}><View style={styles.scanFrame} /><Text style={styles.hint}>Barcode in den Rahmen halten</Text></View>
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.label}>EAN-Code eingeben</Text>
          <TextInput style={styles.input} value={manualEan} onChangeText={setManualEan} placeholder="z.B. 4030855001040" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" autoFocus />
          <TouchableOpacity style={styles.btn} onPress={submitManual}><Text style={styles.btnText}>Suchen</Text></TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowManual(!showManual)}>
        <Keyboard size={20} color={theme.colors.text} /><Text style={styles.toggleText}>{showManual ? 'Kamera nutzen' : 'Manuell eingeben'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 150, borderWidth: 2, borderColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md },
  hint: { color: '#fff', fontSize: theme.fontSize.md, marginTop: theme.spacing.md, textShadowColor: '#000', textShadowRadius: 4 },
  message: { color: theme.colors.text, fontSize: theme.fontSize.md, textAlign: 'center', marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  btn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  btnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: theme.spacing.md, backgroundColor: theme.colors.surface, width: '100%', justifyContent: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border },
  toggleText: { color: theme.colors.text, fontSize: theme.fontSize.md },
  manualContainer: { flex: 1, width: '100%', padding: theme.spacing.lg, justifyContent: 'center' },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.borderRadius.sm, padding: theme.spacing.md, fontSize: theme.fontSize.lg, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md, textAlign: 'center', letterSpacing: 2 },
})

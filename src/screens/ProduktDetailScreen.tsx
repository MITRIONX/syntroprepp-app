import React, { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { FileText, ExternalLink } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { dbGetFirst } from '../lib/db'
import { Produkt } from '../types'

export default function ProduktDetailScreen() {
  const route = useRoute<any>()
  const { id } = route.params
  const [produkt, setProdukt] = useState<Produkt | null>(null)

  useEffect(() => { loadProdukt() }, [id])

  async function loadProdukt() {
    const p = await dbGetFirst<Produkt>(`SELECT p.*, k.name as kategorie_name FROM produkte p LEFT JOIN kategorien k ON p.kategorie_id = k.id WHERE p.id = ?`, [id])
    setProdukt(p)
  }

  if (!produkt) return null
  const naehrwerte = typeof produkt.naehrwerte === 'string' ? JSON.parse(produkt.naehrwerte) : produkt.naehrwerte

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {produkt.bild_url && <Image source={{ uri: produkt.bild_url }} style={styles.image} resizeMode="contain" />}
      <Text style={styles.name}>{produkt.name}</Text>
      {produkt.ean && <View style={styles.row}><Text style={styles.label}>EAN:</Text><Text style={styles.value}>{produkt.ean}</Text></View>}
      {produkt.kategorie_name && <View style={styles.row}><Text style={styles.label}>Kategorie:</Text><Text style={styles.value}>{produkt.kategorie_name}</Text></View>}
      {produkt.gewicht && <View style={styles.row}><Text style={styles.label}>Gewicht/Menge:</Text><Text style={styles.value}>{produkt.gewicht}</Text></View>}
      {produkt.beschreibung && <View style={styles.section}><Text style={styles.sectionTitle}>Beschreibung</Text><Text style={styles.value}>{produkt.beschreibung}</Text></View>}
      {naehrwerte && Object.keys(naehrwerte).length > 0 && (
        <View style={styles.section}><Text style={styles.sectionTitle}>Naehrwerte (pro 100g)</Text>
          {Object.entries(naehrwerte).map(([key, val]) => val != null && (
            <View key={key} style={styles.row}><Text style={styles.label}>{key.replace(/_/g, ' ')}:</Text><Text style={styles.value}>{String(val)}</Text></View>
          ))}
        </View>
      )}
      {produkt.beipackzettel_url && (
        <TouchableOpacity style={styles.pdfBtn} onPress={() => Linking.openURL(produkt.beipackzettel_url!)}>
          <FileText size={20} color="#fff" /><Text style={styles.pdfBtnText}>Beipackzettel oeffnen</Text><ExternalLink size={16} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={styles.row}><Text style={styles.label}>Quelle:</Text><Text style={styles.value}>{produkt.quelle}</Text></View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  image: { width: '100%', height: 200, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, marginBottom: theme.spacing.md },
  name: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  value: { color: theme.colors.text, fontSize: theme.fontSize.md },
  section: { marginTop: theme.spacing.lg },
  sectionTitle: { color: theme.colors.primaryLight, fontSize: theme.fontSize.lg, fontWeight: '600', marginBottom: theme.spacing.sm },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.lg },
  pdfBtnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600', flex: 1 },
})

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Calendar, Hourglass } from 'lucide-react-native'
import { theme } from '../lib/theme'

interface Props { mhd_datum: string | null; mhd_geschaetzt: string | null; mhd_typ: 'exakt' | 'geschaetzt' }

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

function getExpiryColor(dateStr: string | null): string {
  if (!dateStr) return theme.colors.textMuted
  const now = new Date()
  const expiry = parseDate(dateStr)
  if (isNaN(expiry.getTime())) return theme.colors.textMuted
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) return theme.colors.danger
  if (daysLeft <= 90) return theme.colors.warning
  return theme.colors.success
}

function formatDate(dateStr: string): string {
  // Handle YYYY-MM-DD and ISO strings
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

export default function MhdBadge({ mhd_datum, mhd_geschaetzt, mhd_typ }: Props) {
  if (mhd_typ === 'exakt' && mhd_datum) {
    const color = getExpiryColor(mhd_datum)
    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Calendar size={12} color={color} />
        <Text style={[styles.text, { color }]}>{formatDate(mhd_datum)}</Text>
      </View>
    )
  }
  if (mhd_typ === 'geschaetzt' && mhd_geschaetzt) {
    return (
      <View style={[styles.badge, { borderColor: theme.colors.textSecondary }]}>
        <Hourglass size={12} color={theme.colors.textSecondary} />
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>~{mhd_geschaetzt}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.badge, { borderColor: theme.colors.textMuted }]}>
      <Text style={[styles.text, { color: theme.colors.textMuted }]}>Kein MHD</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: theme.borderRadius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: theme.fontSize.xs },
})

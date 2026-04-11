import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../lib/theme'

interface Props { icon: React.ReactNode; title: string; subtitle?: string }

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  title: { color: theme.colors.textSecondary, fontSize: theme.fontSize.lg, marginTop: theme.spacing.md, textAlign: 'center' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, textAlign: 'center' },
})

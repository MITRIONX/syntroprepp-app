import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { theme } from '../lib/theme'

interface FilterOption { id: string; label: string }
interface Props { label: string; options: FilterOption[]; selected: string | null; onSelect: (id: string | null) => void }

export default function FilterBar({ label, options, selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <TouchableOpacity style={[styles.chip, !selected && styles.chipActive]} onPress={() => onSelect(null)}>
          <Text style={[styles.chipText, !selected && styles.chipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {options.map(o => (
          <TouchableOpacity key={o.id} style={[styles.chip, selected === o.id && styles.chipActive]} onPress={() => onSelect(selected === o.id ? null : o.id)}>
            <Text style={[styles.chipText, selected === o.id && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.sm },
  label: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, marginBottom: 4 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs },
  chipTextActive: { color: '#fff' },
})

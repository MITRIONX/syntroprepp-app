import React from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native'
import { theme } from '../lib/theme'
import { SyncStatus } from '../types'

export default function SyncIndicator({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'synced': return <Cloud size={18} color={theme.colors.success} />
    case 'pending': return <RefreshCw size={18} color={theme.colors.warning} />
    case 'offline': return <CloudOff size={18} color={theme.colors.danger} />
  }
}

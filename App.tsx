import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import AppNavigator from './src/navigation/AppNavigator'
import { startSyncLoop } from './src/lib/sync'
import { checkForUpdate } from './src/lib/updater'

export default function App() {
  useEffect(() => { startSyncLoop(); checkForUpdate() }, [])
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  )
}

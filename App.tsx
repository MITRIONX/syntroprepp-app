import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import AppNavigator from './src/navigation/AppNavigator'
import { startSyncLoop } from './src/lib/sync'
import { checkForUpdate } from './src/lib/updater'

export default function App() {
  useEffect(() => { startSyncLoop(); checkForUpdate() }, [])
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  )
}

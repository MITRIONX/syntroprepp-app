import React, { useEffect, useRef } from 'react'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationContainerRef } from '@react-navigation/native'
import AppNavigator from './src/navigation/AppNavigator'
import { startSyncLoop } from './src/lib/sync'
import { checkForUpdate } from './src/lib/updater'

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

function extractHttpUrl(payload: string | null): string | null {
  if (!payload) return null
  if (looksLikeHttpUrl(payload)) return payload.trim()
  const match = payload.match(/https?:\/\/\S+/i)
  return match ? match[0] : null
}

export default function App() {
  const navRef = useRef<NavigationContainerRef<any> | null>(null)

  useEffect(() => {
    startSyncLoop()
    checkForUpdate()

    Linking.getInitialURL().then(url => {
      const http = extractHttpUrl(url)
      if (http && navRef.current) navRef.current.navigate('LinkImport', { url: http })
    })

    const sub = Linking.addEventListener('url', ({ url }) => {
      const http = extractHttpUrl(url)
      if (http && navRef.current) navRef.current.navigate('LinkImport', { url: http })
    })
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator navRef={navRef} />
    </GestureHandlerRootView>
  )
}

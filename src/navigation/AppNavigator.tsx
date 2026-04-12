import React from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { theme } from '../lib/theme'
import TabNavigator from './TabNavigator'
import KisteDetailScreen from '../screens/KisteDetailScreen'
import KisteFormScreen from '../screens/KisteFormScreen'
import WareFormScreen from '../screens/WareFormScreen'
import ProduktDetailScreen from '../screens/ProduktDetailScreen'
import ScanResultScreen from '../screens/ScanResultScreen'
import LagerorteScreen from '../screens/LagerorteScreen'
import KategorienScreen from '../screens/KategorienScreen'
import EinstellungenScreen from '../screens/EinstellungenScreen'
import ScannerScreen from '../screens/ScannerScreen'
import VerzehrHistorieScreen from '../screens/VerzehrHistorieScreen'

const Stack = createNativeStackNavigator()

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="KisteDetail" component={KisteDetailScreen} options={{ title: 'Kiste' }} />
        <Stack.Screen name="KisteForm" component={KisteFormScreen} options={{ title: 'Neue Kiste' }} />
        <Stack.Screen name="WareForm" component={WareFormScreen} options={{ title: 'Artikel hinzufuegen' }} />
        <Stack.Screen name="ProduktDetail" component={ProduktDetailScreen} options={{ title: 'Produktdetails' }} />
        <Stack.Screen name="ScanResult" component={ScanResultScreen} options={{ title: 'Scan-Ergebnis' }} />
        <Stack.Screen name="Lagerorte" component={LagerorteScreen} options={{ title: 'Lagerorte' }} />
        <Stack.Screen name="Kategorien" component={KategorienScreen} options={{ title: 'Kategorien' }} />
        <Stack.Screen name="Einstellungen" component={EinstellungenScreen} options={{ title: 'Einstellungen' }} />
        <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Scanner' }} />
        <Stack.Screen name="VerzehrHistorie" component={VerzehrHistorieScreen} options={{ title: 'Verzehr-Historie' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

import React from 'react'
import { TouchableOpacity } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { Box, Scan, Search, LayoutDashboard, Settings } from 'lucide-react-native'
import { theme } from '../lib/theme'
import DashboardScreen from '../screens/DashboardScreen'
import KistenScreen from '../screens/KistenScreen'
import ScannerScreen from '../screens/ScannerScreen'
import SucheScreen from '../screens/SucheScreen'

const Tab = createBottomTabNavigator()

function SettingsButton() {
  const navigation = useNavigation<any>()
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Einstellungen')} style={{ marginRight: 16 }}>
      <Settings size={22} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  )
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primaryLight,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          headerRight: () => <SettingsButton />,
        }}
      />
      <Tab.Screen
        name="Kisten"
        component={KistenScreen}
        options={{ tabBarIcon: ({ color, size }) => <Box color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ tabBarIcon: ({ color, size }) => <Scan color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Suche"
        component={SucheScreen}
        options={{ tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
    </Tab.Navigator>
  )
}

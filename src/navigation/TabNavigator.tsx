import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { Box, Scan, Search, LayoutDashboard, Settings, Package } from 'lucide-react-native'
import { theme } from '../lib/theme'
import DashboardScreen from '../screens/DashboardScreen'
import KistenScreen from '../screens/KistenScreen'
import ArtikelScreen from '../screens/ArtikelScreen'
import SucheScreen from '../screens/SucheScreen'

const Tab = createBottomTabNavigator()

function HeaderRight() {
  const navigation = useNavigation<any>()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate('Scanner')}>
        <Scan size={22} color={theme.colors.primaryLight} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Einstellungen')}>
        <Settings size={22} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
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
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Kisten"
        component={KistenScreen}
        options={{ tabBarIcon: ({ color, size }) => <Box color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Artikel"
        component={ArtikelScreen}
        options={{ tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Suche"
        component={SucheScreen}
        options={{ tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
    </Tab.Navigator>
  )
}

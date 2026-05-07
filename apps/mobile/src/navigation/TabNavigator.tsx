import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { brand } from '@grootfolio/tokens'
import { DashboardScreen } from '../screens/DashboardScreen'
import { AddAssetScreen } from '../screens/AddAssetScreen'
import { ProfileTestScreen } from '../screens/ProfileTestScreen'
import { AppHeader } from './AppHeader'

export type TabParamList = {
  Dashboard: undefined
  AddAsset: undefined
  ProfileTest: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

export function TabNavigator() {
  const { theme } = useTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: brand[500],
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.background.surface,
          borderTopColor: theme.border.default,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>▦</Text>,
        }}
      />
      <Tab.Screen
        name="AddAsset"
        component={AddAssetScreen}
        options={{
          tabBarLabel: 'Cargar Activo',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>+</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTest"
        component={ProfileTestScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>☑</Text>,
        }}
      />
    </Tab.Navigator>
  )
}

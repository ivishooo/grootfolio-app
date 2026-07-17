import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { brand } from '@grootfolio/tokens'
import { DashboardScreen } from '../screens/DashboardScreen'
import { AssetsScreen } from '../screens/AssetsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { ProfileTestScreen } from '../screens/ProfileTestScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { AppHeader } from './AppHeader'

export type TabParamList = {
  Dashboard: undefined
  Assets: undefined
  Reports: undefined
  ProfileTest: undefined
  Settings: undefined
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
        name="Assets"
        component={AssetsScreen}
        options={{
          tabBarLabel: 'Activos',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>≡</Text>,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reportes',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>▤</Text>,
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
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Config',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>⚙</Text>,
        }}
      />
    </Tab.Navigator>
  )
}

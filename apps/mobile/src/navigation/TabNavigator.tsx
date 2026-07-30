import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useTheme } from '../theme/ThemeProvider'
import { brand } from '@grootfolio/tokens'
import { useNotifications } from '@/lib/queries'
import { DashboardScreen } from '../screens/DashboardScreen'
import { AssetsScreen } from '../screens/AssetsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { ContentLibraryScreen } from '../screens/ContentLibraryScreen'
import { ProfileTestScreen } from '../screens/ProfileTestScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { DashboardIcon, AssetsIcon, ReportsIcon, ContentIcon, QuizIcon, SettingsIcon } from '../components/ui/icons'
import { AppHeader } from './AppHeader'

export type TabParamList = {
  Dashboard: undefined
  Assets: undefined
  Reports: undefined
  Content: undefined
  ProfileTest: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

export function TabNavigator() {
  const { theme } = useTheme()
  const { data: notif } = useNotifications()
  const unread = notif?.unreadCount ?? 0

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
          tabBarIcon: ({ color, size }) => <DashboardIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{
          tabBarLabel: 'Activos',
          tabBarIcon: ({ color, size }) => <AssetsIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reportes',
          tabBarIcon: ({ color, size }) => <ReportsIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Content"
        component={ContentLibraryScreen}
        options={{
          tabBarLabel: 'Contenidos',
          tabBarIcon: ({ color, size }) => <ContentIcon color={color} size={size} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tab.Screen
        name="ProfileTest"
        component={ProfileTestScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <QuizIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Config',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  )
}

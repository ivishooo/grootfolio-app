import { Text } from 'react-native'
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

/**
 * Label del tab que se encoge en vez de cortarse.
 *
 * Con seis pestañas en 375 px cada una tiene ~62 px, y "Contenidos" (el label
 * más largo) salía como "Contenid…" aunque el resto entrara. Bajar el tamaño
 * global para el peor caso achica los cinco labels que sí entraban;
 * `adjustsFontSizeToFit` lo resuelve por pestaña.
 */
function TabLabel({ label, color, testID }: { label: string; color: string; testID: string }) {
  return (
    <Text
      testID={testID}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      allowFontScaling={false}
      style={{ fontSize: 10, fontWeight: '600', color, textAlign: 'center' }}
    >
      {label}
    </Text>
  )
}

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
        // El label lo renderiza <TabLabel/>, que se encoge por pestaña en vez de
        // cortarse. Ver el comentario de ese componente.
        tabBarAllowFontScaling: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Inicio" color={color} testID="tab-inicio" />,
          tabBarIcon: ({ color, size }) => <DashboardIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Activos" color={color} testID="tab-activos" />,
          tabBarIcon: ({ color, size }) => <AssetsIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Reportes" color={color} testID="tab-reportes" />,
          tabBarIcon: ({ color, size }) => <ReportsIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Content"
        component={ContentLibraryScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Contenidos" color={color} testID="tab-contenidos" />,
          tabBarIcon: ({ color, size }) => <ContentIcon color={color} size={size} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tab.Screen
        name="ProfileTest"
        component={ProfileTestScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Perfil" color={color} testID="tab-perfil" />,
          tabBarIcon: ({ color, size }) => <QuizIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Ajustes" color={color} testID="tab-ajustes" />,
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  )
}

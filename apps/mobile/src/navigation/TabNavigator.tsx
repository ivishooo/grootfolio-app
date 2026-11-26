import { Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'
import { useNotifications } from '@/lib/queries'
import { DashboardScreen } from '../screens/DashboardScreen'
import { AssetsScreen } from '../screens/AssetsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { ContentLibraryScreen } from '../screens/ContentLibraryScreen'
import { DashboardIcon, AssetsIcon, ReportsIcon, ContentIcon } from '../components/ui/icons'
import { AppHeader } from './AppHeader'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from './RootNavigator'

/**
 * Navegación de 5 destinos (ADR-0006): Inicio, Activos, Cargar, Reportes y
 * Aprender. Perfil de inversor, Configuración y Administración se abren desde
 * el menú del avatar (`AppHeader`) y viven en el stack de `RootNavigator`.
 */
export type TabParamList = {
  Dashboard: undefined
  Assets: undefined
  /** No es una pantalla: el tab central abre `AddAsset` en el stack. */
  AddAssetTab: undefined
  Reports: undefined
  Content: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

/** El tab «Cargar» nunca se muestra: tocarlo navega a `AddAsset`. */
function Empty() {
  return <View />
}

/** Label de 11 / 600. Con 5 tabs en 375 px entran todos sin achicarse. */
function TabLabel({ label, color, testID }: { label: string; color: string; testID: string }) {
  return (
    <Text testID={testID} numberOfLines={1} allowFontScaling={false} style={{ fontSize: 11, fontWeight: '600', color, textAlign: 'center' }}>
      {label}
    </Text>
  )
}

/** Botón central: 44×44, radio 14, «+» blanco de trazo 2,4, levantado 14 px. */
function CargarIcon({ solid }: { solid: string }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        marginTop: -14,
        backgroundColor: solid,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F97316',
        shadowOpacity: 0.4,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </View>
  )
}

export function TabNavigator() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { data: notif } = useNotifications()
  const unread = notif?.unreadCount ?? 0

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: theme.brand.ink,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.background.surface,
          borderTopColor: theme.border.default,
          // 84 px en un iPhone con home indicator (50 + 34 de safe area).
          height: 50 + insets.bottom,
          paddingTop: 6,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarButtonTestID: 'tab-inicio',
          tabBarAccessibilityLabel: 'Inicio',
          tabBarLabel: ({ color }) => <TabLabel label="Inicio" color={color} testID="tab-inicio-label" />,
          tabBarIcon: ({ color }) => <DashboardIcon color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{
          tabBarButtonTestID: 'tab-activos',
          tabBarAccessibilityLabel: 'Activos',
          tabBarLabel: ({ color }) => <TabLabel label="Activos" color={color} testID="tab-activos-label" />,
          tabBarIcon: ({ color }) => <AssetsIcon color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="AddAssetTab"
        component={Empty}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            // `AddAsset` vive en el stack padre (RootNavigator), no en las tabs.
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('AddAsset')
          },
        })}
        options={{
          tabBarButtonTestID: 'tab-cargar',
          tabBarAccessibilityLabel: 'Cargar activo',
          tabBarLabel: ({ color }) => <TabLabel label="Cargar" color={color} testID="tab-cargar-label" />,
          tabBarIcon: () => <CargarIcon solid={theme.brand.solid} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarButtonTestID: 'tab-reportes',
          tabBarAccessibilityLabel: 'Reportes',
          tabBarLabel: ({ color }) => <TabLabel label="Reportes" color={color} testID="tab-reportes-label" />,
          tabBarIcon: ({ color }) => <ReportsIcon color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Content"
        component={ContentLibraryScreen}
        options={{
          tabBarButtonTestID: 'tab-aprender',
          tabBarAccessibilityLabel: unread > 0 ? `Aprender, ${unread} sin leer` : 'Aprender',
          tabBarLabel: ({ color }) => <TabLabel label="Aprender" color={color} testID="tab-aprender-label" />,
          tabBarIcon: ({ color }) => <ContentIcon color={color} size={24} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.brand.solid, color: '#fff', fontSize: 11, fontWeight: '700' },
        }}
      />
    </Tab.Navigator>
  )
}

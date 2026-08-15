import { ActivityIndicator, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@/auth/AuthProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProfileResultScreen } from '@/screens/ProfileResultScreen'
import { AddAssetScreen } from '@/screens/AddAssetScreen'
import { AdminUsersScreen } from '@/screens/AdminUsersScreen'
import { AdminUserDetailScreen } from '@/screens/AdminUserDetailScreen'
import { AdminContentScreen } from '@/screens/AdminContentScreen'
import { AdminKbScreen } from '@/screens/AdminKbScreen'
import { NotificationsScreen } from '@/screens/NotificationsScreen'
import { AccountSuspendedScreen } from '@/screens/AccountSuspendedScreen'
import { Assistant } from '@/components/assistant/Assistant'
import { TabNavigator } from './TabNavigator'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
  ProfileResult: undefined
  AddAsset: undefined
  AdminUsers: undefined
  AdminUserDetail: { id: string }
  AdminContent: undefined
  AdminKb: undefined
  Notifications: undefined
  AccountSuspended: { reason: string | null; suspendedUntil: string | null }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

/**
 * Las tabs con el launcher del asistente encima. Va acá y no dentro de una
 * pantalla para que la burbuja acompañe a todas las tabs, y no aparezca en
 * pantallas empujadas como "Cargar activo".
 */
function MainWithAssistant() {
  return (
    <View style={{ flex: 1 }}>
      <TabNavigator />
      <Assistant />
    </View>
  )
}

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth()
  const { theme } = useTheme()

  // Mientras recuperamos la sesion (/me), evitamos parpadear el login.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background.canvas }}>
        <ActivityIndicator color={theme.brand.solid} />
      </View>
    )
  }

  return (
    // `headerBackTitle` fijo: el back nativo tomaba el nombre de la ruta previa
    // y todas las pantallas mostraban "‹ Main", que es un nombre interno.
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitle: 'Volver' }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainWithAssistant} />
          <Stack.Screen name="ProfileResult" component={ProfileResultScreen} />
          <Stack.Screen name="AddAsset" component={AddAssetScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notificaciones' }} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ headerShown: true, title: 'Usuarios' }} />
          <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ headerShown: true, title: 'Detalle' }} />
          <Stack.Screen name="AdminContent" component={AdminContentScreen} options={{ headerShown: true, title: 'Gestión de contenidos' }} />
          <Stack.Screen name="AdminKb" component={AdminKbScreen} options={{ headerShown: true, title: 'Base de conocimiento' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AccountSuspended" component={AccountSuspendedScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}

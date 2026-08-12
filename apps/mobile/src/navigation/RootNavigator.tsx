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
import { ChatScreen } from '@/screens/ChatScreen'
import { NotificationsScreen } from '@/screens/NotificationsScreen'
import { AccountSuspendedScreen } from '@/screens/AccountSuspendedScreen'
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
  Chat: undefined
  Notifications: undefined
  AccountSuspended: { reason: string | null; suspendedUntil: string | null }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="ProfileResult" component={ProfileResultScreen} />
          <Stack.Screen name="AddAsset" component={AddAssetScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notificaciones' }} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ headerShown: true, title: 'Usuarios' }} />
          <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ headerShown: true, title: 'Detalle' }} />
          <Stack.Screen name="AdminContent" component={AdminContentScreen} options={{ headerShown: true, title: 'Gestión de contenidos' }} />
          <Stack.Screen name="AdminKb" component={AdminKbScreen} options={{ headerShown: true, title: 'Base de conocimiento' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Asistente' }} />
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

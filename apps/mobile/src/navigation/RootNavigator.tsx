import { ActivityIndicator, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@/auth/AuthProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProfileResultScreen } from '@/screens/ProfileResultScreen'
import { AddAssetScreen } from '@/screens/AddAssetScreen'
import { TabNavigator } from './TabNavigator'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
  ProfileResult: undefined
  AddAsset: undefined
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
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

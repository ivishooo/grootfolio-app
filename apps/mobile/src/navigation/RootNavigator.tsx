import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@/auth/AuthProvider'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProfileResultScreen } from '@/screens/ProfileResultScreen'
import { TabNavigator } from './TabNavigator'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
  ProfileResult: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { isAuthenticated } = useAuth()

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="ProfileResult" component={ProfileResultScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

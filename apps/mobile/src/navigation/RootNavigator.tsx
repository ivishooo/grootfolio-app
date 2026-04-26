import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { LoginScreen } from '@/screens/LoginScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { AddAssetScreen } from '@/screens/AddAssetScreen'
import { ProfileTestScreen } from '@/screens/ProfileTestScreen'
import { ProfileResultScreen } from '@/screens/ProfileResultScreen'

export type RootStackParamList = {
  Login: undefined
  Dashboard: undefined
  AddAsset: undefined
  ProfileTest: undefined
  ProfileResult: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddAsset" component={AddAssetScreen} />
      <Stack.Screen name="ProfileTest" component={ProfileTestScreen} />
      <Stack.Screen name="ProfileResult" component={ProfileResultScreen} />
    </Stack.Navigator>
  )
}

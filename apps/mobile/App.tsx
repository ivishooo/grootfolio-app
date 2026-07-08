import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { NavigationContainer } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Sentry from '@sentry/react-native'
import { AuthProvider } from './src/auth/AuthProvider'
import { RootNavigator } from './src/navigation/RootNavigator'
import { ThemeProvider } from './src/theme/ThemeProvider'

// Observabilidad (GF-185). Se activa solo si EXPO_PUBLIC_SENTRY_DSN esta definida
// (se hornea en build via el perfil de eas.json); sin DSN es un no-op.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0,
  })
}

SplashScreen.preventAutoHideAsync().catch(() => {})

const queryClient = new QueryClient()

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

// Con Sentry activo, Sentry.wrap agrega instrumentacion (errores/navegacion).
// Sin DSN, exportamos el App tal cual para no envolver de mas.
export default sentryDsn ? Sentry.wrap(App) : App

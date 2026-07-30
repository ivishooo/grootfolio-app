/**
 * Cuenta suspendida mobile (F7). Se llega al recibir 403 ACCOUNT_SUSPENDED en el
 * login; el motivo y la fecha vienen por route.params. Fuera del stack autenticado.
 */
import { View, Text, TouchableOpacity, Linking } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { Screen } from '@/components/ui/Screen'

export function AccountSuspendedScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'AccountSuspended'>>()
  const { reason, suspendedUntil } = route.params ?? { reason: null, suspendedUntil: null }

  const untilText = suspendedUntil
    ? `Vas a poder ingresar el ${new Date(suspendedUntil).toLocaleDateString('es-AR')}.`
    : 'La suspensión es indefinida.'

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(220,38,38,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#DC2626', fontSize: 34, fontWeight: '800' }}>⊘</Text>
        </View>
        <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: '800', marginTop: 16 }}>Tu cuenta está suspendida</Text>
        {reason ? (
          <View style={{ marginTop: 16, borderRadius: 10, backgroundColor: 'rgba(220,38,38,0.08)', paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: '#991b1b', fontSize: 14, textAlign: 'center' }}>{reason}</Text>
          </View>
        ) : null}
        <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 16, textAlign: 'center' }}>{untilText}</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:soporte@grootfolio.app')} style={{ marginTop: 8 }}>
          <Text style={{ color: theme.brand.solid, fontSize: 14, fontWeight: '600' }}>Contactar soporte</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginTop: 24, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 }}>
          <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Volver al login</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

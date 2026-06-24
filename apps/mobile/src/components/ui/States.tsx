/**
 * Estados transversales de UI (GF-227) para mobile: carga, error y vacio.
 */
import { ActivityIndicator, View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from './Button'

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 }}>
      <ActivityIndicator color={theme.brand.solid} />
      <Text style={{ color: theme.text.secondary }}>{label}</Text>
    </View>
  )
}

export function ErrorState({ message = 'Algo salio mal.', onRetry }: { message?: string; onRetry?: () => void }) {
  const { theme } = useTheme()
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 24 }}>
      <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>{message}</Text>
      {onRetry && (
        <Button variant="secondary" onPress={onRetry}>
          Reintentar
        </Button>
      )}
    </View>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingVertical: 28, paddingHorizontal: 16 }}>
      <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{title}</Text>
      {description && (
        <Text style={{ color: theme.text.muted, textAlign: 'center', fontSize: 13 }}>{description}</Text>
      )}
    </View>
  )
}

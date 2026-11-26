import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'

interface ScreenProps {
  children: ReactNode
  /**
   * Para pantallas sin header (`headerShown: false`), como Cargar activo: deja
   * el lugar del área segura de arriba. Sin esto el contenido arrancaba debajo
   * de la hora y la isla, y el «← Volver» no se podía tocar.
   */
  safeTop?: boolean
}

export function Screen({ children, safeTop = false }: ScreenProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: theme.background.canvas, paddingTop: safeTop ? insets.top : 0 }}>{children}</View>
  )
}

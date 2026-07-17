/**
 * Toast liviano para mobile (Fase E) sin librerias nuevas: un context expone
 * `toast(message, variant?)` y un `View` posicionado cerca del bottom con fade
 * de `Animated` y auto-dismiss ~3s. Espejo funcional del toast de web.
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type ToastVariant = 'success' | 'error'

interface ToastState {
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DISMISS_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [current, setCurrent] = useState<ToastState | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setCurrent(null)
      },
    )
  }, [opacity])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      if (timer.current) clearTimeout(timer.current)
      setCurrent({ message, variant })
      opacity.setValue(0)
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      timer.current = setTimeout(hide, DISMISS_MS)
    },
    [opacity, hide],
  )

  const bg = current?.variant === 'error' ? theme.danger.solid : theme.success.solid

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current && (
        <Animated.View pointerEvents="none" style={[s.wrap, { opacity }]}>
          <View style={[s.toast, { backgroundColor: bg }]}>
            <Text style={[s.text, { color: theme.text.onBrand }]}>{current.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  text: { fontWeight: '600', fontSize: 14, textAlign: 'center' },
})

/**
 * Toasts mobile (rediseño GF) — espejo del web. Un aviso a la vez cerca del
 * bottom, con acento lateral por variante, ícono, título, descripción opcional
 * y una acción opcional (ej. "Deshacer"). Animated fade + auto-dismiss.
 *
 * API retrocompatible:
 *   toast('Guardado')                         -> success
 *   toast('Falló', 'error')
 *   toast('Posición eliminada', 'info', { description: '…', action: 'Deshacer', onAction })
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  description?: string
  action?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastState extends ToastOptions {
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_META: Record<ToastVariant, { color: string; icon: string }> = {
  success: { color: '#16A34A', icon: '✓' },
  error: { color: '#DC2626', icon: '✕' },
  warning: { color: '#D97706', icon: '!' },
  info: { color: '#2563EB', icon: 'i' },
}

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
    (message: string, variant: ToastVariant = 'success', options: ToastOptions = {}) => {
      if (timer.current) clearTimeout(timer.current)
      setCurrent({ message, variant, ...options })
      opacity.setValue(0)
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      const ms = options.durationMs ?? (options.action ? 7000 : 3800)
      timer.current = setTimeout(hide, ms)
    },
    [opacity, hide],
  )

  const meta = current ? VARIANT_META[current.variant] : null

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current && meta && (
        <Animated.View pointerEvents="box-none" style={[s.wrap, { opacity }]}>
          <View
            style={[
              s.toast,
              { backgroundColor: theme.background.elevated, borderColor: theme.border.default, borderLeftColor: meta.color },
            ]}
          >
            <View style={[s.iconCircle, { backgroundColor: meta.color }]}>
              <Text style={s.iconText}>{meta.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: theme.text.primary }]}>{current.message}</Text>
              {current.description ? (
                <Text style={[s.desc, { color: theme.text.secondary }]}>{current.description}</Text>
              ) : null}
              {current.action ? (
                <TouchableOpacity
                  onPress={() => {
                    current.onAction?.()
                    hide()
                  }}
                  style={[s.actionBtn, { borderColor: meta.color }]}
                >
                  <Text style={{ color: meta.color, fontWeight: '700', fontSize: 12 }}>{current.action}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity onPress={hide} accessibilityLabel="Cerrar" hitSlop={8}>
              <Text style={{ color: theme.text.muted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
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
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 90, paddingHorizontal: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  title: { fontWeight: '700', fontSize: 14 },
  desc: { fontSize: 12, marginTop: 2 },
  actionBtn: { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
})

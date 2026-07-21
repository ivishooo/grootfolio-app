/**
 * Confirmación in-app (rediseño GF) — espejo del ConfirmProvider de web, con
 * `Modal` de React Native. Reemplaza a `Alert.alert` para las acciones
 * destructivas de la app.
 *
 * API: confirm(options): Promise<boolean>. Si se pasa `onConfirm` (async), el
 * botón de confirmar muestra un `ActivityIndicator` mientras corre y el modal
 * se cierra al terminar; si `onConfirm` lanza, el modal queda abierto (el caller
 * ya avisa el error con un toast).
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destructivo (rojo) para confirmar. Default true. */
  danger?: boolean
  /** Acción async: muestra spinner y cierra al terminar; si falla, queda abierto. */
  onConfirm?: () => Promise<void> | void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setLoading(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOptions(null)
    setLoading(false)
    resolver.current?.(result)
    resolver.current = null
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!options?.onConfirm) {
      close(true)
      return
    }
    try {
      setLoading(true)
      await options.onConfirm()
      close(true)
    } catch {
      setLoading(false)
    }
  }, [options, close])

  const danger = options?.danger ?? true
  const confirmColor = danger ? theme.danger.solid : theme.brand.solid

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => !loading && close(false)}>
        <Pressable style={s.backdrop} onPress={() => !loading && close(false)}>
          <Pressable
            style={[s.card, { backgroundColor: theme.background.elevated, borderColor: theme.border.default }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={s.headerRow}>
              <View style={[s.iconCircle, { backgroundColor: danger ? 'rgba(239,68,68,0.13)' : 'rgba(249,115,22,0.13)' }]}>
                <Text style={{ color: danger ? '#EF4444' : '#F97316', fontWeight: '800', fontSize: 18 }}>!</Text>
              </View>
              <Text style={[s.title, { color: theme.text.primary }]}>{options?.title}</Text>
            </View>
            {options?.message ? (
              <Text style={[s.message, { color: theme.text.secondary }]}>{options.message}</Text>
            ) : null}
            <View style={s.actions}>
              <TouchableOpacity
                onPress={() => close(false)}
                disabled={loading}
                style={[s.btn, { borderWidth: 1, borderColor: theme.border.default, opacity: loading ? 0.5 : 1 }]}
              >
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{options?.cancelLabel ?? 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={loading}
                style={[s.btn, s.confirmBtn, { backgroundColor: confirmColor, opacity: loading ? 0.85 : 1 }]}
              >
                {loading ? <ActivityIndicator size="small" color={theme.text.onBrand} /> : null}
                <Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>{options?.confirmLabel ?? 'Eliminar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx.confirm
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, borderRadius: 18, borderWidth: 1, padding: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  message: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flexDirection: 'row', gap: 8 },
})

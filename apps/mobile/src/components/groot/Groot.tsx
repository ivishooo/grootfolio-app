/**
 * Groot en mobile (rediseño v2, ADR-0006): reemplaza al launcher del asistente.
 * Va arriba de la barra de tabs, a la derecha: la burbuja arriba y el avatar
 * abajo. Solo vive sobre las tabs (`MainWithAssistant`), así que no tapa el
 * botón de guardar de Cargar activo.
 *
 * - Tocar el avatar: otro mensaje de ánimo, con parpadeo lento y «prrr».
 * - «Preguntarme algo» abre el chat (sin cambios, ADR-0004).
 * - La burbuja se abre sola solo en Inicio y con eventos.
 */
import { useCallback } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Path } from 'react-native-svg'
import { BAJA_FUERTE, grootContenido, type GrootAction, type GrootMode } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { GrootAvatar } from './GrootAvatar'
import { useGroot } from './GrootProvider'
import { useGrootDatos } from './useGrootDatos'

/** Alto de la barra de tabs sin la safe area (ver TabNavigator). */
const TAB_BAR = 50

const MODE_BY_TAB: Record<string, { mode: GrootMode; autoOpen: boolean }> = {
  Dashboard: { mode: 'resumen', autoOpen: true },
  Assets: { mode: 'resumen', autoOpen: false },
  Reports: { mode: 'reportes', autoOpen: false },
  Content: { mode: 'contenido', autoOpen: false },
}

/**
 * Listeners de las tabs: al enfocar una, Groot toma el modo de esa pantalla y la
 * burbuja se abre (Inicio) o se cierra (el resto). Va en `screenListeners` del
 * Tab.Navigator: leer la tab enfocada desde la ruta padre con
 * `getFocusedRouteNameFromRoute` no se enteraba de todos los cambios y la
 * burbuja quedaba abierta en Activos, tapando sus botones.
 */
export function useGrootTabListeners() {
  const { pantalla } = useGroot()
  return useCallback(
    ({ route }: { route: { name: string } }) => ({
      focus: () => {
        const m = MODE_BY_TAB[route.name]
        if (m) pantalla(m.mode, m.autoOpen)
      },
    }),
    [pantalla],
  )
}

export function Groot({ onOpenChat }: { onOpenChat: () => void }) {
  const g = useGroot()
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { datos, dayPct, ready } = useGrootDatos(g.lastTx)
  // `Main` deja de estar enfocada cuando hay otra pantalla del stack encima.
  const focused = useIsFocused()

  if (!g.visible) return null

  const c = grootContenido(g.mode, datos, g.animoIdx)
  const bajaFuerte = dayPct !== null && dayPct <= BAJA_FUERTE

  const run = (a: GrootAction) => {
    switch (a.id) {
      case 'chat':
        onOpenChat()
        break
      case 'ver-activos':
        nav.navigate('Main', { screen: 'Assets' } as never)
        break
      case 'mi-resumen':
        g.decir('resumen')
        break
      case 'cargar-otro':
        nav.navigate('AddAsset')
        break
      case 'abrir-contenido':
        nav.navigate('Main', { screen: 'Content' } as never)
        break
      case 'ver-asignacion':
        nav.navigate('ProfileResult')
        break
    }
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 14, bottom: TAB_BAR + insets.bottom + 12, alignItems: 'flex-end', gap: 10, zIndex: 20 }}
    >
      {g.open && ready && (
        <View
          testID="groot-burbuja"
          style={{
            width: 290,
            backgroundColor: theme.background.surface,
            borderWidth: 1,
            borderColor: theme.border.default,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 4,
            borderBottomLeftRadius: 16,
            paddingTop: 12,
            paddingHorizontal: 14,
            paddingBottom: 14,
            gap: 9,
            shadowColor: '#0F172A',
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: theme.brand.ink, fontSize: 13, fontWeight: '700' }}>Groot</Text>
            <Text style={{ flex: 1, color: theme.text.muted, fontSize: 12.5 }}>{c.label}</Text>
            <TouchableOpacity
              onPress={g.cerrar}
              accessibilityRole="button"
              accessibilityLabel="Ocultar a Groot"
              hitSlop={8}
              style={{ width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: -4 }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M18 6 6 18M6 6l12 12" stroke={theme.text.muted} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
          <Text accessibilityLiveRegion="polite" style={{ color: theme.text.primary, fontSize: 15, fontWeight: '500', lineHeight: 21 }}>
            {c.msg}
          </Text>
          {c.sub ? <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>{c.sub}</Text> : null}
          {c.actions.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
              {c.actions.map((a) => {
                const pri = a.kind === 'pri'
                return (
                  <TouchableOpacity
                    key={a.id}
                    testID={`groot-accion-${a.id}`}
                    onPress={() => run(a)}
                    accessibilityRole="button"
                    style={{
                      minHeight: 34,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      justifyContent: 'center',
                      backgroundColor: pri ? theme.brand.solid : theme.background.surface,
                      borderWidth: pri ? 0 : 1,
                      borderColor: theme.border.strong,
                    }}
                  >
                    <Text style={{ color: pri ? '#fff' : theme.text.primary, fontSize: 13, fontWeight: '600' }}>{a.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        testID="groot-avatar"
        onPress={g.tocar}
        accessibilityRole="button"
        accessibilityLabel="Groot: tocalo para otro mensaje"
        activeOpacity={0.85}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          borderWidth: 3,
          borderColor: theme.background.surface,
          backgroundColor: theme.groot.ground,
          shadowColor: '#0F172A',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <View style={{ flex: 1, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          <GrootAvatar mood={c.mood} pets={g.pets} size={52} paused={!focused} />
        </View>
        {!g.open && bajaFuerte && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              height: 20,
              minWidth: 20,
              paddingHorizontal: 4,
              borderRadius: 10,
              backgroundColor: '#DC2626',
              borderWidth: 2,
              borderColor: theme.background.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '600' }}>
              ↓{Math.abs(dayPct!).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

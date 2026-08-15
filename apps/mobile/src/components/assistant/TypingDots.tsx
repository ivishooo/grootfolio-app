/**
 * Indicador de escritura. Ocupa el lugar de la respuesta que viene, en vez del
 * "Pensando…" en texto que se confundía con contenido real del bot.
 *
 * Respeta "Reducir movimiento" del sistema: con la opción activada los puntos
 * quedan fijos y atenuados, como en la web con `prefers-reduced-motion`.
 */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

function Dot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const { theme } = useTheme()
  const opacity = useRef(new Animated.Value(0.28)).current

  useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 330, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.28, duration: 440, easing: Easing.ease, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [delay, opacity, reduceMotion])

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.text.muted,
        opacity: reduceMotion ? 0.5 : opacity,
      }}
    />
  )
}

export function TypingDots() {
  const { theme } = useTheme()
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => sub.remove()
  }, [])

  return (
    <View
      accessibilityLabel="El asistente está escribiendo"
      style={{
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.background.muted,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      {[0, 150, 300].map((delay) => (
        <Dot key={delay} delay={delay} reduceMotion={reduceMotion} />
      ))}
    </View>
  )
}

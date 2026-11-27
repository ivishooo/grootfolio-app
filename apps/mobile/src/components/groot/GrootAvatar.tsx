/**
 * Groot para React Native (rediseño v2, ADR-0006): react-native-svg +
 * react-native-reanimated. Solo se anima lo que se nota a 52-60 px:
 * respiración, parpadeo, cabeza ladeada y, al tocarlo, parpadeo lento + «prrr».
 * La geometría es la de la web (components/groot/GrootAvatar.tsx). Con «reducir
 * movimiento» activado no hay loops.
 */
import { useEffect } from 'react'
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg'
import Animated, {
  Easing, ReduceMotion, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming, useReducedMotion,
} from 'react-native-reanimated'
import { Text, View } from 'react-native'
import type { GrootMood } from '@grootfolio/shared'

const AG = Animated.createAnimatedComponent(G)
const O = '#E8913F', D = '#C46B26', W = '#FFFAF3', EYE = '#B9C97A', RING = '#6F7A3A', K = '#1F1A17', PINK = '#F3B1AE', NOSE = '#EE9A9C'

/**
 * `paused`: sin loops. Groot vive en la pantalla de las tabs y, con otra pantalla
 * encima (Cargar activo, Notificaciones), las animaciones infinitas seguían
 * corriendo atrás: gastaban batería y no dejaban que la app quedara en reposo,
 * que es lo que espera XCTest (los swipes de Maestro fallaban por timeout).
 */
export function GrootAvatar({ mood = 'calm', pets = 0, size = 52, paused = false }: { mood?: GrootMood; pets?: number; size?: number; paused?: boolean }) {
  const reduce = useReducedMotion()
  const breathe = useSharedValue(0)
  const blink = useSharedValue(1)
  const tilt = useSharedValue(0)
  const prrr = useSharedValue(0)
  const happy = mood === 'happy'
  const scared = mood === 'scared'

  useEffect(() => {
    if (reduce || paused) {
      cancelAnimation(breathe)
      cancelAnimation(tilt)
      cancelAnimation(blink)
      breathe.value = 0
      tilt.value = 0.5
      blink.value = 1
      return
    }
    const io = Easing.inOut(Easing.ease)
    breathe.value = withRepeat(withTiming(1, { duration: 1800, easing: io }), -1, true)
    tilt.value = withRepeat(withTiming(1, { duration: scared ? 175 : 3500, easing: io }), -1, true)
    blink.value = withRepeat(withSequence(withDelay(4600, withTiming(0.1, { duration: 150 })), withTiming(1, { duration: 150 })), -1)
  }, [reduce, scared, paused])

  // Toque: parpadeo lento (el «beso de gato») y «prrr».
  useEffect(() => {
    if (!pets) return
    blink.value = withSequence(withTiming(0.12, { duration: 280 }), withDelay(600, withTiming(1, { duration: 400 })))
    prrr.value = 0
    prrr.value = withTiming(1, { duration: 1400, reduceMotion: ReduceMotion.Never })
  }, [pets])

  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: breathe.value * size * 0.012 }] }))
  const headProps = useAnimatedProps(() => {
    const deg = scared ? (tilt.value - 0.5) * 1.2 : mood === 'curious' ? -9 + tilt.value * 3 : -2 + tilt.value * 4.5
    return { rotation: deg, originX: 50, originY: 80 } as never
  })
  const eyesProps = useAnimatedProps(() => ({ scaleY: blink.value, originY: 55.5 }) as never)
  const prrrStyle = useAnimatedStyle(() => ({
    opacity: prrr.value === 0 || prrr.value === 1 ? 0 : prrr.value < 0.2 ? prrr.value * 5 : prrr.value > 0.8 ? (1 - prrr.value) * 5 : 1,
    transform: [{ translateY: -prrr.value * 10 }, { translateX: prrr.value * 6 }],
  }))

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg viewBox="0 0 100 100" width={size} height={size}>
          <Ellipse cx={50} cy={114} rx={44} ry={30} fill={O} />
          <Ellipse cx={50} cy={110} rx={27} ry={26} fill={W} />
          <Path d="M28 86 Q50 96 72 86 L71 91 Q50 101 29 91 Z" fill="#D63A3A" />
          <Path d="M46 95 L47.5 92 L49 94 L51 94 L52.5 92 L54 95 Q55 101 50 102 Q45 101 46 95 Z" fill="#C9CDD2" stroke="#9AA0A6" strokeWidth={0.6} />
          <AG animatedProps={headProps}>
            <G rotation={scared ? -28 : 0} originX={40} originY={40}>
              <Path d="M17 50 Q12 26 17 8 Q19 5 22 8 L45 29 Z" fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
              <Path d="M22 42 Q19 26 22 15 L38 30 Z" fill={PINK} />
            </G>
            <G rotation={scared ? 28 : 0} originX={60} originY={40}>
              <Path d="M83 50 Q88 26 83 8 Q81 5 78 8 L55 29 Z" fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
              <Path d="M78 42 Q81 26 78 15 L62 30 Z" fill={PINK} />
            </G>
            <Ellipse cx={50} cy={57} rx={34} ry={29} fill={O} />
            <Rect x={40.5} y={31} width={2.6} height={8} rx={1.3} fill={D} />
            <Rect x={56.9} y={31} width={2.6} height={8} rx={1.3} fill={D} />
            <Rect x={17} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <Rect x={75} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <Path d="M50 30 Q46.5 40 45 50 Q44 58 40 64 Q34 72 37 80 Q50 89 63 80 Q66 72 60 64 Q56 58 55 50 Q53.5 40 50 30 Z" fill={W} />
            {happy ? (
              <G>
                <Path d="M30 57 Q36.5 50.5 43 57" stroke={K} strokeWidth={2.2} fill="none" strokeLinecap="round" />
                <Path d="M57 57 Q63.5 50.5 70 57" stroke={K} strokeWidth={2.2} fill="none" strokeLinecap="round" />
              </G>
            ) : (
              <AG animatedProps={eyesProps}>
                <Ellipse cx={36.5} cy={55.5} rx={7} ry={7} fill={EYE} stroke={RING} strokeWidth={0.9} />
                <Ellipse cx={63.5} cy={55.5} rx={7} ry={7} fill={EYE} stroke={RING} strokeWidth={0.9} />
                {scared ? (
                  <G><Circle cx={36.5} cy={55.8} r={4.8} fill={K} /><Circle cx={63.5} cy={55.8} r={4.8} fill={K} /></G>
                ) : (
                  <G>
                    <Ellipse cx={36.5} cy={55.8} rx={mood === 'curious' ? 3.2 : 1.9} ry={5.2} fill={K} />
                    <Ellipse cx={63.5} cy={55.8} rx={mood === 'curious' ? 3.2 : 1.9} ry={5.2} fill={K} />
                  </G>
                )}
                <Circle cx={38.6} cy={53} r={1.6} fill="#fff" />
                <Circle cx={65.6} cy={53} r={1.6} fill="#fff" />
              </AG>
            )}
            <Path d="M46.4 63 Q50 61.8 53.6 63 L50 67.2 Z" fill={NOSE} />
            <Path d="M50 67.2 L50 69 M50 69 Q47.6 71.6 45.2 70.2 M50 69 Q52.4 71.6 54.8 70.2" stroke="#8A4B3A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
            <G stroke="#fff" strokeWidth={0.7} strokeLinecap="round">
              <Line x1={40} y1={68} x2={19} y2={65} /><Line x1={40} y1={70.5} x2={20} y2={73.5} />
              <Line x1={60} y1={68} x2={81} y2={65} /><Line x1={60} y1={70.5} x2={80} y2={73.5} />
            </G>
          </AG>
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -size * 0.1, top: -size * 0.05 }, prrrStyle]}>
        <Text style={{ fontSize: Math.max(10, size * 0.16), fontWeight: '700', color: '#C2410C' }}>prrr</Text>
      </Animated.View>
    </View>
  )
}

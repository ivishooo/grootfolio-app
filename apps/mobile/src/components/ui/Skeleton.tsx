/**
 * Skeleton loader (GF-229) para mobile: bloque con pulso de opacidad como
 * placeholder con la forma del contenido mientras carga.
 */
import { useEffect, useRef } from 'react'
import { Animated, type DimensionValue, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface SkeletonProps {
  width?: DimensionValue
  height?: DimensionValue
  radius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const { theme } = useTheme()
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.background.muted, opacity }, style]}
    />
  )
}

import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  onPress: () => void
  children: string
  style?: ViewStyle
  testID?: string
}

export function Button({ variant = 'primary', size = 'md', fullWidth, disabled, onPress, children, style, testID }: ButtonProps) {
  const { theme } = useTheme()

  const bg = variant === 'primary' ? theme.brand.solid
    : variant === 'destructive' ? theme.danger.solid
    : 'transparent'

  const textColor = variant === 'secondary' ? theme.text.primary : theme.text.onBrand
  const borderColor = variant === 'secondary' ? theme.border.default : 'transparent'
  const padding = size === 'sm' ? 10 : size === 'lg' ? 16 : 14
  const fontSize = size === 'sm' ? 13 : 15

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        s.base,
        { backgroundColor: bg, borderColor, padding, opacity: disabled ? 0.5 : 1 },
        variant === 'secondary' && { borderWidth: 1 },
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      <Text style={{ color: textColor, fontWeight: '600', fontSize, textAlign: 'center' }}>{children}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base: { borderRadius: 10, alignItems: 'center' },
})

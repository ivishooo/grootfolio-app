import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, type KeyboardTypeOptions } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { EyeIcon, EyeOffIcon } from './icons'

interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  multiline?: boolean
  keyboard?: KeyboardTypeOptions
  secureTextEntry?: boolean
  testID?: string
}

export function FormField({ label, value, onChange, error, placeholder, multiline, keyboard, secureTextEntry, testID }: FormFieldProps) {
  const { theme } = useTheme()
  // En campos password mostramos un toggle Ver/Ocultar; arranca oculto.
  const [revealed, setRevealed] = useState(false)

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          testID={testID}
          placeholder={placeholder}
          placeholderTextColor={theme.text.placeholder}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          secureTextEntry={secureTextEntry && !revealed}
          autoCapitalize={secureTextEntry ? 'none' : undefined}
          multiline={multiline}
          style={{
            padding: 12,
            paddingRight: secureTextEntry ? 46 : 12,
            borderRadius: 10,
            // El relleno gris era lo que hundia el contraste del placeholder.
            // Con fondo de superficie y borde visible el campo se sigue leyendo
            // como campo, y el placeholder cumple AA.
            backgroundColor: theme.background.surface,
            color: theme.text.primary,
            borderColor: error ? theme.danger.solid : theme.border.strong,
            borderWidth: 1,
            height: multiline ? 80 : undefined,
            textAlignVertical: multiline ? 'top' : undefined,
          }}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={8}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 }}
          >
            {revealed ? <EyeOffIcon color={theme.text.secondary} size={20} /> : <EyeIcon color={theme.text.secondary} size={20} />}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

import { View, Text, TextInput, type KeyboardTypeOptions } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

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

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        testID={testID}
        placeholder={placeholder}
        placeholderTextColor={theme.text.placeholder}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: theme.background.muted,
          color: theme.text.primary,
          borderColor: error ? theme.danger.solid : 'transparent',
          borderWidth: 1,
          height: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
      {error ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface TabItem {
  value: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  selected: string
  onChange: (value: string) => void
}

export function Tabs({ items, selected, onChange }: TabsProps) {
  const { theme } = useTheme()

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((item) => {
        const active = item.value === selected
        return (
          <TouchableOpacity
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{
              flex: 1,
              padding: 12,
              borderWidth: 1,
              borderRadius: 14,
              borderColor: active ? theme.brand.solid : theme.border.default,
              backgroundColor: active ? theme.brand.subtle : theme.background.surface,
            }}
          >
            <Text style={{ color: active ? theme.brand.solid : theme.text.primary, textAlign: 'center', fontWeight: '600', fontSize: 13 }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

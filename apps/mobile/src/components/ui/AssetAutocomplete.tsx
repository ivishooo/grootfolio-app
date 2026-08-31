import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import type { AssetSearchResult, AssetType } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import { useAssetSearch } from '@/lib/queries'

interface AssetAutocompleteProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Se dispara al elegir un resultado de la lista. */
  onSelect: (result: AssetSearchResult) => void
  /** Filtra la busqueda por tipo (el del tab activo). */
  type?: AssetType
  placeholder?: string
  error?: string
}

/**
 * Espejo mobile del autocomplete de web (GF-248). Input con debounce de 250ms y
 * una lista de resultados desplegada debajo; al tocar uno, el padre recibe el
 * activo completo. Sin FlatList: son <= 10 items, alcanza con map.
 */
export function AssetAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  type,
  placeholder,
  error,
}: AssetAutocompleteProps) {
  const { theme } = useTheme()
  const [debounced, setDebounced] = useState(value)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250)
    return () => clearTimeout(t)
  }, [value])

  const { data: results = [], isFetching } = useAssetSearch(debounced, type)
  const showList = open && debounced.trim().length >= 2 && results.length > 0

  const choose = (r: AssetSearchResult) => {
    onSelect(r)
    setOpen(false)
  }

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.text.placeholder}
        value={value}
        onChangeText={(v) => {
          onChange(v)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          padding: 12,
          borderRadius: 10,
          // Ver FormField: el relleno gris hundia el contraste del placeholder.
          backgroundColor: theme.background.surface,
          color: theme.text.primary,
          borderWidth: 1,
          borderColor: error ? theme.danger.solid : theme.border.strong,
        }}
      />
      {showList && (
        <View
          style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: theme.background.surface,
            overflow: 'hidden',
          }}
        >
          {results.map((r, i) => (
            <TouchableOpacity
              key={`${r.type}:${r.symbol}`}
              onPress={() => choose(r)}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border.default,
              }}
            >
              <Text style={{ color: theme.text.primary, flexShrink: 1 }} numberOfLines={1}>
                <Text style={{ fontWeight: '600' }}>{r.name}</Text>
                <Text style={{ color: theme.text.secondary }}>  {r.symbol}</Text>
              </Text>
              <Text style={{ color: theme.text.muted, fontSize: 12 }}>{r.currency}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {isFetching && open && debounced.trim().length >= 2 ? (
        <Text style={{ color: theme.text.muted, fontSize: 12 }}>Buscando…</Text>
      ) : null}
      {error ? <Text style={{ color: theme.danger.solid, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

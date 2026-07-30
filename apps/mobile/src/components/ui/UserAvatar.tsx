/**
 * Avatar de usuario (F7). Foto si hay `avatarUrl`; si no, círculo violeta con
 * iniciales. Espejo del de web/admin.
 */
import { Image, Text, View } from 'react-native'

const VIOLET = '#8B5CF6'

function initials(name: string | null, email: string): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || base[0]!.toUpperCase()
}

export function UserAvatar({
  user,
  size = 44,
}: {
  user: { fullName: string | null; email: string; avatarUrl: string | null }
  size?: number
}) {
  if (user.avatarUrl) {
    return <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.round(size * 0.4) }}>{initials(user.fullName, user.email)}</Text>
    </View>
  )
}

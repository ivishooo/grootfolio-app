/**
 * Avatar de activo (mobile) — espejo de web. Usa el logo real (`asset.iconUrl`)
 * si existe; si no, un círculo con el color del tipo y las iniciales/glyph.
 */
import { View, Text, Image } from 'react-native'
import type { Asset } from '@grootfolio/shared'
import { assetColor, assetMark } from '@/lib/asset-visual'

interface AssetAvatarProps {
  asset: Pick<Asset, 'symbol' | 'name' | 'type' | 'iconUrl'>
  size?: number
}

export function AssetAvatar({ asset, size = 44 }: AssetAvatarProps) {
  const { accent } = assetColor(asset.type)

  if (asset.iconUrl) {
    return (
      <Image
        source={{ uri: asset.iconUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.round(size * 0.38) }}>
        {assetMark(asset)}
      </Text>
    </View>
  )
}

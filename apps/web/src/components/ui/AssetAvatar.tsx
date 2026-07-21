/**
 * Avatar de activo: usa el logo real (`asset.iconUrl`) si existe; si no, un
 * círculo con el color del tipo y las iniciales/glyph del activo.
 */
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
      <img
        src={asset.iconUrl}
        alt={asset.name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: accent, fontSize: Math.round(size * 0.38) }}
    >
      {assetMark(asset)}
    </span>
  )
}

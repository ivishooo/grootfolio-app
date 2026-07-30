/**
 * Serialización de ContentItem al shape del contrato compartido (F3/F4).
 */
import type { HttpContext } from '@adonisjs/core/http'
import type ContentItem from '#models/content_item'
import { publicUrl } from '#services/content_storage'

export function itemUrl(ctx: HttpContext, item: ContentItem): string | null {
  if (item.type === 'link') return item.externalUrl
  return item.storageKey ? publicUrl(ctx, item.storageKey) : null
}

export function serializeContentItem(
  ctx: HttpContext,
  item: ContentItem,
  opts: { isNew?: boolean; sectionName?: string } = {}
) {
  return {
    id: item.id,
    sectionId: item.sectionId,
    sectionName: opts.sectionName ?? item.section?.name ?? '',
    type: item.type,
    title: item.title,
    description: item.description,
    url: itemUrl(ctx, item),
    sizeBytes: item.sizeBytes,
    durationSeconds: item.durationSeconds,
    status: item.status,
    pinned: item.pinned,
    viewsCount: item.viewsCount,
    publishedAt: item.publishedAt?.toISO() ?? null,
    isNew: opts.isNew ?? false,
  }
}

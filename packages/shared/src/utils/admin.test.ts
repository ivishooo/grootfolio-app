import { describe, it, expect } from 'vitest'
import { contentTypeLabels, formatFileSize, formatDuration, suspensionLabel } from './index'
import { suspendUserInputSchema, createContentItemInputSchema } from '../schemas'

describe('formatFileSize', () => {
  it('formatea por unidad', () => {
    expect(formatFileSize(0)).toBe('—')
    expect(formatFileSize(null)).toBe('—')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB')
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2,4 MB')
  })
})

describe('formatDuration', () => {
  it('m:ss y h:mm:ss', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(75)).toBe('1:15')
    expect(formatDuration(3661)).toBe('1:01:01')
  })
})

describe('suspensionLabel', () => {
  it('presets e indefinida', () => {
    expect(suspensionLabel('24h')).toBe('por 24 horas')
    expect(suspensionLabel('7d')).toBe('por 7 días')
    expect(suspensionLabel('forever')).toBe('indefinidamente')
  })
  it('custom con fecha', () => {
    expect(suspensionLabel('custom', '2026-08-05T00:00:00.000Z')).toContain('hasta')
  })
})

describe('contentTypeLabels', () => {
  it('tiene las 4 etiquetas', () => {
    expect(contentTypeLabels).toEqual({ doc: 'Documento', video: 'Video', image: 'Imagen', link: 'Enlace' })
  })
})

describe('suspendUserInputSchema', () => {
  it('motivo obligatorio (min 5)', () => {
    expect(suspendUserInputSchema.safeParse({ duration: '7d', reason: 'x' }).success).toBe(false)
    expect(suspendUserInputSchema.safeParse({ duration: '7d', reason: 'Motivo válido' }).success).toBe(true)
  })
  it('until requerido si duration=custom', () => {
    expect(suspendUserInputSchema.safeParse({ duration: 'custom', reason: 'Motivo válido' }).success).toBe(false)
    expect(
      suspendUserInputSchema.safeParse({ duration: 'custom', until: '2026-08-05T00:00:00.000Z', reason: 'Motivo válido' }).success
    ).toBe(true)
  })
})

describe('createContentItemInputSchema', () => {
  it('externalUrl requerido si type=link', () => {
    expect(createContentItemInputSchema.safeParse({ type: 'link', title: 'GC', sectionId: crypto.randomUUID() }).success).toBe(false)
    expect(
      createContentItemInputSchema.safeParse({ type: 'link', title: 'GC', sectionId: crypto.randomUUID(), externalUrl: 'https://x.com' }).success
    ).toBe(true)
  })
})

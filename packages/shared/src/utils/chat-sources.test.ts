import { describe, it, expect } from 'vitest'
import { groupSourcesByArticle } from './index'

const source = (
  articleId: string,
  heading: string | null,
  score: number,
  title = `Artículo ${articleId}`
) => ({ articleId, title, slug: `slug-${articleId}`, heading, score })

describe('groupSourcesByArticle', () => {
  it('junta los fragmentos de un mismo artículo en una sola fuente', () => {
    const grouped = groupSourcesByArticle([
      source('a', 'Qué información tiene un holding', 0.78),
      source('a', 'Qué pasa cuando vendés', 0.74),
      source('a', 'Holdings sin precio disponible', 0.71),
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0]!.headings).toEqual([
      'Qué información tiene un holding',
      'Qué pasa cuando vendés',
      'Holdings sin precio disponible',
    ])
  })

  it('se queda con el mejor score del artículo', () => {
    const grouped = groupSourcesByArticle([source('a', 'X', 0.71), source('a', 'Y', 0.83)])
    expect(grouped[0]!.score).toBe(0.83)
  })

  it('ordena los artículos por su mejor score', () => {
    const grouped = groupSourcesByArticle([
      source('a', 'X', 0.70),
      source('b', 'Y', 0.85),
      source('a', 'Z', 0.72),
    ])
    expect(grouped.map((g) => g.articleId)).toEqual(['b', 'a'])
  })

  it('no repite secciones ni guarda las vacías', () => {
    const grouped = groupSourcesByArticle([
      source('a', 'X', 0.80),
      source('a', 'X', 0.75),
      source('a', null, 0.70),
    ])
    expect(grouped[0]!.headings).toEqual(['X'])
  })

  it('devuelve lista vacía sin fuentes', () => {
    expect(groupSourcesByArticle([])).toEqual([])
  })
})

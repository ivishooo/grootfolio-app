/**
 * Render de markdown acotado (F5). Cubre lo que realmente aparece en el
 * proyecto: los artículos de la base de conocimiento y las respuestas del bot
 * (al que el system prompt ya le pide texto simple, sin encabezados).
 *
 * Sin librería a propósito: `react-markdown` arrastra remark/unified y sería la
 * única dependencia de render que tendríamos, para un subconjunto chico y
 * conocido. Si en algún momento la KB necesita tablas, imágenes o HTML
 * embebido, se reemplaza este componente por react-markdown y no hay que tocar
 * nada más — es el único lugar que renderiza markdown.
 *
 * Soporta: encabezados (#..###), párrafos, listas con viñeta y numeradas,
 * bloques de código, `código inline`, **negrita**, *itálica* y [links](url).
 */
import { Fragment, type ReactNode } from 'react'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string }

/** Sólo http(s) y rutas internas: evita `javascript:` y demás esquemas raros. */
function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|\/)/i.test(href.trim())
}

/** Marcas inline: código, negrita, itálica y links. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${i++}`

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.9em] dark:bg-neutral-800">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const [, label = '', href = ''] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? []
      nodes.push(
        isSafeHref(href) ? (
          <a
            key={key}
            href={href}
            target={href.startsWith('/') ? undefined : '_blank'}
            rel="noreferrer"
            className="text-brand-600 underline hover:no-underline dark:text-brand-400"
          >
            {label}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        )
      )
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let code: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ...list })
    list = null
  }

  for (const line of lines) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      if (code) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else {
        flushParagraph()
        flushList()
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' })
      continue
    }

    const bullet = line.match(/^\s{0,3}[-*+]\s+(.*)$/)
    const numbered = line.match(/^\s{0,3}\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = !!numbered
      const text = (bullet?.[1] ?? numbered?.[1] ?? '').trim()
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(text)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  if (code) blocks.push({ kind: 'code', text: code.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-lg font-semibold',
  2: 'text-base font-semibold',
  3: 'text-sm font-semibold',
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = parseBlocks(source)

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, index) => {
        const key = `b${index}`
        if (block.kind === 'heading') {
          const Tag = (block.level <= 3 ? `h${block.level + 2}` : 'h6') as 'h3' | 'h4' | 'h5' | 'h6'
          return (
            <Tag key={key} className={`${HEADING_CLASS[block.level] ?? 'text-sm font-semibold'} mt-3 first:mt-0`}>
              {renderInline(block.text, key)}
            </Tag>
          )
        }
        if (block.kind === 'code') {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs dark:bg-neutral-800"
            >
              <code>{block.text}</code>
            </pre>
          )
        }
        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag
              key={key}
              className={`ml-5 space-y-1 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
              ))}
            </ListTag>
          )
        }
        return <p key={key}>{renderInline(block.text, key)}</p>
      })}
    </div>
  )
}

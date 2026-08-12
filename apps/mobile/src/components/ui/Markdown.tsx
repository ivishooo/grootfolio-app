/**
 * Render de markdown acotado para React Native (F6). Espejo del componente
 * homónimo de la web: cubre lo que realmente aparece en el proyecto (artículos
 * de la KB y respuestas del bot) sin sumar dependencias.
 *
 * En RN la decisión pesa más que en web: las librerías de markdown para React
 * Native son de mantenimiento despareja y varias arrastran WebView. Acá se
 * resuelve con `<Text>` anidados, que es lo idiomático de la plataforma.
 *
 * Soporta: encabezados, párrafos, listas con viñeta y numeradas, bloques de
 * código, `código inline`, **negrita**, *itálica* y [links](url).
 */
import { Fragment } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string }

/** Sólo http(s): evita esquemas raros al abrir un link externo. */
function isSafeHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim())
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

/** Marcas inline como `<Text>` anidados (lo idiomático en RN). */
function Inline({ text, color, link }: { text: string; color: string; link: string }) {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    const key = `i${i++}`

    if (token.startsWith('`')) {
      nodes.push(
        <Text key={key} style={styles.code}>
          {token.slice(1, -1)}
        </Text>
      )
    } else if (token.startsWith('**')) {
      nodes.push(
        <Text key={key} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>
      )
    } else if (token.startsWith('[')) {
      const [, label = '', href = ''] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? []
      nodes.push(
        isSafeHref(href) ? (
          <Text key={key} style={[styles.link, { color: link }]} onPress={() => void Linking.openURL(href)}>
            {label}
          </Text>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        )
      )
    } else {
      nodes.push(
        <Text key={key} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>
      )
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return <Text style={{ color }}>{nodes}</Text>
}

export function Markdown({ source, color }: { source: string; color?: string }) {
  const { theme } = useTheme()
  const textColor = color ?? theme.text.primary
  const blocks = parseBlocks(source)

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, index) => {
        const key = `b${index}`
        if (block.kind === 'heading') {
          return (
            <Text key={key} style={[styles.heading, { color: textColor, fontSize: block.level <= 2 ? 15 : 14 }]}>
              {block.text}
            </Text>
          )
        }
        if (block.kind === 'code') {
          return (
            <View key={key} style={[styles.codeBlock, { backgroundColor: theme.background.muted }]}>
              <Text style={[styles.code, { color: textColor }]}>{block.text}</Text>
            </View>
          )
        }
        if (block.kind === 'list') {
          return (
            <View key={key} style={{ gap: 4 }}>
              {block.items.map((item, i) => (
                <View key={`${key}-${i}`} style={styles.listRow}>
                  <Text style={[styles.bullet, { color: textColor }]}>
                    {block.ordered ? `${i + 1}.` : '•'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Inline text={item} color={textColor} link={theme.brand.solid} />
                  </View>
                </View>
              ))}
            </View>
          )
        }
        return <Inline key={key} text={block.text} color={textColor} link={theme.brand.solid} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  heading: { fontWeight: '700' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
  code: { fontFamily: 'Courier', fontSize: 13 },
  codeBlock: { borderRadius: 8, padding: 10 },
  listRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bullet: { width: 18 },
})

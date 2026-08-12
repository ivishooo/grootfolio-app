/**
 * Asistente de GrootFolio (F5). Burbuja flotante disponible en toda la app: el
 * bot resuelve dudas *mientras* se usa la aplicación, así que mandarlo a una
 * pantalla aparte rompería el caso de uso.
 *
 * Dos cosas que la UI tiene que dejar claras, y no son cosméticas:
 *  - Cuando el bot NO respondió con respaldo documental (`grounded: false`) no
 *    se muestran fuentes. Mostrar citas debajo de un "no sé" es peor que no
 *    mostrar ninguna.
 *  - Las citas indican de qué artículo y sección salió la respuesta, para que
 *    el usuario pueda ir a leer el original.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChatMessage } from '@grootfolio/shared'
import { useChatMessages, useSendChatMessage } from '@/lib/queries'
import { Markdown } from '@/components/ui/Markdown'

const SUGERENCIAS = [
  '¿Cómo cargo una transacción?',
  '¿Qué es el P&L no realizado?',
  '¿Para qué sirve diversificar?',
]

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  )
}

/** Fuentes que respaldaron la respuesta, con enlace al artículo. */
function Sources({ message }: { message: ChatMessage }) {
  if (!message.grounded || message.sources.length === 0) return null
  return (
    <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Fuentes</p>
      <ul className="space-y-0.5">
        {message.sources.map((source) => (
          <li key={`${source.articleId}-${source.heading ?? ''}`} className="text-xs">
            <Link
              to={`/content?kb=${source.slug}`}
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              {source.title}
              {source.heading ? ` › ${source.heading}` : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          mine
            ? 'bg-brand-500 text-white'
            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
        }`}
      >
        {mine ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <>
            <Markdown source={message.content} />
            <Sources message={message} />
          </>
        )}
      </div>
    </div>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: messages = [] } = useChatMessages(open ? conversationId : null)
  const send = useSendChatMessage()
  const scrollRef = useRef<HTMLDivElement>(null)
  /**
   * La pregunta recién enviada, para mostrarla mientras el bot responde. El
   * historial viene del servidor y tarda; sin esto el mensaje del usuario
   * desaparece de la pantalla hasta que llega la respuesta.
   */
  const [pending, setPending] = useState<string | null>(null)

  // Autoscroll al último mensaje (incluye el "pensando…").
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, send.isPending, pending, open])

  const ask = async (text: string) => {
    const message = text.trim()
    if (!message || send.isPending) return
    setDraft('')
    setError(null)
    setPending(message)
    try {
      const answer = await send.mutateAsync({
        message,
        ...(conversationId ? { conversationId } : {}),
      })
      setConversationId(answer.conversationId)
    } catch (err) {
      const code = (err as { code?: string })?.code
      setError(
        code === 'CHAT_RATE_LIMITED'
          ? 'Llegaste al límite de consultas por hora. Probá de nuevo más tarde.'
          : code === 'AI_UNAVAILABLE'
            ? 'El asistente no está disponible en este entorno.'
            : 'No pude responder ahora mismo. Intentá de nuevo en un rato.'
      )
      setDraft(message)
    } finally {
      setPending(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir el asistente"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-600"
      >
        <ChatIcon />
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[min(600px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div>
          <p className="text-sm font-semibold">Asistente</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Responde sobre GrootFolio e inversiones
          </p>
        </div>
        <div className="flex items-center gap-1">
          {conversationId && (
            <button
              onClick={() => {
                setConversationId(null)
                setError(null)
              }}
              className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Nueva
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar el asistente"
            className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !send.isPending && !pending && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Preguntame sobre cómo usar GrootFolio o sobre los temas de inversión que documentamos.
              Si algo no está documentado, te lo voy a decir en vez de inventarlo.
            </p>
            <div className="space-y-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => void ask(s)}
                  className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}

        {pending && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl bg-brand-500 px-3 py-2 text-sm text-white opacity-70">
              <p className="whitespace-pre-wrap">{pending}</p>
            </div>
          </div>
        )}

        {send.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800">
              Pensando…
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(draft)
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí tu consulta…"
          maxLength={1000}
          className="h-10 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={!draft.trim() || send.isPending}
          className="rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}

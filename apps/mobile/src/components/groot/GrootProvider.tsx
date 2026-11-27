/**
 * Estado de Groot (rediseño v2, ADR-0006): si la burbuja está abierta, en qué
 * modo, cuántas veces lo tocaron y qué mensaje de ánimo toca. Lo usan la
 * burbuja (`Groot`), Configuración («Mostrar a Groot») y las pantallas que
 * disparan eventos (`decir('cargado')` al guardar, `decir('perfil')` al
 * terminar el test).
 *
 * Persistencia por usuario en SecureStore (en web, localStorage):
 * - `gf_groot_closed_<id>`: el día (YYYY-MM-DD) en que el usuario cerró la
 *   burbuja. Ese día no se vuelve a abrir sola al entrar a Inicio.
 * - `gf_groot_show_<id>`: el switch de Configuración.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { animoIndexFor, grootDayKey, type GrootMode } from '@grootfolio/shared'
import * as SecureStore from 'expo-secure-store'
import { useAuth } from '@/auth/AuthProvider'

export interface GrootLastTx {
  qty: string
  symbol: string
}

interface GrootContextValue {
  /** Switch «Mostrar a Groot» de Configuración. */
  visible: boolean
  setVisible: (v: boolean) => void
  open: boolean
  mode: GrootMode
  pets: number
  animoIdx: number
  lastTx: GrootLastTx | null
  /** Evento de la app (cargar, terminar el test): cambia el modo y abre la burbuja. */
  decir: (mode: GrootMode, opts?: { morder?: boolean; lastTx?: GrootLastTx }) => void
  /** La pantalla cambió: modo de esa pantalla y, si corresponde, abrir sola. */
  pantalla: (mode: GrootMode, autoOpen: boolean) => void
  /** Tocar a Groot: otro mensaje de ánimo, con parpadeo lento y «prrr». */
  tocar: () => void
  cerrar: () => void
}

const HOLD_MS = 1500

const GrootContext = createContext<GrootContextValue | null>(null)

const write = (key: string, value: string) => {
  SecureStore.setItemAsync(key, value).catch(() => {})
}

export function GrootProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.id ?? 'anon'
  const closedKey = `gf_groot_closed_${uid}`
  const showKey = `gf_groot_show_${uid}`

  const [visible, setVisibleState] = useState(true)
  /** Día en que el usuario cerró la burbuja (leído de SecureStore al arrancar). */
  const closedOn = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<GrootMode>('resumen')
  const [pets, setPets] = useState(0)
  const [animoIdx, setAnimoIdx] = useState(() => animoIndexFor(new Date()))
  const [lastTx, setLastTx] = useState<GrootLastTx | null>(null)
  /**
   * Un evento (por ej. «¡anotado!») suele venir seguido de una navegación (a
   * Inicio). Durante un momento el modo de la pantalla nueva no pisa el del
   * evento. Es una ventana de tiempo y no un flag: si la navegación no cambia
   * de pantalla, un flag quedaría colgado y se comería el próximo cambio.
   */
  const holdUntil = useRef(0)

  // Al cambiar de usuario, releer sus preferencias.
  useEffect(() => {
    SecureStore.getItemAsync(showKey)
      .then((v) => setVisibleState(v !== 'false'))
      .catch(() => {})
    SecureStore.getItemAsync(closedKey)
      .then((v) => {
        closedOn.current = v
      })
      .catch(() => {})
  }, [showKey, closedKey])

  const closedToday = useCallback(() => closedOn.current === grootDayKey(new Date()), [])

  const setVisible = useCallback(
    (v: boolean) => {
      setVisibleState(v)
      write(showKey, String(v))
    },
    [showKey],
  )

  const decir = useCallback<GrootContextValue['decir']>((next, opts) => {
    setMode(next)
    if (opts?.lastTx) setLastTx(opts.lastTx)
    if (opts?.morder) setPets((p) => p + 1)
    setOpen(true)
    holdUntil.current = Date.now() + HOLD_MS
  }, [])

  const pantalla = useCallback<GrootContextValue['pantalla']>(
    (next, autoOpen) => {
      if (Date.now() < holdUntil.current) return
      setMode(next)
      if (autoOpen && !closedToday()) setOpen(true)
    },
    [closedToday],
  )

  const modeRef = useRef(mode)
  modeRef.current = mode

  const tocar = useCallback(() => {
    setPets((p) => p + 1)
    // El primer toque muestra el ánimo del día; los siguientes rotan.
    if (modeRef.current === 'animo') setAnimoIdx((i) => i + 1)
    setMode('animo')
    setOpen(true)
  }, [])

  const cerrar = useCallback(() => {
    setOpen(false)
    closedOn.current = grootDayKey(new Date())
    write(closedKey, closedOn.current)
  }, [closedKey])

  const value = useMemo<GrootContextValue>(
    () => ({ visible, setVisible, open, mode, pets, animoIdx, lastTx, decir, pantalla, tocar, cerrar }),
    [visible, setVisible, open, mode, pets, animoIdx, lastTx, decir, pantalla, tocar, cerrar],
  )

  return <GrootContext.Provider value={value}>{children}</GrootContext.Provider>
}

export function useGroot() {
  const ctx = useContext(GrootContext)
  if (!ctx) throw new Error('useGroot debe usarse dentro de <GrootProvider>')
  return ctx
}

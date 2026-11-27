/**
 * Layout de Login y Registro (rediseño v2, Fase 6). SPEC-pantallas › Login.
 *
 * - Web (≥ 768): dos columnas iguales. A la izquierda, el panel de marca con
 *   degradé naranja, el lockup blanco, Groot de 140 en un círculo de 150 y el
 *   claim. A la derecha, el formulario (máx. 380).
 * - Mobile web: una columna con Groot de 112 sobre `groot.ground` y el lockup.
 */
import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Logo'
import { GrootAvatar } from '@/components/groot/GrootAvatar'

export const AUTH_INPUT =
  'h-12 w-full rounded-[10px] border border-ctl bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-500 aria-[invalid=true]:border-neg'
export const AUTH_LABEL = 'grid gap-1.5 text-[13px] font-semibold'
export const AUTH_SUBMIT =
  'h-12 w-full rounded-[11px] bg-brand-500 text-[15px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas text-ink md:grid-cols-2">
      <aside
        className="hidden flex-col justify-between p-12 text-white md:flex"
        style={{ background: 'linear-gradient(160deg, #FB923C, #EA580C)' }}
      >
        <div className="flex items-center gap-2.5">
          <Logo variant="solid" size={34} />
          <span className="text-[22px] font-extrabold tracking-[-0.03em]">GrootFolio</span>
        </div>
        <div className="grid gap-[18px]">
          <div className="grid h-[150px] w-[150px] place-items-end overflow-hidden rounded-full bg-white/[.18]" style={{ placeItems: 'end center' }}>
            <GrootAvatar mood="calm" size={140} />
          </div>
          <h2 className="m-0 max-w-[420px] text-[34px] font-extrabold leading-[1.15] tracking-[-0.025em]">Todas tus inversiones, en un solo lugar.</h2>
          <p className="m-0 max-w-[400px] text-[15.5px] leading-normal opacity-95">
            Cripto, acciones, bonos y divisas. Groot te acompaña a entender cómo te va.
          </p>
        </div>
        <span className="text-xs opacity-85">Trabajo final · Análisis de Sistemas</span>
      </aside>

      <main className="grid place-items-center px-6 pb-10 pt-[72px] md:p-12">
        <div className="grid w-full max-w-[380px] gap-4">
          <div className="mb-1.5 grid justify-items-center gap-3 md:hidden">
            <div className="grid h-28 w-28 overflow-hidden rounded-full bg-groot-ground" style={{ placeItems: 'end center' }}>
              <GrootAvatar mood="calm" size={104} />
            </div>
            <Logo variant="lockup" size={30} />
          </div>
          <div>
            <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
            <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export function AuthField({
  label,
  error,
  optional,
  ...input
}: { label: string; error?: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={AUTH_LABEL}>
      <span>
        {label}
        {optional && <span className="font-normal text-ink-3"> · opcional</span>}
      </span>
      <input {...input} aria-invalid={error ? true : undefined} className={AUTH_INPUT} />
      {error && <span className="text-xs font-normal text-neg">{error}</span>}
    </label>
  )
}

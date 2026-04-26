/**
 * AddAssetPage - formulario de alta de transaccion.
 * Implementar segun Figma "03 - Add Asset - Desktop". Ver CLAUDE_CODE_PLAN.md Fase 3.
 */
import { useState } from 'react'
import type { AssetType } from '@grootfolio/shared'

const tabs: Array<{ id: AssetType; label: string; icon: string }> = [
  { id: 'crypto', label: 'Criptomonedas', icon: '₿' },
  { id: 'stock', label: 'Accion', icon: '↗' },
  { id: 'bond', label: 'Bono', icon: '🏛' },
  { id: 'currency', label: 'Divisa', icon: '$' },
]

export function AddAssetPage() {
  const [active, setActive] = useState<AssetType>('crypto')
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cargar Activo</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-2xl border p-6 text-center ${active === t.id ? 'border-brand-500 bg-brand-100 dark:bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-800'}`}
          >
            <div className="text-2xl">{t.icon}</div>
            <div className="mt-2 text-sm font-medium">{t.label}</div>
          </button>
        ))}
      </div>
      <form className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <input className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Ej: Bitcoin, Apple Inc..." />
        <select className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
          <option>Selecciona el tipo</option>
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="$0.00" />
          <input className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="$0.00" />
        </div>
        <input type="date" className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
        <textarea rows={3} placeholder="Agrega notas sobre esta inversion..." className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
        <div className="flex gap-3">
          <button type="button" className="flex-1 rounded-lg bg-brand-500 py-2 font-medium text-white hover:bg-brand-600">Guardar Activo</button>
          <button type="button" className="rounded-lg border border-neutral-300 px-6 dark:border-neutral-700">Cancelar</button>
        </div>
      </form>
      <div className="rounded-2xl bg-neutral-700 text-white p-5">
        <div className="font-semibold">💡 Consejos</div>
        <ul className="mt-2 list-disc pl-6 text-sm text-neutral-200 space-y-1">
          <li>Registra todos tus activos para tener un panorama completo</li>
          <li>Actualiza regularmente los precios de tus inversiones</li>
          <li>Diversifica tu portafolio entre diferentes tipos de activos</li>
          <li>Manten notas sobre el motivo de cada inversion</li>
        </ul>
      </div>
    </div>
  )
}

import React from 'react'
import { Truck } from 'lucide-react'

const KUD_COLORS = {
  A: 'kud-a',
  B: 'kud-b',
  C: 'kud-c',
  D: 'kud-d',
  E: 'kud-e',
}

const KUD_LABEL_COLORS = {
  A: 'bg-blue-50 text-blue-700 border-blue-200',
  B: 'bg-violet-50 text-violet-700 border-violet-200',
  C: 'bg-pink-50 text-pink-700 border-pink-200',
  D: 'bg-orange-50 text-orange-700 border-orange-200',
  E: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function VehicleBadge({ vehicle, size = 'md', showPosition = false }) {
  const isKud = vehicle.type === 1 || vehicle.type === 'KUD'
  const category = vehicle.kudCategory
  const categoryKey = typeof category === 'number' ? ['', 'MAKMUR JAYA', 'KARYA ABADI', 'BUDI CIPTA', 'INDAH BUANA', 'ABADA SATYA'][category] : category
  const sizeClassNames = {
    sm: 'px-3 py-2',
    md: 'px-3.5 py-3',
    lg: 'px-4 py-3.5',
  }

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl border border-slate-200 bg-white transition',
        sizeClassNames[size] ?? sizeClassNames.md,
      ].join(' ')}
    >
      {showPosition && (
        <span className="w-6 shrink-0 text-center font-mono text-xs text-slate-400">
          {vehicle.position}
        </span>
      )}

      <div
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
          isKud
            ? 'border-blue-100 bg-blue-50 text-blue-700'
            : 'border-amber-100 bg-amber-50 text-amber-700',
        ].join(' ')}
      >
        <Truck size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-semibold tracking-[0.06em] text-slate-900">
          {vehicle.plateNumber}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-400">
          {isKud ? `KUD priority ${categoryKey}` : 'INTI fifo lane'}
        </p>
      </div>

      {isKud ? (
        <span className={`badge-kud ${KUD_COLORS[categoryKey] ?? 'bg-slate-100 text-slate-700'}`}>
          {categoryKey}
        </span>
      ) : (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
          INTI
        </span>
      )}
    </div>
  )
}

export { KUD_LABEL_COLORS, KUD_COLORS }
import React from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

const STYLES = {
  success: {
    className: 'border-emerald-200 bg-white text-emerald-700',
    icon: <CheckCircle2 size={16} className="text-emerald-600" />,
    chip: 'bg-emerald-50',
  },
  error: {
    className: 'border-rose-200 bg-white text-rose-700',
    icon: <XCircle size={16} className="text-rose-600" />,
    chip: 'bg-rose-50',
  },
  info: {
    className: 'border-blue-200 bg-white text-blue-700',
    icon: <Info size={16} className="text-blue-600" />,
    chip: 'bg-blue-50',
  },
}

export function Toast({ toast }) {
  if (!toast) return null

  const style = STYLES[toast.type] ?? STYLES.info

  return (
    <div
      key={toast.id}
      className={[
        'fixed bottom-5 right-5 z-50 flex max-w-[360px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_38px_rgba(15,23,42,0.12)] animate-slide-in',
        style.className,
      ].join(' ')}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
        {style.icon}
      </div>
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em]">
          {toast.type ?? 'info'}
        </p>
        <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
      </div>
    </div>
  )
}
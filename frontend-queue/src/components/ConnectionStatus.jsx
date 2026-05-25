import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionStatus({ connected, compact = false }) {
  return (
    <div
      className={[
        'status-chip',
        connected
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-rose-200 bg-rose-50 text-rose-700',
        compact ? 'min-w-[158px] justify-center' : '',
      ].join(' ')}
    >
      <span className={`status-dot ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{connected ? 'Connected' : 'Offline'}</span>
    </div>
  )
}
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Clock3 } from 'lucide-react'
import { VehicleBadge } from './VehicleCard'

export function WaitingQueue({ waitingQueue }) {
  const [expanded, setExpanded] = useState(true)
  const maxVisible = 8
  const collapsedVisible = 4
  const visible = expanded
    ? waitingQueue.slice(0, maxVisible)
    : waitingQueue.slice(0, collapsedVisible)
  const hasMore = waitingQueue.length > maxVisible
  const hasToggle = waitingQueue.length > collapsedVisible

  return (
    <div className="panel panel-accent-violet flex h-full min-h-[468px] flex-col">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Waiting Queue</p>
          <h2 className="panel-heading">Queue Buffer</h2>
        </div>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
          {waitingQueue.length} Unit
        </span>
      </div>

      <div className="panel-body flex flex-1 flex-col">
        {waitingQueue.length === 0 ? (
          <div className="empty-state flex flex-1 flex-col items-center justify-center px-4 text-center">
            <Clock3 size={28} className="text-violet-300" />
            <p className="mt-3 font-display text-lg font-bold uppercase tracking-[0.12em] text-slate-800">
              Buffer kosong
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Kendaraan baru akan muncul di sini sebelum masuk ke ramp.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex-1 space-y-2 overflow-auto pr-1">
              {visible.map((vehicle, index) => (
                <div key={vehicle.id} className="summary-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
                      <span className="font-display text-sm font-bold uppercase tracking-[0.1em]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex-1">
                      <VehicleBadge vehicle={vehicle} size="sm" />
                    </div>

                    <div className="text-right">
                      <p className="summary-label">Masuk</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {formatTime(vehicle.entryTime ?? vehicle.EntryTime)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasToggle && (
              <button onClick={() => setExpanded(!expanded)} className="btn-secondary w-full">
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded ? 'Ringkas' : `Tampilkan ${Math.min(waitingQueue.length, maxVisible)}`}
              </button>
            )}

            {hasMore && expanded && (
              <p className="text-center text-xs uppercase tracking-[0.12em] text-slate-400">
                Menampilkan {maxVisible} dari {waitingQueue.length} unit.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return '--:--:--'
  const date = new Date(iso)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

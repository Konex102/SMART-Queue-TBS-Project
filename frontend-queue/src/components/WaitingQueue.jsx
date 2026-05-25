import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Clock3, Timer } from 'lucide-react'
import { VehicleBadge } from './VehicleCard'

const LINE_CAPACITY = 3

function estimateSecondsToRamp(waitingIndex, rampLineA, rampLineB, slotTimers, dwellSeconds) {
  const occupiedRamp = [...rampLineA, ...rampLineB].filter(Boolean)
  const totalRamp = occupiedRamp.length
  const totalCapacity = LINE_CAPACITY * 2
  const emptySlots = totalCapacity - totalRamp

  if (waitingIndex < emptySlots) return 0
  
  const remainingTimes = occupiedRamp
    .map(v => slotTimers[v.id] ?? null)
    .filter(s => s !== null)
    .sort((a, b) => a - b)

  if (remainingTimes.length === 0) return null
  
  const slotIndexNeeded = waitingIndex - emptySlots
  
  if (slotIndexNeeded < remainingTimes.length) {
    return remainingTimes[slotIndexNeeded]
  }
  
  const lastKnown = remainingTimes[remainingTimes.length - 1]
  const extraRounds = slotIndexNeeded - remainingTimes.length + 1
  return lastKnown + extraRounds * dwellSeconds
}

function fmtCountdown(seconds) {
  if (seconds === null || seconds === undefined) return '--:--'
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

export function WaitingQueue({
  waitingQueue,
  slotTimers = {},
  dwellSeconds = 20,
  rampLineA = [],
  rampLineB = [],
  isAutoMode = true,
}) {
  const [expanded, setExpanded] = useState(true)
  // Tick setiap detik agar countdown ikut bergerak
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const maxVisible = 8
  const collapsedVisible = 4
  const visible = expanded
    ? waitingQueue.slice(0, maxVisible)
    : waitingQueue.slice(0, collapsedVisible)
  const hasMore = waitingQueue.length > maxVisible
  const hasToggle = waitingQueue.length > collapsedVisible

  return (
    <div className="panel panel-accent-violet flex flex-col min-h-[240px]">
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
              EMPTY QUEUE
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex-1 overflow-auto pr-1">
              <div className="grid gap-2 grid-cols-2">
                {visible.map((vehicle, index) => {
                  const etaSeconds = isAutoMode
                    ? estimateSecondsToRamp(index, rampLineA, rampLineB, slotTimers, dwellSeconds)
                    : null
                  const isReady = etaSeconds !== null && etaSeconds <= 0

                  return (
                    <div
                      key={vehicle.id}
                      className={[
                        'summary-card p-2 transition-all duration-300',
                        isReady ? 'border-emerald-200 bg-emerald-50/50' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        {/* Nomor urut */}
                        <div className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                          isReady
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-violet-100 bg-violet-50 text-violet-700',
                        ].join(' ')}>
                          <span className="font-display text-xs font-bold uppercase tracking-[0.1em]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Badge kendaraan */}
                        <div className="flex-1 min-w-0">
                          <VehicleBadge vehicle={vehicle} size="sm" />
                        </div>

                        {/* Waktu masuk + ETA */}
                        <div className="text-right shrink-0">
                          <p className="summary-label">Masuk</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {formatTime(vehicle.entryTime ?? vehicle.EntryTime)}
                          </p>

                          {isAutoMode && (
                            <div className="mt-1.5">
                              <div className={[
                                'flex items-center justify-end gap-1',
                                isReady ? 'text-emerald-600' : 'text-violet-500',
                              ].join(' ')}>
                                <Timer size={10} />
                                <span className="text-[10px] uppercase tracking-[0.1em] font-semibold">
                                  {isReady ? 'Siap masuk' : 'Est. ramp'}
                                </span>
                              </div>
                              <p className={[
                                'font-mono text-sm font-bold tabular-nums',
                                isReady ? 'text-emerald-600' : 'text-violet-700',
                              ].join(' ')}>
                                {isReady ? '▶ NOW' : fmtCountdown(etaSeconds)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
import React from 'react'
import { ChevronRight, Clock, CheckCircle2, Zap } from 'lucide-react'
import { VehicleBadge } from './VehicleCard'

const LINE_CAPACITY = 3

export function RampDisplay({
  rampLineA = [],
  rampLineB = [],
  onServeNext,
  onServeById,
  loading,
  isAutoMode,
  slotTimers = {},
  dwellSeconds = 20,
}) {
  const totalOnRamp   = countOccupiedSlots(rampLineA) + countOccupiedSlots(rampLineB)
  const totalCapacity = LINE_CAPACITY * 2
  const fillPercent   = Math.round((totalOnRamp / totalCapacity) * 100)
  const nextVehicle   = rampLineA.find(Boolean) ?? rampLineB.find(Boolean)

  return (
    <div className="panel panel-accent-emerald">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">LOADING RAMP CONDITION</p>
          <h2 className="panel-heading">Ramp Activity</h2>
        </div>
      </div>

      <div className="panel-body space-y-4">
        {/* Ramp Lines */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RampLine
            label="Ramp Line A"
            accentClass="border-emerald-200 bg-emerald-50/40"
            badgeClass="border-emerald-200 bg-white text-emerald-700"
            slots={rampLineA}
            startIndex={0}
            isAutoMode={isAutoMode}
            slotTimers={slotTimers}
            dwellSeconds={dwellSeconds}
            onServeById={onServeById}
            loading={loading}
          />
          <RampLine
            label="Ramp Line B"
            accentClass="border-blue-200 bg-blue-50/40"
            badgeClass="border-blue-200 bg-white text-blue-700"
            slots={rampLineB}
            startIndex={LINE_CAPACITY}
            isAutoMode={isAutoMode}
            slotTimers={slotTimers}
            dwellSeconds={dwellSeconds}
            onServeById={onServeById}
            loading={loading}
          />
        </div>

        {/* Bottom info panel */}
        <div className={`grid gap-3 ${isAutoMode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        </div>
      </div>
    </div>
  )
}


function RampLine({ label, accentClass, badgeClass, slots, startIndex, isAutoMode, slotTimers, dwellSeconds, onServeById, loading }) {
  const slotsWithEmpties = Array.from({ length: LINE_CAPACITY }, (_, i) => slots[i] ?? null)
  const occupiedSlots = countOccupiedSlots(slots)

  return (
    <div className={`rounded-[0.95rem] border p-3 space-y-2 ${accentClass}`}>
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{label}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${badgeClass}`}>
          {occupiedSlots}/{LINE_CAPACITY}
        </span>
      </div>

      <div className="space-y-2">
        {slotsWithEmpties.map((vehicle, i) => (
          <RampSlot
            key={vehicle?.id ?? `empty-${startIndex + i}`}
            slotNumber={startIndex + i + 1}
            vehicle={vehicle}
            isAutoMode={isAutoMode}
            remainingSeconds={vehicle ? (slotTimers[vehicle.id] ?? null) : null}
            dwellSeconds={dwellSeconds}
            onServe={() => vehicle && onServeById(vehicle.id, vehicle.plateNumber)}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
}

function countOccupiedSlots(slots = []) {
  return slots.filter(Boolean).length
}


function RampSlot({ slotNumber, vehicle, isAutoMode, remainingSeconds, dwellSeconds, onServe, loading }) {
  const progress = (vehicle && remainingSeconds !== null && isAutoMode)
    ? Math.max(0, Math.min(1, 1 - remainingSeconds / dwellSeconds))
    : null

  const isUrgent  = isAutoMode && remainingSeconds !== null && remainingSeconds <= 5
  const isWarning = isAutoMode && remainingSeconds !== null && remainingSeconds <= 10 && remainingSeconds > 5

  const barColor = isUrgent
    ? 'linear-gradient(90deg,#f97316,#ef4444)'
    : isWarning
      ? 'linear-gradient(90deg,#f59e0b,#d97706)'
      : 'linear-gradient(90deg,#34d399,#059669)'

  const fmtTime = (s) =>
    s === null || s === undefined
      ? '--'
      : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={[
      'rounded-[0.75rem] border p-2.5 transition-all duration-300',
      vehicle
        ? isUrgent
          ? 'border-rose-300 bg-rose-50/60 shadow-sm shadow-rose-100'
          : isWarning
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-slate-200 bg-white'
        : 'border-dashed border-slate-200 bg-slate-50',
    ].join(' ')}>

      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <span className="summary-label">Ramp {String(slotNumber).padStart(2, '0')}</span>
        <span className={[
          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
          vehicle
            ? isUrgent
              ? 'border-rose-300 bg-rose-50 text-rose-600'
              : isWarning
                ? 'border-amber-200 bg-amber-50 text-yellow-600'
                : 'border-emerald-200 bg-emerald-50 text-green-700'
            : 'border-slate-200 bg-white text-slate-400',
        ].join(' ')}>
          {vehicle ? (isUrgent ? 'DONE' : isWarning ? 'Segera' : 'LOADING') : 'EMPTY'}
        </span>
      </div>

      {vehicle ? (
        <div className="mt-2 space-y-2">
          <VehicleBadge vehicle={vehicle} size="sm" />

          {isAutoMode && remainingSeconds !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Clock size={10} className={isUrgent ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'} />
                  <span className={`text-[10px] uppercase tracking-[0.1em] font-semibold ${isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-400'}`}>
                    Keluar dalam
                  </span>
                </div>
                <span className={`font-mono text-xs font-bold ${isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-600'}`}>
                  {fmtTime(remainingSeconds)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(progress ?? 0) * 100}%`, background: barColor }}
                />
              </div>
            </div>
          )}

          {/* MANUAL mode: CALLOUT button per slot */}
          {!isAutoMode && (
            <button
              onClick={onServe}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={12} />
              CALLOUT
            </button>
          )}
        </div>
      ) : (
        <div className="empty-state mt-2 flex h-[60px] items-center justify-center text-xs uppercase tracking-[0.12em]">
          EMPTY RAMP
        </div>
      )}
    </div>
  )
}
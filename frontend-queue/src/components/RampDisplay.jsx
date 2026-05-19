import React from 'react'
import { ChevronRight } from 'lucide-react'
import { VehicleBadge } from './VehicleCard'

const MAX_RAMP = 6

export function RampDisplay({ rampQueue, onServeNext, loading, isAutoMode }) {
  const slots = Array.from({ length: MAX_RAMP }, (_, index) => rampQueue[index] ?? null)
  const fillPercent = Math.round((rampQueue.length / MAX_RAMP) * 100)
  const nextVehicle = rampQueue[0]

  return (
    <div className="panel panel-accent-emerald">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Data Visualisation</p>
          <h2 className="panel-heading">Ramp Activity</h2>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
          {rampQueue.length}/{MAX_RAMP} Occupied
        </span>
      </div>

      <div className="panel-body">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="soft-block">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="summary-label">Ramp Load</p>
                  <p className="summary-value">{fillPercent}%</p>
                  <p className="summary-meta">Maksimum {MAX_RAMP} kendaraan aktif di ramp.</p>
                </div>

                <div className="w-full max-w-[280px]">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${fillPercent}%`,
                        background:
                          rampQueue.length >= MAX_RAMP
                            ? 'linear-gradient(90deg, #ef4444, #f97316)'
                            : rampQueue.length >= 4
                              ? 'linear-gradient(90deg, #059669, #10b981)'
                              : 'linear-gradient(90deg, #60a5fa, #1d4ed8)',
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    <span>Idle</span>
                    <span>Normal</span>
                    <span>Full</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {slots.map((vehicle, index) => (
                <RampSlot key={vehicle?.id ?? `empty-${index}`} index={index} vehicle={vehicle} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="summary-card border-emerald-100 bg-emerald-50/40">
              <p className="summary-label">Unit Berikutnya</p>
              <p className="summary-value text-[1.3rem]">
                {nextVehicle?.plateNumber ?? 'Standby'}
              </p>
              <p className="summary-meta">
                {nextVehicle
                  ? 'Bay 01 menjadi prioritas untuk pelayanan berikutnya.'
                  : 'Belum ada kendaraan di bay aktif.'}
              </p>
            </div>

            <div className="summary-card border-blue-100 bg-blue-50/40">
              <p className="summary-label">Transfer Mode</p>
              <p className="summary-value text-[1.3rem]">{isAutoMode ? 'AUTO' : 'MANUAL'}</p>
              <p className="summary-meta">
                {isAutoMode
                  ? 'Perpindahan unit dikendalikan sistem.'
                  : 'Perpindahan unit menunggu perintah operator.'}
              </p>
            </div>

            <button
              onClick={onServeNext}
              disabled={loading || rampQueue.length === 0}
              className="btn-primary w-full"
            >
              <ChevronRight size={16} />
              Layani Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RampSlot({ index, vehicle }) {
  const isLead = index === 0 && vehicle

  return (
    <div
      className={[
        'rounded-[0.95rem] border p-3 transition',
        vehicle
          ? isLead
            ? 'border-emerald-200 bg-emerald-50/55'
            : 'border-slate-200 bg-white'
          : 'border-dashed border-slate-200 bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="summary-label">Bay {String(index + 1).padStart(2, '0')}</span>
        <span
          className={[
            'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
            vehicle
              ? isLead
                ? 'border-emerald-200 bg-white text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
              : 'border-slate-200 bg-white text-slate-400',
          ].join(' ')}
        >
          {vehicle ? (isLead ? 'Active' : 'Queued') : 'Empty'}
        </span>
      </div>

      {vehicle ? (
        <div className="mt-3">
          <VehicleBadge vehicle={vehicle} size="md" />
        </div>
      ) : (
        <div className="empty-state mt-3 flex h-[84px] items-center justify-center text-xs uppercase tracking-[0.12em]">
          Empty slot
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { ArrowDown, CheckCircle2, History, RotateCcw, Settings, Zap } from 'lucide-react'
import { VehicleBadge } from './VehicleCard'

export function ControlPanel({ state, actions, loading }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const { isAutoMode, totalWaiting, totalOnRamp, totalServed, servedHistory } = state

  return (
    <div className="panel panel-accent-rose">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Control Panel</p>
          <h2 className="panel-heading">Operator Tools</h2>
        </div>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-rose-700">
          {isAutoMode ? 'Auto' : 'Manual'}
        </span>
      </div>

      <div className="panel-body space-y-5">
        <section>
          <p className="metric-label">QUEUE MODE</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {[
              {
                label: 'Auto',
                value: true,
                icon: <Zap size={16} />,
                activeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
              },
              {
                label: 'Manual',
                value: false,
                icon: <Settings size={16} />,
                activeClassName: 'border-violet-200 bg-violet-50 text-violet-700',
              },
            ].map((option) => {
              const isActive = isAutoMode === option.value

              return (
                <button
                  key={option.label}
                  onClick={() => actions.setMode(option.value)}
                  className={[
                    'rounded-xl border px-3 py-3 text-left transition',
                    isActive
                      ? option.activeClassName
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.12em]">
                    {option.icon}
                    {option.label}
                  </div>
                  <p className="mt-1 text-xs opacity-80">{option.detail}</p>
                </button>
              )
            })}
          </div>

          {!isAutoMode && (
            <button
              onClick={actions.moveToRamp}
              disabled={loading || totalWaiting === 0 || totalOnRamp >=6}
              className="btn-secondary mt-3 w-full"
            >
              <ArrowDown size={16} />
              MOVE TO LOADING RAMP
            </button>
          )}
        </section>

        <section>
          {!showClearConfirm ? (
            <>
              <button onClick={() => setShowClearConfirm(true)} className="btn-danger mt-1 w-full">
                RESET DATA
              </button>
            </>
          ) : (
            <div className="animate-fade-in">
              <p className="metric-label">Reset Confirmation</p>
              <p className="mt-2 text-sm text-slate-500">
                Data History Will Delete!
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button onClick={() => setShowClearConfirm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    actions.clearAll()
                    setShowClearConfirm(false)
                  }}
                  className="btn-danger"
                >
                  Yes, Reset Data
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50/50',
    amber: 'border-amber-100 bg-amber-50/60',
    emerald: 'border-emerald-100 bg-emerald-50/60',
  }

  return (
    <div className={`summary-card ${toneClasses[tone] ?? toneClasses.blue}`}>
      <p className="summary-label">{label}</p>
      <p className="summary-value text-[1.35rem]">{value}</p>
    </div>
  )
}
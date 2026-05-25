import React from 'react'
import { Activity, Clock3, Layers, Truck, Workflow } from 'lucide-react'
import { useQueue } from './hooks/useQueue'
import { AddVehicleForm } from './components/AddVehicleForm'
import { RampDisplay } from './components/RampDisplay'
import { WaitingQueue } from './components/WaitingQueue'
import { ControlPanel } from './components/ControlPanel'
import { Toast } from './components/Toast'
import { ConnectionStatus } from './components/ConnectionStatus'

const MAX_RAMP = 6

export default function App() {
  const { state, connected, loading, toast, actions, now, slotTimers, dwellSeconds } = useQueue()
  const rampUtilization = Math.round((state.rampQueue.length / MAX_RAMP) * 100)
  const clockStr = now ? now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '--:--:--'
  const dateStr = now ? now.toLocaleDateString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }) : ''

  return (
    <div className="dashboard-shell">
      <div className="mx-auto max-w-[1380px] space-y-4">
        <header className="panel hero-panel panel-accent-blue">
          <div className="panel-body space-y-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-[0_14px_28px_rgba(29,78,216,0.16)]">
                  <Layers size={28} />
                </div>
                <div className="hidden h-12 w-px bg-blue-200 sm:block" />
                <div>
                  <p className="panel-eyebrow">Dashboard</p>
                  <h1 className="hero-title">Smart Queue Monitor</h1>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[700px] xl:grid-cols-4">
                <ConnectionStatus connected={connected} compact />
                <StatusPill label="Mode" value={state.isAutoMode ? 'AUTO' : 'MANUAL'} tone="violet" />
                <div className="signal-chip border-slate-200 bg-slate-50 text-slate-700 col-span-2 flex-col items-start gap-0">
                  <span className="summary-label">Live Clock</span>
                  <span className="font-display text-sm font-bold tracking-[0.08em] text-slate-800">{clockStr}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-[0.1em]">{dateStr}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4">
          <div className="grid items-stretch gap-4 lg:grid-cols-1">
            <div className="panel panel-accent-blue text-sm">
              <div className="panel-header">
                <div>
                  <p className="panel-eyebrow">OVERVIEW</p>
                  <h2 className="panel-heading">Real-Time Status</h2>
                </div>
              </div>

              <div className="panel-body">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    icon={<Clock3 size={16} />}
                    label="WAITING"
                    value={state.totalWaiting}
                    tone="amber"
                  />
                  <SummaryCard
                    icon={<Activity size={16} />}
                    label="LOADING RAMP"
                    value={`${state.totalOnRamp}/${MAX_RAMP}`}
                    tone="emerald"
                  />
                  <SummaryCard
                    icon={<Workflow size={16} />}
                    label="DONE"
                    value={state.totalServed}
                    tone="blue"
                  />
                  <SummaryCard
                    icon={<Truck size={16} />}
                    label="RAMP CONDITION"
                    value={`${rampUtilization}%`}
                    tone="violet"
                  />
                </div>
              </div>
            </div>
          </div>

          <main className="dashboard-grid">
            <aside className="space-y-4 xl:col-span-3">
              <AddVehicleForm onAdd={actions.addVehicle} loading={loading} />
              <ControlPanel state={state} actions={actions} loading={loading} />
            </aside>

            <section className="space-y-4 xl:col-span-9">
              <WaitingQueue
                waitingQueue={state.waitingQueue}
                slotTimers={slotTimers}
                dwellSeconds={dwellSeconds}
                rampLineA={state.rampLineA}
                rampLineB={state.rampLineB}
                isAutoMode={state.isAutoMode}
              />

              <RampDisplay
                rampLineA={state.rampLineA}
                rampLineB={state.rampLineB}
                onServeNext={actions.serveNext}
                onServeById={actions.serveById}
                loading={loading}
                isAutoMode={state.isAutoMode}
                slotTimers={slotTimers}
                dwellSeconds={dwellSeconds}
              />
            </section>
          </main>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  )
}

function SummaryCard({ icon, label, value, detail, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50/50',
    amber: 'border-amber-100 bg-amber-50/60',
    emerald: 'border-emerald-100 bg-emerald-50/60',
    violet: 'border-violet-100 bg-violet-50/55',
  }

  const iconClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
  }

  return (
    <div className={`summary-card ${toneClasses[tone] ?? toneClasses.blue} p-2`}> 
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="summary-label">{label}</p>
          <p className="summary-value text-[1.05rem]">{value}</p>
          <p className="summary-meta">{detail}</p>
        </div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-xl border ${iconClasses[tone] ?? iconClasses.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ label, value, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`signal-chip ${toneClasses[tone] ?? toneClasses.blue}`}>
      <span className="summary-label">{label}</span>
      <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-800">
        {value}
      </span>
    </div>
  )
}

function InfoBlock({ title, detail, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-l-blue-600 bg-blue-50/35',
    amber: 'border-l-amber-500 bg-amber-50/35',
    violet: 'border-l-violet-500 bg-violet-50/35',
  }

  return (
    <div className={`info-block ${toneClasses[tone] ?? toneClasses.blue}`}>
      <p className="summary-label">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  )
}
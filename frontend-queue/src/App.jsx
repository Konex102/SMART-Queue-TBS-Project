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
  const { state, connected, loading, toast, actions } = useQueue()
  const rampUtilization = Math.round((state.rampQueue.length / MAX_RAMP) * 100)
  const pressure = getQueuePressure(state.totalWaiting)
  const lastSync = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())

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
                <StatusPill label="Last Sync" value={lastSync} tone="slate" />
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-grid">
          <aside className="space-y-4 xl:col-span-3">
            <AddVehicleForm onAdd={actions.addVehicle} loading={loading} />
            <ControlPanel state={state} actions={actions} loading={loading} />
          </aside>

          <section className="space-y-4 xl:col-span-9">
            <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <div className="panel panel-accent-blue flex h-full flex-col">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">QUEUE OVERVIEW</p>
                    <h2 className="panel-heading">Real-Time Queue Status</h2>
                  </div>
                  <span className="panel-pill">Live Summary</span>
                </div>

                <div className="panel-body flex flex-1 flex-col">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      icon={<Clock3 size={16} />}
                      label="Waiting"
                      value={state.totalWaiting}
                      detail="Kendaraan di buffer"
                      tone="amber"
                    />
                    <SummaryCard
                      icon={<Activity size={16} />}
                      label="Ramp"
                      value={`${state.totalOnRamp}/${MAX_RAMP}`}
                      detail="Unit aktif"
                      tone="emerald"
                    />
                    <SummaryCard
                      icon={<Workflow size={16} />}
                      label="Served"
                      value={state.totalServed}
                      detail="Sudah dilayani"
                      tone="blue"
                    />
                    <SummaryCard
                      icon={<Truck size={16} />}
                      label="Utilization"
                      value={`${rampUtilization}%`}
                      detail="Kapasitas ramp"
                      tone="violet"
                    />
                  </div>
                </div>
              </div>

              <WaitingQueue waitingQueue={state.waitingQueue} />
            </div>

            <RampDisplay
              rampQueue={state.rampQueue}
              onServeNext={actions.serveNext}
              loading={loading}
              isAutoMode={state.isAutoMode}
            />
          </section>
        </main>
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
    <div className={`summary-card ${toneClasses[tone] ?? toneClasses.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="summary-label">{label}</p>
          <p className="summary-value">{value}</p>
          <p className="summary-meta">{detail}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${iconClasses[tone] ?? iconClasses.blue}`}>
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

function getQueuePressure(totalWaiting) {
  if (totalWaiting >= 7) {
    return { label: 'HIGH', tone: 'rose' }
  }

  if (totalWaiting >= 4) {
    return { label: 'WATCH', tone: 'amber' }
  }

  return { label: 'STABLE', tone: 'blue' }
}

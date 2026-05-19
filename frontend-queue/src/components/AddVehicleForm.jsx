import React, { useState } from 'react'
import { Plus } from 'lucide-react'

const KUD_CATS = ['A', 'B', 'C', 'D', 'E']

const TYPE_OPTIONS = [
  {
    value: 'INTI',
    title: 'TBS INTI',
    detail: 'FIFO standar',
    activeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    value: 'KUD',
    title: 'TBS KUD',
    detail: 'Kategori A-E',
    activeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
]

const KUD_CAT_COLORS = {
  A: 'border-blue-300 bg-blue-50 text-blue-700',
  B: 'border-violet-300 bg-violet-50 text-violet-700',
  C: 'border-pink-300 bg-pink-50 text-pink-700',
  D: 'border-orange-300 bg-orange-50 text-orange-700',
  E: 'border-amber-300 bg-amber-50 text-amber-700',
}

export function AddVehicleForm({ onAdd, loading }) {
  const [plateNumber, setPlateNumber] = useState('')
  const [type, setType] = useState('INTI')
  const [kudCategory, setKudCategory] = useState('A')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!plateNumber.trim()) return

    await onAdd({
      plateNumber: plateNumber.trim(),
      type: type === 'INTI' ? 0 : 1,
      kudCategory: type === 'KUD' ? KUD_CATS.indexOf(kudCategory) + 1 : 0,
    })

    setPlateNumber('')
  }

  return (
    <div className="panel panel-accent-amber">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Data Upload</p>
          <h2 className="panel-heading">Tambah Kendaraan</h2>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
          Ready
        </span>
      </div>

      <form onSubmit={handleSubmit} className="panel-body space-y-4">
        <div>
          <label className="metric-label">Tipe kendaraan</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((option) => {
              const isActive = type === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={[
                    'rounded-xl border px-3 py-3 text-left transition',
                    isActive
                      ? option.activeClassName
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50',
                  ].join(' ')}
                >
                  <p className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                    {option.title}
                  </p>
                  <p className="mt-1 text-xs opacity-80">{option.detail}</p>
                </button>
              )
            })}
          </div>
        </div>

        {type === 'KUD' && (
          <div className="soft-block animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="metric-label">Kategori prioritas</p>
                <p className="mt-1 text-sm text-slate-500">Pilih kelas KUD.</p>
              </div>
              <span className="panel-pill">Class {kudCategory}</span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {KUD_CATS.map((category) => {
                const isActive = kudCategory === category

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setKudCategory(category)}
                    className={[
                      'rounded-lg border px-2 py-2 font-mono text-sm font-bold transition',
                      isActive
                        ? KUD_CAT_COLORS[category]
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50',
                    ].join(' ')}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="metric-label">Nomor plat</label>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={plateNumber}
              onChange={(event) => setPlateNumber(event.target.value.toUpperCase())}
              placeholder="Contoh: B 1234 ABC"
              className="input-field"
              maxLength={12}
              required
            />

            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Uppercase</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Max 12</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !plateNumber.trim()}
          className="btn-primary w-full"
        >
          <Plus size={16} />
          Masukkan Antrian
        </button>
      </form>
    </div>
  )
}

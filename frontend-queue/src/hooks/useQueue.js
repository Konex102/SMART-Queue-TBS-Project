import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { queueApi } from '../services/api'

const INITIAL_STATE = {
  waitingQueue:  [],
  rampQueue:     [],
  rampLineA:     [null, null, null],
  rampLineB:     [null, null, null],
  servedHistory: [],
  isAutoMode:    true,
  totalWaiting:  0,
  totalOnRamp:   0,
  totalServed:   0,
}

export function useQueue() {
  const [state, setState] = useState(INITIAL_STATE)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  // slotTimers: { [vehicleId]: remainingSeconds | null }
  const [slotTimers, setSlotTimers] = useState({})
  const [dwellSeconds, setDwellSeconds] = useState(20)
  const [now, setNow] = useState(new Date())
  const hubRef = useRef(null)

  // Real-Time Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Toast Helper
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // SignalR Connection
  useEffect(() => {
    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/queueHub')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('StateUpdate', (newState) => {
      const normalised = normalise(newState)
      setState(prev => {
        // detect new vehicles entering ramp
        const prevRampIds = new Set(
          [...(prev.rampLineA ?? []), ...(prev.rampLineB ?? [])]
            .filter(Boolean)
            .map(v => v.id)
        )
        const newRampVehicles = [
          ...(normalised.rampLineA ?? []),
          ...(normalised.rampLineB ?? []),
        ].filter(v => v && !prevRampIds.has(v.id))

        newRampVehicles.forEach(v => {
          showToast(`${v.plateNumber} masuk loading ramp 🚛`, 'info')
        })

        return normalised
      })
    })

    hub.on('TimerUpdate', (data) => {
      if (data?.dwellSeconds) setDwellSeconds(data.dwellSeconds)
      if (Array.isArray(data?.slotTimers)) {
        const map = {}
        data.slotTimers.forEach(s => {
          map[s.id] = s.remainingSeconds ?? null
        })
        setSlotTimers(map)
      }
    })

    hub.onreconnected(() => setConnected(true))
    hub.onclose(() => setConnected(false))

    hub.start()
      .then(() => {
        setConnected(true)
        hub.invoke('RequestState').catch(console.error)
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err)
        fetchState()
      })

    hubRef.current = hub
    return () => { hub.stop() }
  }, [])

  // HTTP Fallback
  const fetchState = useCallback(async () => {
    try {
      const { data } = await queueApi.getState()
      setState(normalise(data))
    } catch (err) {
      console.error('fetchState error:', err)
    }
  }, [])

  // Actions
  const addVehicle = useCallback(async (payload) => {
    setLoading(true)
    try {
      await queueApi.addVehicle(payload)
      showToast(`${payload.plateNumber} ditambahkan ke antrian`, 'success')
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Gagal menambahkan kendaraan', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const serveNext = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await queueApi.serveNext()
      showToast(`${data.plateNumber} telah dilayani ✓`, 'success')
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Tidak ada kendaraan di ramp', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const serveById = useCallback(async (id, plateNumber) => {
    setLoading(true)
    try {
      await queueApi.serveById(id)
      showToast(`${plateNumber ?? id} telah dilayani ✓`, 'success')
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Gagal melayani kendaraan', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const setMode = useCallback(async (isAutoMode) => {
    if (isAutoMode === null) {
      showToast('NOT SELECT MODE', 'info')
      return
    }
    try {
      await queueApi.setMode(isAutoMode)
      showToast(`Mode ${isAutoMode ? 'Otomatis' : 'Manual'} diaktifkan`, 'info')
    } catch (err) {
      console.error(err)
    }
  }, [])

  const moveToRamp = useCallback(async () => {
    try {
      await queueApi.moveToRamp()
      showToast('Antrian dipindahkan ke ramp', 'info')
    } catch (err) {
      console.error(err)
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      await queueApi.clearAll()
      showToast('Semua antrian dibersihkan', 'info')
    } catch (err) {
      console.error(err)
    }
  }, [])

  return {
    state,
    connected,
    loading,
    toast,
    now,
    slotTimers,
    dwellSeconds,
    actions: { addVehicle, serveNext, serveById, setMode, moveToRamp, clearAll },
  }
}

function normalise(raw) {
  if (!raw) return INITIAL_STATE

  const lineA = normaliseSlotArray(raw.rampLineA ?? raw.RampLineA, 3)
  const lineB = normaliseSlotArray(raw.rampLineB ?? raw.RampLineB, 3)

  return {
    waitingQueue:  raw.waitingQueue  ?? raw.WaitingQueue  ?? [],
    rampQueue:     raw.rampQueue     ?? raw.RampQueue     ?? [],
    rampLineA:     lineA,
    rampLineB:     lineB,
    servedHistory: raw.servedHistory ?? raw.ServedHistory ?? [],
    isAutoMode:    raw.isAutoMode    ?? raw.IsAutoMode    ?? true,
    totalWaiting:  raw.totalWaiting  ?? raw.TotalWaiting  ?? 0,
    totalOnRamp:   raw.totalOnRamp   ?? raw.TotalOnRamp   ?? 0,
    totalServed:   raw.totalServed   ?? raw.TotalServed   ?? 0,
  }
}

/**
 * Ensure we always get an array of exactly `size` entries (vehicle or null).
 * Normalises property names from PascalCase → camelCase for each vehicle.
 */
function normaliseSlotArray(arr, size) {
  const result = Array(size).fill(null)
  if (!Array.isArray(arr)) return result

  for (let i = 0; i < size; i++) {
    const v = arr[i]
    if (!v) { result[i] = null; continue }

    result[i] = {
      id:           v.id          ?? v.Id,
      plateNumber:  v.plateNumber ?? v.PlateNumber ?? '',
      type:         v.type        ?? v.Type,
      kudCategory:  v.kudCategory ?? v.KudCategory ?? 0,
      entryTime:    v.entryTime   ?? v.EntryTime,
      rampEntryTime:v.rampEntryTime ?? v.RampEntryTime,
      status:       v.status      ?? v.Status,
      position:     v.position    ?? v.Position ?? 0,
      rampLine:     v.rampLine    ?? v.RampLine,
      slotIndex:    v.slotIndex   ?? v.SlotIndex ?? i,
    }
  }
  return result
}
import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { queueApi } from '../services/api'

const INITIAL_STATE = {
  waitingQueue:  [],
  rampQueue:     [],
  servedHistory: [],
  isAutoMode:    true,
  totalWaiting:  0,
  totalOnRamp:   0,
  totalServed:   0,
}

export function useQueue() {
  const [state, setState]       = useState(INITIAL_STATE)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)
  const hubRef = useRef(null)

  // ─── SignalR connection ─────────────────────────────────────────────────────
  useEffect(() => {
    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/queueHub')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('StateUpdate', (newState) => {
      setState(normalise(newState))
    })

    hub.onreconnected(() => setConnected(true))
    hub.onclose(()      => setConnected(false))

    hub.start()
      .then(() => {
        setConnected(true)
        hub.invoke('RequestState').catch(console.error)
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err)
        // Fall back to HTTP polling
        fetchState()
      })

    hubRef.current = hub
    return () => { hub.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── HTTP fallback ──────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const { data } = await queueApi.getState()
      setState(normalise(data))
    } catch (err) {
      console.error('fetchState error:', err)
    }
  }, [])

  // ─── Actions ────────────────────────────────────────────────────────────────
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

  const setMode = useCallback(async (isAutoMode) => {
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

  // ─── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }

  return {
    state,
    connected,
    loading,
    toast,
    actions: { addVehicle, serveNext, setMode, moveToRamp, clearAll },
  }
}

// Normalise keys from PascalCase (C# JSON) → camelCase
function normalise(raw) {
  if (!raw) return INITIAL_STATE
  return {
    waitingQueue:  raw.waitingQueue  ?? raw.WaitingQueue  ?? [],
    rampQueue:     raw.rampQueue     ?? raw.RampQueue     ?? [],
    servedHistory: raw.servedHistory ?? raw.ServedHistory ?? [],
    isAutoMode:    raw.isAutoMode    ?? raw.IsAutoMode    ?? true,
    totalWaiting:  raw.totalWaiting  ?? raw.TotalWaiting  ?? 0,
    totalOnRamp:   raw.totalOnRamp   ?? raw.TotalOnRamp   ?? 0,
    totalServed:   raw.totalServed   ?? raw.TotalServed   ?? 0,
  }
}
using SmartQueue.API.Models;

namespace SmartQueue.API.Services;

public class QueueService : IQueueService
{
    private readonly List<Vehicle>    _waitingQueue  = new();
    private readonly List<Vehicle>    _servedHistory = new();
    private readonly Vehicle?[] _slotsA = new Vehicle?[LineCapacity];
    private readonly Vehicle?[] _slotsB = new Vehicle?[LineCapacity];
    private const int LineCapacity           = 3;
    private const int MaxRampSize            = LineCapacity * 2; // 6 total
    private const int MaxServedHistory       = 100;
    private const int KudCategoryDeferSlots  = 6;

    /// <summary>
    /// In AUTO mode, vehicles enter the ramp one at a time.
    /// Tracks the last ramp-entry timestamp to enforce the entry interval.
    /// </summary>
    private DateTime _lastRampEntryTime = DateTime.MinValue;

    private bool _isAutoMode = true;
    public bool IsAutoMode { get { lock (_lock) return _isAutoMode; } }

    /// <summary>UTC time the last vehicle entered the ramp (AUTO mode only).</summary>
    public DateTime LastRampEntryTime { get { lock (_lock) return _lastRampEntryTime; } }

    private readonly object _lock = new();

    // ─────────────────────────────────────────────────────────────────────────
    // Public interface
    // ─────────────────────────────────────────────────────────────────────────

    public QueueState GetState()
    {
        lock (_lock) return BuildState();
    }

    public Vehicle AddVehicle(AddVehicleRequest request)
    {
        lock (_lock)
        {
            var vehicle = new Vehicle
            {
                PlateNumber   = request.PlateNumber.Trim().ToUpper(),
                Type          = request.Type,
                KudCategory   = request.Type == VehicleType.TBS_KUD
                                    ? request.KudCategory
                                    : KudCategory.None,
                EntryTime     = DateTime.UtcNow,
                Status        = VehicleStatus.Waiting,
                RampLine      = RampLine.None,
                SlotIndex     = null,
                RampEntryTime = null,
            };

            _waitingQueue.Add(vehicle);
            ReorderWaiting();

            // In AUTO mode the first vehicle should enter immediately if ramp has space
            // and the entry timer has expired. Subsequent ones wait for the interval.
            if (_isAutoMode)
                TryFillOneSlotImmediate();

            RecalculatePositions();
            return vehicle;
        }
    }

    public Vehicle? ServeNext()
    {
        lock (_lock)
        {
            for (int i = 0; i < LineCapacity; i++)
                if (_slotsA[i] is not null)
                    return FinaliseServed(_slotsA, i);

            for (int i = 0; i < LineCapacity; i++)
                if (_slotsB[i] is not null)
                    return FinaliseServed(_slotsB, i);

            return null;
        }
    }

    public Vehicle? ServeVehicleById(string id)
    {
        lock (_lock)
        {
            for (int i = 0; i < LineCapacity; i++)
                if (_slotsA[i]?.Id == id)
                    return FinaliseServed(_slotsA, i);

            for (int i = 0; i < LineCapacity; i++)
                if (_slotsB[i]?.Id == id)
                    return FinaliseServed(_slotsB, i);

            return null;
        }
    }

    public IReadOnlyList<Vehicle> GetExpiredRampVehicles(TimeSpan threshold)
    {
        lock (_lock)
        {
            var now    = DateTime.UtcNow;
            var result = new List<Vehicle>();

            foreach (var v in _slotsA.Concat(_slotsB))
                if (v?.RampEntryTime.HasValue == true
                    && (now - v.RampEntryTime.Value) >= threshold)
                    result.Add(v);

            return result;
        }
    }

    public void SetMode(bool isAutoMode)
    {
        lock (_lock)
        {
            _isAutoMode = isAutoMode;
            if (_isAutoMode)
            {
                // Reset interval so the very first vehicle enters immediately
                _lastRampEntryTime = DateTime.MinValue;
                TryFillOneSlotImmediate();
            }
            RecalculatePositions();
        }
    }

    /// <summary>Manual mode — operator explicitly moves one vehicle to ramp.</summary>
    public void MoveToRamp()
    {
        lock (_lock)
        {
            PullOneFromWaiting();
            RecalculatePositions();
        }
    }

    /// <summary>
    /// AUTO mode — RampTimerService calls this every second once the entry
    /// interval has elapsed.  Moves exactly ONE vehicle to ramp.
    /// </summary>
    public Vehicle? MoveOneToRamp()
    {
        lock (_lock)
        {
            if (!_isAutoMode)              return null;
            if (OccupiedCount >= MaxRampSize) return null;
            if (_waitingQueue.Count == 0)     return null;

            var moved = PullOneFromWaiting();
            RecalculatePositions();
            return moved;
        }
    }

    public void ClearAll()
    {
        lock (_lock)
        {
            _waitingQueue.Clear();
            Array.Clear(_slotsA, 0, LineCapacity);
            Array.Clear(_slotsB, 0, LineCapacity);
            _servedHistory.Clear();
            _lastRampEntryTime = DateTime.MinValue;
            RecalculatePositions();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private int OccupiedCount =>
        _slotsA.Count(v => v is not null) + _slotsB.Count(v => v is not null);

    /// <summary>
    /// Used internally (e.g., on AddVehicle / SetMode) to fill one slot
    /// RIGHT NOW, bypassing the interval timer check.
    /// The interval timer in RampTimerService controls ongoing entries.
    /// </summary>
    private void TryFillOneSlotImmediate()
    {
        if (_waitingQueue.Count == 0) return;
        if (OccupiedCount >= MaxRampSize) return;
        PullOneFromWaiting();
    }

    private Vehicle FinaliseServed(Vehicle?[] slots, int slotIndex)
    {
        var vehicle      = slots[slotIndex]!;
        slots[slotIndex] = null;

        vehicle.Status        = VehicleStatus.Served;
        vehicle.Position      = 0;
        vehicle.RampLine      = RampLine.None;
        vehicle.SlotIndex     = null;
        vehicle.RampEntryTime = null;

        _servedHistory.Add(vehicle);
        if (_servedHistory.Count > MaxServedHistory)
            _servedHistory.RemoveAt(0);

        if (vehicle.Type == VehicleType.TBS_KUD)
            DeferNextKudOfCategory(vehicle.KudCategory);

        // AUTO mode: do NOT immediately fill the freed slot — RampTimerService
        // will do so after the 60-second entry interval elapses.

        RecalculatePositions();
        return vehicle;
    }

    private Vehicle? PullOneFromWaiting()
    {
        if (_waitingQueue.Count == 0) return null;

        for (int i = 0; i < LineCapacity; i++)
            if (_slotsA[i] is null)
                return PullIntoSlot(_slotsA, i, RampLine.A);

        for (int i = 0; i < LineCapacity; i++)
            if (_slotsB[i] is null)
                return PullIntoSlot(_slotsB, i, RampLine.B);

        return null;
    }

    private Vehicle PullIntoSlot(Vehicle?[] slots, int slotIndex, RampLine line)
    {
        ReorderWaiting();
        var next = _waitingQueue[0];
        _waitingQueue.RemoveAt(0);

        next.Status        = VehicleStatus.OnRamp;
        next.RampLine      = line;
        next.SlotIndex     = slotIndex;
        next.RampEntryTime = DateTime.UtcNow;

        slots[slotIndex]   = next;
        _lastRampEntryTime = DateTime.UtcNow;   // ← record entry timestamp
        return next;
    }

    private void DeferNextKudOfCategory(KudCategory category)
    {
        var target = _waitingQueue.FirstOrDefault(
            v => v.Type == VehicleType.TBS_KUD && v.KudCategory == category);

        if (target == null) return;

        var queueWithoutTarget = _waitingQueue
            .Where(v => !ReferenceEquals(v, target))
            .ToList();

        if (queueWithoutTarget.Count == 0) return;

        int anchorIndex  = Math.Min(KudCategoryDeferSlots - 1, queueWithoutTarget.Count - 1);
        DateTime anchor  = queueWithoutTarget[anchorIndex].EntryTime;
        target.EntryTime = anchor.AddTicks(1);
        ReorderWaiting();
    }

    private void ReorderWaiting() => _waitingQueue.Sort(CompareVehiclePriority);

    private static int CompareVehiclePriority(Vehicle? left, Vehicle? right)
    {
        if (ReferenceEquals(left, right)) return 0;
        if (left  is null) return  1;
        if (right is null) return -1;

        int ec = left.EntryTime.CompareTo(right.EntryTime);
        if (ec != 0) return ec;

        return string.CompareOrdinal(left.Id, right.Id);
    }

    private void RecalculatePositions()
    {
        for (int i = 0; i < LineCapacity; i++)
            if (_slotsA[i] is not null) _slotsA[i]!.Position = i + 1;

        for (int i = 0; i < LineCapacity; i++)
            if (_slotsB[i] is not null) _slotsB[i]!.Position = LineCapacity + i + 1;

        for (int i = 0; i < _waitingQueue.Count; i++)
            _waitingQueue[i].Position = i + 1;
    }

    private QueueState BuildState()
    {
        var lineA    = _slotsA.ToList();
        var lineB    = _slotsB.ToList();
        var combined = lineA.Concat(lineB).Where(v => v is not null).Cast<Vehicle>().ToList();

        return new QueueState
        {
            WaitingQueue  = _waitingQueue.ToList(),
            RampLineA     = lineA,
            RampLineB     = lineB,
            RampQueue     = combined,
            ServedHistory = _servedHistory.AsEnumerable().Reverse().Take(10).ToList(),
            IsAutoMode    = _isAutoMode,
            TotalWaiting  = _waitingQueue.Count,
            TotalOnRamp   = OccupiedCount,
            TotalServed   = _servedHistory.Count,
        };
    }
}

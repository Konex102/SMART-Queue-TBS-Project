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
    private DateTime _lastRampEntryTime = DateTime.MinValue;

    private bool _isAutoMode = true;
    public bool IsAutoMode { get { lock (_lock) return _isAutoMode; } }
    public DateTime LastRampEntryTime { get { lock (_lock) return _lastRampEntryTime; } }
    private readonly object _lock = new();
    private static readonly TimeSpan MinWaitBeforeRamp = TimeSpan.FromMinutes(1);
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

            // if (_isAutoMode)
            //     TryFillOneSlotImmediate();

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

    public Vehicle? MoveEligibleWaitingToRamp()
    {
        lock (_lock)
        {
            if(!_isAutoMode)
                return null;
            if(OccupiedCount >= MaxRampSize)
                return null;
            if(!HasEligibleWaiting())
                return null;
            
            var moved = PullOneFromWaiting();
            RecalculatePositions();
            return moved;
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
                _lastRampEntryTime = DateTime.MinValue;
                TryFillOneSlotImmediate();
            }
            RecalculatePositions();
        }
    }
    public void MoveToRamp()
    {
        lock (_lock)
        {
            PullOneFromWaiting();
            RecalculatePositions();
        }
    }

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

    private int OccupiedCount =>
        _slotsA.Count(v => v is not null) + _slotsB.Count(v => v is not null);

    private void TryFillOneSlotImmediate()
    {
        if (_waitingQueue.Count == 0) 
            return;
        if (OccupiedCount >= MaxRampSize) 
            return;
        if (!HasEligibleWaiting())
            return;
        PullOneFromWaiting();
    }

    private bool HasEligibleWaiting()
    {
        var now = DateTime.UtcNow;
        return _waitingQueue.Any(v => (now - v.EntryTime) >= MinWaitBeforeRamp);
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

        RecalculatePositions();
        return vehicle;
    }

    private Vehicle? PullOneFromWaiting()
    {
        if (_waitingQueue.Count == 0) 
            return null;

        var now = DateTime.UtcNow;

        var eligibleIndex = _waitingQueue
            .Select((v,i) => (v,i))
            .FirstOrDefault(x => (now - x.v.EntryTime) >= MinWaitBeforeRamp);
        
        if (eligibleIndex == default &&
            !((now - _waitingQueue[0].EntryTime) >= MinWaitBeforeRamp))
            return null;

        for (int i = 0; i < LineCapacity; i++)
            if (_slotsA[i] is null)
                return PullIntoSlot(_slotsA, i, RampLine.A);

        for (int i = 0; i < LineCapacity; i++)
            if (_slotsB[i] is null)
                return PullIntoSlot(_slotsB, i, RampLine.B);

        return null;
    }

    private Vehicle PullIntoSlot(Vehicle?[] slots, int slotIndex, RampLine line, int waitingIndex = 0)
    {
        ReorderWaiting();
        var next = _waitingQueue[waitingIndex];
        _waitingQueue.RemoveAt(waitingIndex);

        next.Status        = VehicleStatus.OnRamp;
        next.RampLine      = line;
        next.SlotIndex     = slotIndex;
        next.RampEntryTime = DateTime.UtcNow;

        slots[slotIndex]   = next;
        _lastRampEntryTime = DateTime.UtcNow;
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
using SmartQueue.API.Models;

namespace SmartQueue.API.Services;

public class QueueService : IQueueService
{
    private readonly List<Vehicle> _waitingQueue = new();
    private readonly List<Vehicle> _rampQueue    = new();
    private readonly List<Vehicle> _servedHistory = new();
    private bool _isAutoMode = true;
    private const int MaxRampSize      = 6;
    private const int MaxServedHistory = 20;
    private readonly object _lock = new();

    // Public API methods
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
                PlateNumber = request.PlateNumber.Trim().ToUpper(),
                Type        = request.Type,
                KudCategory = request.Type == VehicleType.TBS_KUD
                                ? request.KudCategory
                                : KudCategory.None,
                EntryTime   = DateTime.UtcNow,
                Status      = VehicleStatus.Waiting
            };

            _waitingQueue.Add(vehicle);
            ReorderWaiting();

            if (_isAutoMode) RefillRamp();

            RecalculatePositions();
            return vehicle;
        }
    }

    public Vehicle? ServeNext()
    {
        lock (_lock)
        {
            if (_rampQueue.Count == 0) return null;

            var vehicle  = _rampQueue[0];
            _rampQueue.RemoveAt(0);
            vehicle.Status   = VehicleStatus.Served;
            vehicle.Position = 0;

            _servedHistory.Add(vehicle);
            if (_servedHistory.Count > MaxServedHistory)
                _servedHistory.RemoveAt(0);

            if (_isAutoMode) RefillRamp();

            RecalculatePositions();
            return vehicle;
        }
    }

    public void SetMode(bool isAutoMode)
    {
        lock (_lock)
        {
            _isAutoMode = isAutoMode;
            if (isAutoMode) RefillRamp();
            RecalculatePositions();
        }
    }

    public void MoveToRamp()
    {
        lock (_lock)
        {
            RefillRamp();
            RecalculatePositions();
        }
    }

    public void ClearAll()
    {
        lock (_lock)
        {
            _waitingQueue.Clear();
            _rampQueue.Clear();
        }
    }

    private void RefillRamp()
    {
        ReorderWaiting();

        while (_rampQueue.Count < MaxRampSize && _waitingQueue.Count > 0)
        {
            var next = _waitingQueue[0];
            _waitingQueue.RemoveAt(0);
            next.Status = VehicleStatus.OnRamp;
            _rampQueue.Add(next);
        }
        ReorderRamp();
    }

    private void ReorderRamp()
    {
        _rampQueue.Sort(CompareVehiclePriority);
    }

    private void ReorderWaiting()
    {
        _waitingQueue.Sort(CompareVehiclePriority);
    }

    private static int CompareVehiclePriority(Vehicle? left, Vehicle? right)
    {
        if (ReferenceEquals(left, right)) return 0;
        if (left is null) return 1;
        if (right is null) return -1;

        var leftTypePriority = left.Type == VehicleType.TBS_KUD ? 0 : 1;
        var rightTypePriority = right.Type == VehicleType.TBS_KUD ? 0 : 1;
        var typeComparison = leftTypePriority.CompareTo(rightTypePriority);
        if (typeComparison != 0) return typeComparison;

        if (left.Type == VehicleType.TBS_KUD && right.Type == VehicleType.TBS_KUD)
        {
            var categoryComparison = ((int)left.KudCategory).CompareTo((int)right.KudCategory);
            if (categoryComparison != 0) return categoryComparison;
        }

        var entryComparison = left.EntryTime.CompareTo(right.EntryTime);
        if (entryComparison != 0) return entryComparison;

        return string.CompareOrdinal(left.Id, right.Id);
    }

    private void RecalculatePositions()
    {
        for (int i = 0; i < _rampQueue.Count; i++)
            _rampQueue[i].Position = i + 1;

        for (int i = 0; i < _waitingQueue.Count; i++)
            _waitingQueue[i].Position = _rampQueue.Count + i + 1;
    }
    private QueueState BuildState() => new()
    {
        WaitingQueue  = _waitingQueue.ToList(),
        RampQueue     = _rampQueue.ToList(),
        ServedHistory = _servedHistory.AsEnumerable().Reverse().Take(10).ToList(),
        IsAutoMode    = _isAutoMode,
        TotalWaiting  = _waitingQueue.Count,
        TotalOnRamp   = _rampQueue.Count,
        TotalServed   = _servedHistory.Count
    };
}

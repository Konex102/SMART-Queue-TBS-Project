using SmartQueue.API.Models;

namespace SmartQueue.API.Services;

public interface IQueueService
{
    QueueState GetState();
    Vehicle AddVehicle(AddVehicleRequest request);
    Vehicle? ServeNext();
    Vehicle? ServeVehicleById(string id);
    void SetMode(bool isAutoMode);
    void MoveToRamp();
    /// <summary>
    /// AUTO mode: move exactly ONE vehicle from waiting queue to ramp.
    /// Called by RampTimerService when the 60-second entry interval has elapsed.
    /// Returns the moved vehicle, or null if nothing was moved.
    /// </summary>
    Vehicle? MoveOneToRamp();
    bool IsAutoMode { get; }
    /// <summary>UTC timestamp of the last vehicle that entered the ramp (AUTO mode).</summary>
    DateTime LastRampEntryTime { get; }
    void ClearAll();
    /// <summary>Returns all vehicles currently on the ramp whose RampEntryTime has expired beyond <paramref name="threshold"/>.</summary>
    IReadOnlyList<Vehicle> GetExpiredRampVehicles(TimeSpan threshold);
}

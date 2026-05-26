using SmartQueue.API.Models;

namespace SmartQueue.API.Services;

public interface IQueueService
{
    QueueState GetState();
    Vehicle AddVehicle(AddVehicleRequest request);
    Vehicle? ServeNext();
    Vehicle? ServeVehicleById(string id);
    Vehicle? MoveEligibleWaitingToRamp();
    void SetMode(bool isAutoMode);
    void MoveToRamp();
    Vehicle? MoveOneToRamp();
    bool IsAutoMode { get; }
    DateTime LastRampEntryTime { get; }
    void ClearAll();
    IReadOnlyList<Vehicle> GetExpiredRampVehicles(TimeSpan threshold);
}

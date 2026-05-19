using SmartQueue.API.Models;

namespace SmartQueue.API.Services;

public interface IQueueService
{
    QueueState GetState();
    Vehicle AddVehicle(AddVehicleRequest request);
    Vehicle? ServeNext();
    void SetMode(bool isAutoMode);
    void MoveToRamp();
    void ClearAll();
}
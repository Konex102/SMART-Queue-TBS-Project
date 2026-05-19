namespace SmartQueue.API.Models;

public enum VehicleType
{
    TBS_INTI,
    TBS_KUD
}

public enum KudCategory
{
    None = 0,
    A = 1,
    B = 2,
    C = 3,
    D = 4,
    E = 5
}

public enum VehicleStatus
{
    Waiting,
    OnRamp,
    Served
}

public class Vehicle
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PlateNumber { get; set; } = string.Empty;
    public VehicleType Type { get; set; }
    public KudCategory KudCategory { get; set; } = KudCategory.None;
    public DateTime EntryTime { get; set; } = DateTime.UtcNow;
    public VehicleStatus Status { get; set; } = VehicleStatus.Waiting;
    public int Position { get; set; }
}

public class AddVehicleRequest
{
    public string PlateNumber { get; set; } = string.Empty;
    public VehicleType Type { get; set; }
    public KudCategory KudCategory { get; set; } = KudCategory.None;
}

public class SetModeRequest
{
    public bool IsAutoMode { get; set; }
}

public class QueueState
{
    public List<Vehicle> WaitingQueue { get; set; } = new();
    public List<Vehicle> RampQueue { get; set; } = new();
    public List<Vehicle> ServedHistory { get; set; } = new();
    public bool IsAutoMode { get; set; }
    public int TotalWaiting { get; set; }
    public int TotalOnRamp { get; set; }
    public int TotalServed { get; set; }
}
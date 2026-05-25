using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SmartQueue.API.Hubs;
using SmartQueue.API.Models;
using SmartQueue.API.Services;

namespace SmartQueue.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QueueController : ControllerBase
{
    private readonly IQueueService _queueService;
    private readonly IHubContext<QueueHub> _hubContext;

    public QueueController(IQueueService queueService, IHubContext<QueueHub> hubContext)
    {
        _queueService = queueService;
        _hubContext   = hubContext;
    }

    // GET /api/queue/state
    [HttpGet("state")]
    public IActionResult GetState() => Ok(_queueService.GetState());

    // POST /api/queue/add
    [HttpPost("add")]
    public async Task<IActionResult> AddVehicle([FromBody] AddVehicleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlateNumber))
            return BadRequest(new { error = "PlateNumber wajib diisi." });

        if (request.Type == VehicleType.TBS_KUD && request.KudCategory == KudCategory.None)
            return BadRequest(new { error = "Kendaraan KUD harus memiliki kategori (A-E)." });

        var vehicle = _queueService.AddVehicle(request);
        await BroadcastState();
        return Ok(vehicle);
    }

    // POST /api/queue/serve  ← serves first vehicle in priority order
    [HttpPost("serve")]
    public async Task<IActionResult> ServeNext()
    {
        var vehicle = _queueService.ServeNext();
        if (vehicle == null)
            return NotFound(new { error = "Tidak ada kendaraan di ramp." });

        await BroadcastState();
        return Ok(vehicle);
    }

    // POST /api/queue/serve/{id}  ← operator picks a specific vehicle (Manual mode)
    [HttpPost("serve/{id}")]
    public async Task<IActionResult> ServeById(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new { error = "Id kendaraan tidak valid." });

        var vehicle = _queueService.ServeVehicleById(id);
        if (vehicle == null)
            return NotFound(new { error = $"Kendaraan dengan id '{id}' tidak ditemukan di ramp." });

        await BroadcastState();
        return Ok(vehicle);
    }

    // POST /api/queue/mode
    [HttpPost("mode")]
    public async Task<IActionResult> SetMode([FromBody] SetModeRequest request)
    {
        _queueService.SetMode(request.IsAutoMode);
        await BroadcastState();
        return Ok(new { isAutoMode = request.IsAutoMode });
    }

    // POST /api/queue/move-to-ramp  ← Manual mode only
    [HttpPost("move-to-ramp")]
    public async Task<IActionResult> MoveToRamp()
    {
        _queueService.MoveToRamp();
        await BroadcastState();
        return Ok();
    }

    // DELETE /api/queue/clear
    [HttpDelete("clear")]
    public async Task<IActionResult> ClearAll()
    {
        _queueService.ClearAll();
        await BroadcastState();
        return Ok();
    }

    private async Task BroadcastState()
    {
        var state = _queueService.GetState();
        await _hubContext.Clients.All.SendAsync("StateUpdate", state);
    }
}
using Microsoft.AspNetCore.SignalR;
using SmartQueue.API.Hubs;
using SmartQueue.API.Services;

namespace SmartQueue.API.Services;

public class RampTimerService : BackgroundService
{
    private readonly IQueueService _queueService;
    private readonly IHubContext<QueueHub> _hubContext;
    private readonly ILogger<RampTimerService> _logger;
    private readonly int _dwellSeconds;
    private readonly int _entryIntervalSeconds;

    public RampTimerService(
        IQueueService queueService,
        IHubContext<QueueHub> hubContext,
        ILogger<RampTimerService> logger,
        IConfiguration configuration)
    {
        _queueService        = queueService;
        _hubContext          = hubContext;
        _logger              = logger;

        _dwellSeconds        = configuration.GetValue<int>("RampTimer:DwellSeconds",        120);
        _entryIntervalSeconds = configuration.GetValue<int>("RampTimer:EntryIntervalSeconds", 60);

        _logger.LogInformation(
            "RampTimerService initialised — dwell: {d}s, entry-interval: {e}s (AUTO only)",
            _dwellSeconds, _entryIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RampTimerService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken); }
            catch (TaskCanceledException) { break; }

            await TickAsync();
        }

        _logger.LogInformation("RampTimerService stopped.");
    }

    private async Task TickAsync()
    {
        try
        {
            bool stateChanged = false;

            if (_queueService.IsAutoMode)
            {
                var dwellThreshold = TimeSpan.FromSeconds(_dwellSeconds);
                var expired = _queueService.GetExpiredRampVehicles(dwellThreshold);

                foreach (var v in expired)
                {
                    var served = _queueService.ServeVehicleById(v.Id);
                    if (served is not null)
                    {
                        stateChanged = true;
                        _logger.LogInformation(
                            "AUTO-SERVE: {Plate} ({Type}) Line {Line} — dwell {d}s elapsed.",
                            served.PlateNumber, served.Type, served.RampLine, _dwellSeconds);
                    }
                }

                var movedEligible = _queueService.MoveEligibleWaitingToRamp();
                if (movedEligible is not null)
                {
                    stateChanged = true;
                    _logger.LogInformation(
                        "AUTO-ENTER (wait elapsed): {plate} moved to ramp",
                        movedEligible.PlateNumber
                    );
                }

                var timeSinceLastEntry = DateTime.UtcNow - _queueService.LastRampEntryTime;
                if (timeSinceLastEntry >= TimeSpan.FromSeconds(_entryIntervalSeconds))
                {
                    var moved = _queueService.MoveOneToRamp();
                    if (moved is not null)
                    {
                        stateChanged = true;
                        _logger.LogInformation(
                            "AUTO-ENTER: {Plate} ({Type}) moved to ramp — interval {e}s elapsed.",
                            moved.PlateNumber, moved.Type, _entryIntervalSeconds);
                    }
                }
            }

            if (stateChanged)
            {
                var updatedState = _queueService.GetState();
                await _hubContext.Clients.All.SendAsync("StateUpdate", updatedState);
            }
            var state = _queueService.GetState();

            int? nextEntryIn = null;
            if (_queueService.IsAutoMode)
            {
                var elapsed = (int)(DateTime.UtcNow - _queueService.LastRampEntryTime).TotalSeconds;
                nextEntryIn = Math.Max(0, _entryIntervalSeconds - elapsed);
            }

            var slotTimers = state.RampLineA
                .Concat(state.RampLineB)
                .Where(v => v is not null)
                .Select(v =>
                {
                    int? remaining = null;
                    if (_queueService.IsAutoMode && v!.RampEntryTime.HasValue)
                    {
                        var elapsedSec = (int)(DateTime.UtcNow - v.RampEntryTime.Value).TotalSeconds;
                        remaining = Math.Max(0, _dwellSeconds - elapsedSec);
                    }
                    return new { id = v!.Id, remainingSeconds = remaining };
                })
                .ToList();

            await _hubContext.Clients.All.SendAsync("TimerUpdate", new
            {
                isAutoMode            = _queueService.IsAutoMode,
                dwellSeconds          = _dwellSeconds,
                entryIntervalSeconds  = _entryIntervalSeconds,
                nextEntryIn,
                slotTimers,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RampTimerService tick failed.");
        }
    }
}

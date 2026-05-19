using Microsoft.AspNetCore.SignalR;
using SmartQueue.API.Services;

namespace SmartQueue.API.Hubs;

public class QueueHub : Hub
{
    private readonly IQueueService _queueService;

    public QueueHub(IQueueService queueService)
    {
        _queueService = queueService;
    }

    public async Task RequestState()
    {
        var state = _queueService.GetState();
        await Clients.Caller.SendAsync("StateUpdate", state);
    }
}
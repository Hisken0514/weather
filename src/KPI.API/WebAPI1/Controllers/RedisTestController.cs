using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;
using NReJSON;

[Route("api/redis")]
[ApiController]
public class RedisTestController : ControllerBase
{
    private readonly IDatabase _db;

    public RedisTestController(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedData()
    {
        var users = new[]
        {
            new { id = 1, name = "Alice", role = "Admin" },
            new { id = 2, name = "Bob", role = "User" },
            new { id = 3, name = "Charlie", role = "Moderator" }
        };
        var json = System.Text.Json.JsonSerializer.Serialize(users);
        await _db.JsonSetAsync("userList", "$", json);
        return Ok("已寫入 Redis");
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var json = await _db.JsonGetAsync("userList", "$");
        return Content(json.ToString(), "application/json");
    }
}
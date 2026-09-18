using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Services;

namespace WebAPI1.Entities;


public class DataChangeLog
{
    public long Id { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = default!;
    public string EntityName { get; set; } = default!;
    public string? TableName { get; set; }
    public string? EntityId { get; set; }
    public string? RequestPath { get; set; }
    public string? ClientIp { get; set; }
    public string? PayloadJson { get; set; }
}
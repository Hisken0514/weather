namespace Forma.Application.Features.Agencies.DTOs;

public class AgencyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<AgencyFormTypeDto> FormTypes { get; set; } = new();
    public int UserCount { get; set; }
}

public class AgencyFormTypeDto
{
    public Guid Id { get; set; }
    public string FormTypeName { get; set; } = string.Empty;
    public Guid? FormId { get; set; }
    public string? FormName { get; set; }
}

public class AgencyUserDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}

// Request DTOs
public class CreateAgencyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
}

public class UpdateAgencyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
    public bool IsActive { get; set; }
}

public class AddAgencyFormTypeRequest
{
    public string FormTypeName { get; set; } = string.Empty;
    public Guid? FormId { get; set; }
}

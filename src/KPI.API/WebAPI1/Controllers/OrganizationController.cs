using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class OrganizationController: ControllerBase
{

    private readonly IOrganizationService _organizationService;
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<OrganizationController> _logger;
    
    public OrganizationController(ISHAuditDbcontext db,IOrganizationService organizationService,
        ILogger<OrganizationController> logger)
    {
        _db = db;
        _organizationService = organizationService;
        _logger = logger;
    }
    
    // 獲取所有組織
    [HttpGet("GetOrganizations")]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetAllOrganizations()
    {
        try
        {
            var organizations = await _organizationService.GetAllOrganizationsAsync();
            return Ok(organizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting all organizations");
            return StatusCode(500, "Internal server error");
        }
    }

    // 獲取組織下層
    [HttpGet("GetOrganizationsId")]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetChildOrganizationsAsync(int organizationId)
    {
        try
        {
            var organizations = await _organizationService.GetChildOrganizationsAsync(organizationId);
            return Ok(organizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting all organizations");
            return StatusCode(500, "Internal server error");
        }
    }
    
    // 獲取樹狀結構
    [HttpGet("GetFullOrgTreeFromAnyNodeId")]
    public async Task<ActionResult<OrganizationDto>> GetOrganizationTreeByDomainAsync(string domain)
    {
        try
        {
            var organizations = await _organizationService.GetOrganizationTreeByDomainAsync(domain);
            return Ok(organizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting all organizations");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("GetCompanyTree")]
    public async Task<OkObjectResult> GetFilteredOrgTreeAsync()
    {
        try
        {
            var organizations = await _organizationService.GetFilteredOrgTreeAsync();
            return Ok(organizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting all organizations");
            return (OkObjectResult)StatusCode(500, "Internal server error");
        }
    }
}
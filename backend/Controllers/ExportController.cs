using Microsoft.AspNetCore.Mvc;
using backend.Services;

namespace backend.Controllers;

/// <summary>
/// Controller for exporting financial data.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;

    public ExportController(IExportService exportService)
    {
        _exportService = exportService ?? throw new ArgumentNullException(nameof(exportService));
    }

    /// <summary>
    /// Exports transactions to CSV.
    /// </summary>
    [HttpGet("transactions/{householdId}/csv")]
    public async Task<IActionResult> ExportTransactionsCsv(
        int householdId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var csvData = await _exportService.ExportTransactionsToCsvAsync(householdId, startDate, endDate);

            var fileName = startDate.HasValue && endDate.HasValue
                ? $"transactions_{startDate.Value:yyyy-MM-dd}_to_{endDate.Value:yyyy-MM-dd}.csv"
                : $"transactions_{DateTime.Now:yyyy-MM-dd}.csv";

            return File(csvData, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to export transactions", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exports budget to CSV.
    /// </summary>
    [HttpGet("budget/{budgetId}/csv")]
    public async Task<IActionResult> ExportBudgetCsv(int budgetId)
    {
        try
        {
            var csvData = await _exportService.ExportBudgetToCsvAsync(budgetId);
            var fileName = $"budget_{budgetId}_{DateTime.Now:yyyy-MM-dd}.csv";

            return File(csvData, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to export budget", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exports budget to CSV by household and month.
    /// </summary>
    [HttpGet("budget")]
    public async Task<IActionResult> ExportBudgetByHousehold(
        [FromQuery] int householdId,
        [FromQuery] string month,
        [FromQuery] string format = "csv")
    {
        try
        {
            if (format.ToLower() != "csv")
            {
                return BadRequest("Only CSV format is supported");
            }

            var csvData = await _exportService.ExportBudgetByHouseholdAndMonthAsync(householdId, month);
            var fileName = $"budget_{householdId}_{month}.csv";

            return File(csvData, "text/csv", fileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to export budget", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exports household data to JSON.
    /// </summary>
    [HttpGet("household/{householdId}/json")]
    public async Task<IActionResult> ExportHouseholdJson(int householdId)
    {
        try
        {
            var jsonData = await _exportService.ExportHouseholdToJsonAsync(householdId);
            var fileName = $"household_{householdId}_{DateTime.Now:yyyy-MM-dd}.json";

            return File(System.Text.Encoding.UTF8.GetBytes(jsonData), "application/json", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to export household", Details = ex.Message });
        }
    }

    /// <summary>
    /// Exports goals to CSV.
    /// </summary>
    [HttpGet("goals/{householdId}/csv")]
    public async Task<IActionResult> ExportGoalsCsv(int householdId)
    {
        try
        {
            var csvData = await _exportService.ExportGoalsToCsvAsync(householdId);
            var fileName = $"goals_{householdId}_{DateTime.Now:yyyy-MM-dd}.csv";

            return File(csvData, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to export goals", Details = ex.Message });
        }
    }
}


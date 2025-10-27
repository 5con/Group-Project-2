using Microsoft.AspNetCore.Mvc;
using backend.Services;

namespace backend.Controllers;

/// <summary>
/// Controller for dashboard insights and recommendations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;

    public DashboardController(IRecommendationService recommendationService)
    {
        _recommendationService = recommendationService ?? throw new ArgumentNullException(nameof(recommendationService));
    }

    /// <summary>
    /// Gets top recommended actions for a household.
    /// </summary>
    [HttpGet("household/{householdId}/top-actions")]
    public async Task<IActionResult> GetTopActions(int householdId)
    {
        try
        {
            var actions = await _recommendationService.GetTopActionsAsync(householdId);
            return Ok(actions);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to get recommendations", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets contextual financial tips.
    /// </summary>
    [HttpGet("household/{householdId}/tips")]
    public async Task<IActionResult> GetContextualTips(int householdId)
    {
        try
        {
            var tips = await _recommendationService.GetContextualTipsAsync(householdId);
            return Ok(tips);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to get tips", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets benchmark comparison against state averages.
    /// </summary>
    [HttpGet("household/{householdId}/benchmarks")]
    public async Task<IActionResult> GetBenchmarkComparison(int householdId, [FromQuery] int? budgetId = null)
    {
        try
        {
            var comparison = await _recommendationService.GetBenchmarkComparisonAsync(householdId, budgetId);
            return Ok(comparison);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to get benchmark comparison", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets quick win opportunities.
    /// </summary>
    [HttpGet("household/{householdId}/quick-wins")]
    public async Task<IActionResult> GetQuickWins(int householdId)
    {
        try
        {
            var quickWins = await _recommendationService.GetQuickWinsAsync(householdId);
            return Ok(quickWins);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to get quick wins", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets financial health score.
    /// </summary>
    [HttpGet("household/{householdId}/health-score")]
    public async Task<IActionResult> GetHealthScore(int householdId)
    {
        try
        {
            var score = await _recommendationService.CalculateHealthScoreAsync(householdId);
            return Ok(score);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to calculate health score", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets complete dashboard recommendations (all insights in one call).
    /// </summary>
    [HttpGet("household/{householdId}/recommendations")]
    public async Task<IActionResult> GetDashboardRecommendations(int householdId, [FromQuery] int? budgetId = null)
    {
        try
        {
            var recommendations = await _recommendationService.GetDashboardRecommendationsAsync(householdId, budgetId);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to get dashboard recommendations", Details = ex.Message });
        }
    }
}


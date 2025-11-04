using backend.DTOs;

namespace backend.Services;

/// <summary>
/// Service interface for generating personalized financial recommendations and insights.
/// </summary>
public interface IRecommendationService
{
    /// <summary>
    /// Generates top 3-5 actionable recommendations for a household.
    /// </summary>
    Task<List<RecommendationResponse>> GetTopActionsAsync(int householdId);

    /// <summary>
    /// Generates contextual tips based on household financial data.
    /// </summary>
    Task<List<FinancialTipResponse>> GetContextualTipsAsync(int householdId);

    /// <summary>
    /// Compares household spending against state benchmarks.
    /// </summary>
    Task<BenchmarkComparisonResponse> GetBenchmarkComparisonAsync(int householdId, int? budgetId = null);

    /// <summary>
    /// Identifies quick win opportunities (easy improvements).
    /// </summary>
    Task<List<string>> GetQuickWinsAsync(int householdId);

    /// <summary>
    /// Calculates financial health score.
    /// </summary>
    Task<FinancialHealthScore> CalculateHealthScoreAsync(int householdId);

    /// <summary>
    /// Gets complete dashboard recommendations.
    /// </summary>
    Task<DashboardRecommendationsResponse> GetDashboardRecommendationsAsync(int householdId, int? budgetId = null);
}


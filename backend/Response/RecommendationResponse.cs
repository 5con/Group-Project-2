namespace backend.DTOs;

/// <summary>
/// DTO for actionable recommendations and insights.
/// </summary>
public class RecommendationResponse
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty; // "reduce_spending", "increase_savings", "pay_debt", etc.
    public string Category { get; set; } = string.Empty;
    public decimal ImpactAmount { get; set; }
    public int Priority { get; set; } // 1-10
    public string Icon { get; set; } = string.Empty; // For UI
    public string ActionUrl { get; set; } = string.Empty; // Deep link to relevant page
}

/// <summary>
/// DTO for contextual financial tips.
/// </summary>
public class FinancialTipResponse
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty; // "info", "warning", "critical"
    public List<string> Resources { get; set; } = new();
}

/// <summary>
/// DTO for benchmark comparison data.
/// </summary>
public class BenchmarkComparisonResponse
{
    public string State { get; set; } = string.Empty;
    public int HouseholdSize { get; set; }
    public List<CategoryBenchmark> CategoryComparisons { get; set; } = new();
    public string OverallAssessment { get; set; } = string.Empty;
}

/// <summary>
/// Individual category benchmark.
/// </summary>
public class CategoryBenchmark
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal YourAmount { get; set; }
    public decimal YourPercentage { get; set; }
    public decimal StateAverage { get; set; }
    public decimal StateAveragePercentage { get; set; }
    public decimal Difference { get; set; }
    public string Status { get; set; } = string.Empty; // "below_average", "average", "above_average"
    public string Insight { get; set; } = string.Empty;
}

/// <summary>
/// Complete dashboard recommendations response.
/// </summary>
public class DashboardRecommendationsResponse
{
    public List<RecommendationResponse> TopActions { get; set; } = new();
    public List<FinancialTipResponse> ContextualTips { get; set; } = new();
    public BenchmarkComparisonResponse? BenchmarkComparison { get; set; }
    public List<string> QuickWins { get; set; } = new();
    public FinancialHealthScore HealthScore { get; set; } = new();
}

/// <summary>
/// Financial health score breakdown.
/// </summary>
public class FinancialHealthScore
{
    public int OverallScore { get; set; } // 0-100
    public int BudgetScore { get; set; }
    public int DebtScore { get; set; }
    public int SavingsScore { get; set; }
    public int GoalsScore { get; set; }
    public string Rating { get; set; } = string.Empty; // "Excellent", "Good", "Fair", "Needs Improvement"
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
}


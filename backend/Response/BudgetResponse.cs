namespace backend.DTOs;

/// <summary>
/// Response DTO for budget data with calculated summaries.
/// </summary>
public class BudgetResponse
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Methodology { get; set; } = string.Empty;
    public DateTime Month { get; set; }
    public string Notes { get; set; } = string.Empty;
    public List<BudgetItemDto> BudgetItems { get; set; } = new();
    public BudgetSummary Summary { get; set; } = new();
}

public class BudgetItemDto
{
    public int Id { get; set; }
    public int BudgetId { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsNeed { get; set; }
    public decimal PlannedAmount { get; set; }
}

public class BudgetSummary
{
    public decimal TotalBudgeted { get; set; }
    public decimal TotalNeeds { get; set; }
    public decimal TotalWants { get; set; }
    public decimal TotalSavings { get; set; }
    public decimal GrossIncome { get; set; }
    public decimal EstimatedTax { get; set; }
    public decimal NetIncome { get; set; }
}

public class DebtSnowballProjection
{
    public List<DebtSnowballMonth> Projection { get; set; } = new();
    public int TotalMonths { get; set; }
    public decimal TotalInterest { get; set; }
}

public class DebtSnowballMonth
{
    public int Month { get; set; }
    public int DebtsRemaining { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal RemainingBalance { get; set; }
}

/// <summary>
/// DTO for debt avalanche projection (highest interest first).
/// </summary>
public class DebtAvalancheProjection
{
    public List<DebtPayoffMonth> Projection { get; set; } = new();
    public int TotalMonths { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal InterestSavedVsSnowball { get; set; }
}

/// <summary>
/// Month-by-month debt payoff details.
/// </summary>
public class DebtPayoffMonth
{
    public int Month { get; set; }
    public int DebtsRemaining { get; set; }
    public decimal PrincipalPaid { get; set; }
    public decimal InterestPaid { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal RemainingBalance { get; set; }
    public List<DebtStatus> DebtStatuses { get; set; } = new();
}

/// <summary>
/// Individual debt status in a given month.
/// </summary>
public class DebtStatus
{
    public int DebtId { get; set; }
    public string DebtName { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal Payment { get; set; }
    public bool IsPaidOff { get; set; }
}

/// <summary>
/// Comparison of snowball vs avalanche methods.
/// </summary>
public class DebtMethodComparisonResponse
{
    public DebtSnowballProjection Snowball { get; set; } = new();
    public DebtAvalancheProjection Avalanche { get; set; } = new();
    public string Recommendation { get; set; } = string.Empty;
    public int MonthsSaved { get; set; }
    public decimal InterestSaved { get; set; }
}

/// <summary>
/// 12-month budget projection.
/// </summary>
public class TwelveMonthProjection
{
    public int HouseholdId { get; set; }
    public DateTime StartMonth { get; set; }
    public List<MonthlyProjection> Months { get; set; } = new();
    public ProjectionSummary Summary { get; set; } = new();
}

/// <summary>
/// Single month projection data.
/// </summary>
public class MonthlyProjection
{
    public int MonthNumber { get; set; }
    public DateTime Date { get; set; }
    public decimal Income { get; set; }
    public decimal Expenses { get; set; }
    public decimal DebtPayments { get; set; }
    public decimal Savings { get; set; }
    public decimal NetCashFlow { get; set; }
    public decimal CumulativeSavings { get; set; }
    public decimal TotalDebtRemaining { get; set; }
    public int DebtsRemaining { get; set; }
    public List<GoalProgressSnapshot> GoalProgress { get; set; } = new();
}

/// <summary>
/// Goal progress snapshot for a month.
/// </summary>
public class GoalProgressSnapshot
{
    public int GoalId { get; set; }
    public string GoalName { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public decimal PercentageComplete { get; set; }
    public bool IsAchieved { get; set; }
    public int? MonthsRemaining { get; set; }
}

/// <summary>
/// Summary of 12-month projection.
/// </summary>
public class ProjectionSummary
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalSavings { get; set; }
    public decimal TotalDebtPayments { get; set; }
    public int DebtFreeMonth { get; set; }
    public int GoalsAchieved { get; set; }
    public List<string> Milestones { get; set; } = new();
}

/// <summary>
/// Guardrail violation warning.
/// </summary>
public class GuardrailViolation
{
    public string Category { get; set; } = string.Empty;
    public decimal CurrentPercentage { get; set; }
    public decimal RecommendedMin { get; set; }
    public decimal RecommendedMax { get; set; }
    public string Severity { get; set; } = string.Empty; // "Warning", "Critical"
    public string Message { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}

/// <summary>
/// Budget reallocation suggestion.
/// </summary>
public class ReallocationSuggestion
{
    public string FromCategory { get; set; } = string.Empty;
    public string ToCategory { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public decimal ImpactScore { get; set; }
}

/// <summary>
/// Budget validation result with guardrails and suggestions.
/// </summary>
public class BudgetValidationResponse
{
    public bool IsBalanced { get; set; }
    public decimal Surplus { get; set; }
    public decimal Deficit { get; set; }
    public List<GuardrailViolation> Violations { get; set; } = new();
    public List<ReallocationSuggestion> Suggestions { get; set; } = new();
    public string OverallAssessment { get; set; } = string.Empty;
}


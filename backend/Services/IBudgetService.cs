using backend.DTOs;
using backend.Models;

namespace backend.Services;

/// <summary>
/// Service interface for budget-related business logic.
/// </summary>
public interface IBudgetService
{
    // Budget generation
    Task<BudgetResponse> GenerateBudgetAsync(int householdId, string methodology, int month, int year);

    // Debt payoff projections
    Task<DebtSnowballProjection> GenerateDebtSnowballProjectionAsync(int householdId, decimal monthlySurplus);
    Task<DebtAvalancheProjection> GenerateDebtAvalancheProjectionAsync(int householdId, decimal monthlySurplus);
    Task<DebtMethodComparisonResponse> CompareDebtMethodsAsync(int householdId, decimal monthlySurplus);

    // 12-month projection
    Task<TwelveMonthProjection> Generate12MonthProjectionAsync(int householdId, int startingBudgetId);

    // Budget validation and guardrails
    Task<BudgetValidationResponse> ValidateBudgetAsync(int householdId, Dictionary<int, decimal> categoryAmounts);
    Task<List<GuardrailViolation>> CheckGuardrailsAsync(int householdId, Dictionary<int, decimal> categoryAmounts);
    Task<List<ReallocationSuggestion>> SuggestReallocationsAsync(int householdId, Dictionary<int, decimal> categoryAmounts);

    // Utility methods
    decimal ConvertToMonthlyAmount(decimal amount, string cadence);
}


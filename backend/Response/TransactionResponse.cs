namespace backend.DTOs;

/// <summary>
/// Data Transfer Object for transaction responses.
/// Includes category information for easier frontend consumption.
/// </summary>
public class TransactionResponse
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsNeed { get; set; }
    public decimal Amount { get; set; }
    public string Note { get; set; } = string.Empty;
}

/// <summary>
/// DTO for creating a new transaction.
/// </summary>
public class CreateTransactionRequest
{
    public int HouseholdId { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Note { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing transaction.
/// </summary>
public class UpdateTransactionRequest
{
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Note { get; set; } = string.Empty;
}

/// <summary>
/// DTO for budget vs actual comparison.
/// </summary>
public class BudgetVsActualResponse
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsNeed { get; set; }
    public decimal BudgetedAmount { get; set; }
    public decimal ActualAmount { get; set; }
    public decimal Difference { get; set; }
    public decimal PercentageUsed { get; set; }
    public bool IsOverBudget { get; set; }
}

/// <summary>
/// DTO for spending summary by category.
/// </summary>
public class SpendingSummaryResponse
{
    public int HouseholdId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal TotalSpending { get; set; }
    public List<CategorySpending> CategoryBreakdown { get; set; } = new();
}

/// <summary>
/// Category spending breakdown.
/// </summary>
public class CategorySpending
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsNeed { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PercentageOfTotal { get; set; }
    public int TransactionCount { get; set; }
}


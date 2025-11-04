namespace backend.DTOs;

/// <summary>
/// Response DTO for household data with all related entities flattened for frontend consumption.
/// </summary>
public class HouseholdResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string State { get; set; } = string.Empty;
    public int HouseholdSize { get; set; }
    public List<IncomeDto> Incomes { get; set; } = new();
    public List<ExpenseDto> Expenses { get; set; } = new();
    public List<DebtDto> Debts { get; set; } = new();
    public List<GoalDto> Goals { get; set; } = new();
}

public class IncomeDto
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Cadence { get; set; } = string.Empty;
    public decimal GrossAmount { get; set; }
}

public class ExpenseDto
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsNeed { get; set; }
    public string Cadence { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }
}

public class DebtDto
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal Apr { get; set; }
    public decimal MinPayment { get; set; }
}

public class GoalDto
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; }
}


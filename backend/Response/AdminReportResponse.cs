namespace backend.DTOs;

/// <summary>
/// Response DTOs for admin reporting endpoints.
/// </summary>
public class AdminDashboardResponse
{
    public int TotalUsers { get; set; }
    public int TotalHouseholds { get; set; }
    public int TotalBudgets { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalDebts { get; set; }
    public int TotalTransactions { get; set; }
    public double AverageHouseholdSize { get; set; }
    public string MostCommonState { get; set; } = string.Empty;
    public int MostCommonStateCount { get; set; }
    public string MostPopularMethodology { get; set; } = string.Empty;
    public int MostPopularMethodologyCount { get; set; }
}

public class FinancialSummaryResponse
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalDebts { get; set; }
    public decimal NetCashFlow { get; set; }
    public int HouseholdCount { get; set; }
    public decimal AverageIncomePerHousehold { get; set; }
    public decimal AverageExpensesPerHousehold { get; set; }
}

public class UserActivityResponse
{
    public Dictionary<string, int> UserRegistrationsByMonth { get; set; } = new();
    public Dictionary<string, int> BudgetCreationsByMonth { get; set; } = new();
    public int TotalUsers { get; set; }
    public int TotalBudgets { get; set; }
}

public class UserListResponse
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public int? CurrentHouseholdId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class HouseholdListResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public int HouseholdSize { get; set; }
    public int IncomeCount { get; set; }
    public int ExpenseCount { get; set; }
    public int DebtCount { get; set; }
}

public class BudgetListResponse
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Methodology { get; set; } = string.Empty;
    public DateTime Month { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalPlanned { get; set; }
}


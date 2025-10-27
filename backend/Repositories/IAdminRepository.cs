using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository interface for admin-specific operations and reporting.
/// </summary>
public interface IAdminRepository
{
    // User Management
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task<int> GetTotalUserCountAsync();

    // Household Management
    Task<IEnumerable<Household>> GetAllHouseholdsAsync();
    Task<int> GetTotalHouseholdCountAsync();

    // Budget Management
    Task<IEnumerable<Budget>> GetAllBudgetsAsync();
    Task<int> GetTotalBudgetCountAsync();

    // Financial Summary Reports
    Task<decimal> GetTotalIncomeAcrossAllHouseholdsAsync();
    Task<decimal> GetTotalExpensesAcrossAllHouseholdsAsync();
    Task<decimal> GetTotalDebtsAcrossAllHouseholdsAsync();
    Task<int> GetTotalTransactionCountAsync();

    // User Activity Reports
    Task<Dictionary<string, int>> GetUserRegistrationsByMonthAsync(int year);
    Task<Dictionary<string, int>> GetBudgetCreationsByMonthAsync(int year);

    // Dashboard Statistics
    Task<Dictionary<string, object>> GetDashboardStatisticsAsync();
}


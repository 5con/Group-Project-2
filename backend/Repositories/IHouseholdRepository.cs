using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository interface for Household data access operations.
/// </summary>
public interface IHouseholdRepository
{
    Task<Household?> GetByIdAsync(int id);
    Task<Household?> GetByUserIdAsync(int userId);
    Task<IEnumerable<Household>> GetAllAsync();
    Task<int> CreateAsync(Household household);
    Task UpdateAsync(Household household);
    Task DeleteAsync(int id);

    // Income operations
    Task<IEnumerable<Income>> GetIncomesAsync(int householdId);
    Task<int> CreateIncomeAsync(Income income);
    Task DeleteIncomesAsync(int householdId);

    // Expense operations
    Task<IEnumerable<Expense>> GetExpensesAsync(int householdId);
    Task<int> CreateExpenseAsync(Expense expense);
    Task DeleteExpensesAsync(int householdId);

    // Debt operations
    Task<IEnumerable<Debt>> GetDebtsAsync(int householdId);
    Task<int> CreateDebtAsync(Debt debt);
    Task DeleteDebtsAsync(int householdId);

    // Goal operations
    Task<IEnumerable<Goal>> GetGoalsAsync(int householdId);
    Task<int> CreateGoalAsync(Goal goal);
    Task DeleteGoalsAsync(int householdId);
}


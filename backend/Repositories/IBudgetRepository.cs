using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository interface for Budget data access operations.
/// </summary>
public interface IBudgetRepository
{
    Task<Budget?> GetByIdAsync(int id);
    Task<IEnumerable<Budget>> GetByHouseholdIdAsync(int householdId, int? year = null);
    Task<IEnumerable<Budget>> GetAllAsync();
    Task<int> CreateAsync(Budget budget);
    Task UpdateAsync(Budget budget);
    Task DeleteAsync(int id);

    // Budget Item operations
    Task<IEnumerable<BudgetItem>> GetBudgetItemsAsync(int budgetId);
    Task<int> CreateBudgetItemAsync(BudgetItem budgetItem);
    Task UpdateBudgetItemAsync(BudgetItem budgetItem);
    Task DeleteBudgetItemsAsync(int budgetId);
}


using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository interface for transaction data access.
/// Follows Interface Segregation Principle - focused on transaction operations only.
/// </summary>
public interface ITransactionRepository
{
    /// <summary>
    /// Creates a new transaction and returns its ID.
    /// </summary>
    Task<int> CreateAsync(Transaction transaction);

    /// <summary>
    /// Gets a transaction by ID.
    /// </summary>
    Task<Transaction?> GetByIdAsync(int id);

    /// <summary>
    /// Gets all transactions for a household.
    /// </summary>
    Task<IEnumerable<Transaction>> GetByHouseholdIdAsync(int householdId);

    /// <summary>
    /// Gets transactions for a household within a date range.
    /// </summary>
    Task<IEnumerable<Transaction>> GetByHouseholdIdAndDateRangeAsync(int householdId, DateTime startDate, DateTime endDate);

    /// <summary>
    /// Gets transactions for a household by category.
    /// </summary>
    Task<IEnumerable<Transaction>> GetByHouseholdIdAndCategoryAsync(int householdId, int categoryId);

    /// <summary>
    /// Gets transactions for a specific month and year.
    /// </summary>
    Task<IEnumerable<Transaction>> GetByHouseholdIdAndMonthAsync(int householdId, int year, int month);

    /// <summary>
    /// Updates an existing transaction.
    /// </summary>
    Task<bool> UpdateAsync(Transaction transaction);

    /// <summary>
    /// Deletes a transaction by ID.
    /// </summary>
    Task<bool> DeleteAsync(int id);

    /// <summary>
    /// Gets total spending by category for a household within a date range.
    /// </summary>
    Task<Dictionary<int, decimal>> GetSpendingByCategoryAsync(int householdId, DateTime startDate, DateTime endDate);

    /// <summary>
    /// Gets total spending for a household within a date range.
    /// </summary>
    Task<decimal> GetTotalSpendingAsync(int householdId, DateTime startDate, DateTime endDate);
}


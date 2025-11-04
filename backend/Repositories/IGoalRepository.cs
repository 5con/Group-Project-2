using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository interface for goal data access and progress tracking.
/// Follows Interface Segregation Principle - focused on goal operations only.
/// </summary>
public interface IGoalRepository
{
    /// <summary>
    /// Creates a new goal and returns its ID.
    /// </summary>
    Task<int> CreateAsync(Goal goal);

    /// <summary>
    /// Gets a goal by ID.
    /// </summary>
    Task<Goal?> GetByIdAsync(int id);

    /// <summary>
    /// Gets all goals for a household.
    /// </summary>
    Task<IEnumerable<Goal>> GetByHouseholdIdAsync(int householdId);

    /// <summary>
    /// Gets goals filtered by type.
    /// </summary>
    Task<IEnumerable<Goal>> GetByHouseholdIdAndTypeAsync(int householdId, string type);

    /// <summary>
    /// Gets goals ordered by priority.
    /// </summary>
    Task<IEnumerable<Goal>> GetByHouseholdIdOrderedByPriorityAsync(int householdId);

    /// <summary>
    /// Updates an existing goal.
    /// </summary>
    Task<bool> UpdateAsync(Goal goal);

    /// <summary>
    /// Deletes a goal by ID.
    /// </summary>
    Task<bool> DeleteAsync(int id);

    /// <summary>
    /// Gets goal progress (amount saved) from transactions/allocations.
    /// </summary>
    Task<decimal> GetGoalProgressAsync(int goalId);

    /// <summary>
    /// Calculates projected completion date based on current savings rate.
    /// </summary>
    Task<DateTime?> ProjectGoalCompletionDateAsync(int goalId, decimal monthlySavings);
}


namespace backend.Services;

/// <summary>
/// Service interface for data export functionality.
/// </summary>
public interface IExportService
{
    /// <summary>
    /// Exports transactions to CSV format.
    /// </summary>
    Task<byte[]> ExportTransactionsToCsvAsync(int householdId, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Exports budget to CSV format.
    /// </summary>
    Task<byte[]> ExportBudgetToCsvAsync(int budgetId);

    /// <summary>
    /// Exports budget to CSV format by household and month.
    /// </summary>
    Task<byte[]> ExportBudgetByHouseholdAndMonthAsync(int householdId, string month);

    /// <summary>
    /// Exports household financial data to JSON format.
    /// </summary>
    Task<string> ExportHouseholdToJsonAsync(int householdId);

    /// <summary>
    /// Exports all goals to CSV format.
    /// </summary>
    Task<byte[]> ExportGoalsToCsvAsync(int householdId);
}


using System.Globalization;
using System.Text;
using System.Text.Json;
using CsvHelper;
using backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service for exporting financial data to various formats.
/// </summary>
public class ExportService : IExportService
{
    private readonly ITransactionRepository _transactionRepository;
    private readonly IBudgetRepository _budgetRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly IGoalRepository _goalRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;

    public ExportService(
        ITransactionRepository transactionRepository,
        IBudgetRepository budgetRepository,
        IHouseholdRepository householdRepository,
        IGoalRepository goalRepository,
        IReferenceDataRepository referenceDataRepository)
    {
        _transactionRepository = transactionRepository;
        _budgetRepository = budgetRepository;
        _householdRepository = householdRepository;
        _goalRepository = goalRepository;
        _referenceDataRepository = referenceDataRepository;
    }

    public async Task<byte[]> ExportTransactionsToCsvAsync(int householdId, DateTime? startDate = null, DateTime? endDate = null)
    {
        IEnumerable<Models.Transaction> transactions;

        if (startDate.HasValue && endDate.HasValue)
        {
            transactions = await _transactionRepository.GetByHouseholdIdAndDateRangeAsync(
                householdId, startDate.Value, endDate.Value);
        }
        else
        {
            transactions = await _transactionRepository.GetByHouseholdIdAsync(householdId);
        }

        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var records = transactions.Select(t => new
        {
            Date = t.Date.ToString("yyyy-MM-dd"),
            Category = categoryDict.ContainsKey(t.CategoryId) ? categoryDict[t.CategoryId].Name : "Unknown",
            Amount = t.Amount,
            Note = t.Note
        }).ToList();

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        await csv.WriteRecordsAsync(records);
        await writer.FlushAsync();

        return memoryStream.ToArray();
    }

    public async Task<byte[]> ExportBudgetToCsvAsync(int budgetId)
    {
        var budget = await _budgetRepository.GetByIdAsync(budgetId);
        if (budget == null)
        {
            throw new ArgumentException($"Budget {budgetId} not found");
        }

        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budgetId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var records = budgetItems.Select(bi => new
        {
            Category = categoryDict.ContainsKey(bi.CategoryId) ? categoryDict[bi.CategoryId].Name : "Unknown",
            Type = categoryDict.ContainsKey(bi.CategoryId) && categoryDict[bi.CategoryId].IsNeed ? "Need" : "Want",
            PlannedAmount = bi.PlannedAmount
        }).ToList();

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        await csv.WriteRecordsAsync(records);
        await writer.FlushAsync();

        return memoryStream.ToArray();
    }

    public async Task<byte[]> ExportBudgetByHouseholdAndMonthAsync(int householdId, string month)
    {
        // Parse month in YYYY-MM format
        if (!DateTime.TryParse($"{month}-01", out DateTime targetDate))
        {
            throw new ArgumentException("Invalid month format. Expected YYYY-MM");
        }

        var budgets = await _budgetRepository.GetByHouseholdIdAsync(householdId, targetDate.Year);
        var targetBudget = budgets.FirstOrDefault(b => b.Month.Month == targetDate.Month && b.Month.Year == targetDate.Year);

        if (targetBudget == null)
        {
            throw new ArgumentException($"No budget found for household {householdId} in {month}");
        }

        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(targetBudget.Id);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var records = budgetItems.Select(bi => new
        {
            Category = categoryDict.ContainsKey(bi.CategoryId) ? categoryDict[bi.CategoryId].Name : "Unknown",
            Type = categoryDict.ContainsKey(bi.CategoryId) && categoryDict[bi.CategoryId].IsNeed ? "Need" : "Want",
            PlannedAmount = bi.PlannedAmount,
            BudgetMonth = targetBudget.Month.ToString("yyyy-MM"),
            Methodology = targetBudget.Methodology,
            Notes = targetBudget.Notes
        }).ToList();

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        await csv.WriteRecordsAsync(records);
        await writer.FlushAsync();

        return memoryStream.ToArray();
    }

    public async Task<string> ExportHouseholdToJsonAsync(int householdId)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new ArgumentException($"Household {householdId} not found");
        }

        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var expenses = await _householdRepository.GetExpensesAsync(householdId);
        var debts = await _householdRepository.GetDebtsAsync(householdId);
        var goals = await _goalRepository.GetByHouseholdIdAsync(householdId);
        var budgets = await _budgetRepository.GetByHouseholdIdAsync(householdId, null);

        var export = new
        {
            household = new
            {
                household.Id,
                household.State,
                household.HouseholdSize
            },
            incomes,
            expenses,
            debts,
            goals,
            budgets = budgets.Select(b => new
            {
                b.Id,
                b.Methodology,
                b.Month,
                b.Notes
            })
        };

        return JsonSerializer.Serialize(export, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    public async Task<byte[]> ExportGoalsToCsvAsync(int householdId)
    {
        var goals = await _goalRepository.GetByHouseholdIdAsync(householdId);

        var records = goals.Select(g => new
        {
            g.Type,
            g.Name,
            TargetAmount = g.TargetAmount,
            TargetDate = g.TargetDate?.ToString("yyyy-MM-dd") ?? "N/A",
            g.Priority
        }).ToList();

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        await csv.WriteRecordsAsync(records);
        await writer.FlushAsync();

        return memoryStream.ToArray();
    }
}


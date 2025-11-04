using Microsoft.AspNetCore.Mvc;
using backend.Repositories;
using backend.Models;
using backend.DTOs;

namespace backend.Controllers;

/// <summary>
/// Controller for transaction management and spending tracking.
/// Follows Single Responsibility Principle - handles only transaction-related HTTP operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TransactionController : ControllerBase
{
    private readonly ITransactionRepository _transactionRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;
    private readonly IBudgetRepository _budgetRepository;

    public TransactionController(
        ITransactionRepository transactionRepository,
        IHouseholdRepository householdRepository,
        IReferenceDataRepository referenceDataRepository,
        IBudgetRepository budgetRepository)
    {
        _transactionRepository = transactionRepository ?? throw new ArgumentNullException(nameof(transactionRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _referenceDataRepository = referenceDataRepository ?? throw new ArgumentNullException(nameof(referenceDataRepository));
        _budgetRepository = budgetRepository ?? throw new ArgumentNullException(nameof(budgetRepository));
    }

    /// <summary>
    /// Creates a new transaction.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        try
        {
            // Validate household exists
            var household = await _householdRepository.GetByIdAsync(request.HouseholdId);
            if (household == null)
            {
                return NotFound($"Household {request.HouseholdId} not found");
            }

            // Validate category exists
            var categories = await _referenceDataRepository.GetAllCategoriesAsync();
            var category = categories.FirstOrDefault(c => c.Id == request.CategoryId);
            if (category == null)
            {
                return NotFound($"Category {request.CategoryId} not found");
            }

            var transaction = new Transaction
            {
                HouseholdId = request.HouseholdId,
                Date = request.Date,
                CategoryId = request.CategoryId,
                Amount = request.Amount,
                Note = request.Note
            };

            var transactionId = await _transactionRepository.CreateAsync(transaction);

            return Ok(new
            {
                TransactionId = transactionId,
                Message = "Transaction created successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to create transaction", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets a transaction by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        var transaction = await _transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction {id} not found");
        }

        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var category = categories.FirstOrDefault(c => c.Id == transaction.CategoryId);

        var response = new TransactionResponse
        {
            Id = transaction.Id,
            HouseholdId = transaction.HouseholdId,
            Date = transaction.Date,
            CategoryId = transaction.CategoryId,
            CategoryName = category?.Name ?? "Unknown",
            IsNeed = category?.IsNeed ?? false,
            Amount = transaction.Amount,
            Note = transaction.Note
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets all transactions for a household.
    /// </summary>
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdTransactions(
        int householdId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null)
    {
        IEnumerable<Transaction> transactions;

        if (startDate.HasValue && endDate.HasValue)
        {
            transactions = await _transactionRepository.GetByHouseholdIdAndDateRangeAsync(
                householdId, startDate.Value, endDate.Value);
        }
        else if (categoryId.HasValue)
        {
            transactions = await _transactionRepository.GetByHouseholdIdAndCategoryAsync(
                householdId, categoryId.Value);
        }
        else
        {
            transactions = await _transactionRepository.GetByHouseholdIdAsync(householdId);
        }

        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var responses = transactions.Select(t => new TransactionResponse
        {
            Id = t.Id,
            HouseholdId = t.HouseholdId,
            Date = t.Date,
            CategoryId = t.CategoryId,
            CategoryName = categoryDict.ContainsKey(t.CategoryId) ? categoryDict[t.CategoryId].Name : "Unknown",
            IsNeed = categoryDict.ContainsKey(t.CategoryId) && categoryDict[t.CategoryId].IsNeed,
            Amount = t.Amount,
            Note = t.Note
        }).ToList();

        return Ok(responses);
    }

    /// <summary>
    /// Gets transactions for a specific month.
    /// </summary>
    [HttpGet("household/{householdId}/month/{year}/{month}")]
    public async Task<IActionResult> GetMonthTransactions(int householdId, int year, int month)
    {
        if (month < 1 || month > 12)
        {
            return BadRequest("Month must be between 1 and 12");
        }

        var transactions = await _transactionRepository.GetByHouseholdIdAndMonthAsync(householdId, year, month);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var responses = transactions.Select(t => new TransactionResponse
        {
            Id = t.Id,
            HouseholdId = t.HouseholdId,
            Date = t.Date,
            CategoryId = t.CategoryId,
            CategoryName = categoryDict.ContainsKey(t.CategoryId) ? categoryDict[t.CategoryId].Name : "Unknown",
            IsNeed = categoryDict.ContainsKey(t.CategoryId) && categoryDict[t.CategoryId].IsNeed,
            Amount = t.Amount,
            Note = t.Note
        }).ToList();

        return Ok(responses);
    }

    /// <summary>
    /// Updates an existing transaction.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransaction(int id, [FromBody] UpdateTransactionRequest request)
    {
        var transaction = await _transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction {id} not found");
        }

        transaction.Date = request.Date;
        transaction.CategoryId = request.CategoryId;
        transaction.Amount = request.Amount;
        transaction.Note = request.Note;

        var updated = await _transactionRepository.UpdateAsync(transaction);
        if (!updated)
        {
            return StatusCode(500, "Failed to update transaction");
        }

        return Ok(new
        {
            TransactionId = id,
            Message = "Transaction updated successfully"
        });
    }

    /// <summary>
    /// Deletes a transaction.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var transaction = await _transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction {id} not found");
        }

        var deleted = await _transactionRepository.DeleteAsync(id);
        if (!deleted)
        {
            return StatusCode(500, "Failed to delete transaction");
        }

        return Ok(new
        {
            TransactionId = id,
            Message = "Transaction deleted successfully"
        });
    }

    /// <summary>
    /// Gets spending summary for a household within a date range.
    /// </summary>
    [HttpGet("household/{householdId}/summary")]
    public async Task<IActionResult> GetSpendingSummary(
        int householdId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var spendingByCategory = await _transactionRepository.GetSpendingByCategoryAsync(
            householdId, startDate, endDate);
        var totalSpending = await _transactionRepository.GetTotalSpendingAsync(
            householdId, startDate, endDate);

        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var transactions = await _transactionRepository.GetByHouseholdIdAndDateRangeAsync(
            householdId, startDate, endDate);
        var transactionCounts = transactions
            .GroupBy(t => t.CategoryId)
            .ToDictionary(g => g.Key, g => g.Count());

        var categoryBreakdown = spendingByCategory.Select(kvp => new CategorySpending
        {
            CategoryId = kvp.Key,
            CategoryName = categoryDict.ContainsKey(kvp.Key) ? categoryDict[kvp.Key].Name : "Unknown",
            IsNeed = categoryDict.ContainsKey(kvp.Key) && categoryDict[kvp.Key].IsNeed,
            TotalAmount = kvp.Value,
            PercentageOfTotal = totalSpending > 0 ? (kvp.Value / totalSpending) * 100 : 0,
            TransactionCount = transactionCounts.ContainsKey(kvp.Key) ? transactionCounts[kvp.Key] : 0
        }).OrderByDescending(c => c.TotalAmount).ToList();

        var response = new SpendingSummaryResponse
        {
            HouseholdId = householdId,
            StartDate = startDate,
            EndDate = endDate,
            TotalSpending = totalSpending,
            CategoryBreakdown = categoryBreakdown
        };

        return Ok(response);
    }

    /// <summary>
    /// Compares budget vs actual spending for a specific budget.
    /// </summary>
    [HttpGet("budget/{budgetId}/vs-actual")]
    public async Task<IActionResult> GetBudgetVsActual(int budgetId)
    {
        var budget = await _budgetRepository.GetByIdAsync(budgetId);
        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budgetId);

        // Get transactions for the budget month
        var startDate = new DateTime(budget.Month.Year, budget.Month.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var spendingByCategory = await _transactionRepository.GetSpendingByCategoryAsync(
            budget.HouseholdId, startDate, endDate);

        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var comparisons = budgetItems.Select(bi =>
        {
            var actualAmount = spendingByCategory.ContainsKey(bi.CategoryId)
                ? spendingByCategory[bi.CategoryId]
                : 0m;
            var difference = bi.PlannedAmount - actualAmount;
            var percentageUsed = bi.PlannedAmount > 0
                ? (actualAmount / bi.PlannedAmount) * 100
                : 0;

            return new BudgetVsActualResponse
            {
                CategoryId = bi.CategoryId,
                CategoryName = categoryDict.ContainsKey(bi.CategoryId)
                    ? categoryDict[bi.CategoryId].Name
                    : "Unknown",
                IsNeed = categoryDict.ContainsKey(bi.CategoryId)
                    && categoryDict[bi.CategoryId].IsNeed,
                BudgetedAmount = bi.PlannedAmount,
                ActualAmount = actualAmount,
                Difference = difference,
                PercentageUsed = percentageUsed,
                IsOverBudget = actualAmount > bi.PlannedAmount
            };
        }).ToList();

        return Ok(comparisons);
    }
}


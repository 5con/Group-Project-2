using Microsoft.AspNetCore.Mvc;
using backend.Repositories;
using backend.Services;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

/// <summary>
/// Controller for budget generation and management.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BudgetController : ControllerBase
{
    private readonly IBudgetRepository _budgetRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;
    private readonly IBudgetService _budgetService;

    public BudgetController(
        IBudgetRepository budgetRepository,
        IHouseholdRepository householdRepository,
        IReferenceDataRepository referenceDataRepository,
        IBudgetService budgetService)
    {
        _budgetRepository = budgetRepository ?? throw new ArgumentNullException(nameof(budgetRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _referenceDataRepository = referenceDataRepository ?? throw new ArgumentNullException(nameof(referenceDataRepository));
        _budgetService = budgetService ?? throw new ArgumentNullException(nameof(budgetService));
    }

    public class BudgetGenerationRequest
    {
        public int HouseholdId { get; set; }
        public string Methodology { get; set; } = "50/30/20";
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class BudgetUpdateRequest
    {
        public Dictionary<int, decimal> CategoryAmounts { get; set; } = new();
        public string Notes { get; set; } = string.Empty;
    }

    /// <summary>
    /// Generates a new budget for a household.
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateBudget([FromBody] BudgetGenerationRequest request)
    {
        try
        {
            var budgetResponse = await _budgetService.GenerateBudgetAsync(
                request.HouseholdId,
                request.Methodology,
                request.Month,
                request.Year);

            // Generate debt snowball projection if household has debts
            var debts = await _householdRepository.GetDebtsAsync(request.HouseholdId);
            DebtSnowballProjection? snowballProjection = null;

            if (debts.Any())
            {
                var surplus = budgetResponse.Summary.NetIncome - budgetResponse.Summary.TotalBudgeted;
                if (surplus > 0)
                {
                    snowballProjection = await _budgetService.GenerateDebtSnowballProjectionAsync(
                        request.HouseholdId,
                        surplus);
                }
            }

            return Ok(new
            {
                budget = budgetResponse,
                snowballProjection = snowballProjection,
                summary = budgetResponse.Summary
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Gets a budget by ID with all items.
    /// </summary>
    [HttpGet("{budgetId}")]
    public async Task<IActionResult> GetBudget(int budgetId)
    {
        var budget = await _budgetRepository.GetByIdAsync(budgetId);
        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budgetId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var response = new BudgetResponse
        {
            Id = budget.Id,
            HouseholdId = budget.HouseholdId,
            Methodology = budget.Methodology,
            Month = budget.Month,
            Notes = budget.Notes,
            BudgetItems = budgetItems.Select(bi => new BudgetItemDto
            {
                Id = bi.Id,
                BudgetId = bi.BudgetId,
                CategoryId = bi.CategoryId,
                CategoryName = categoryDict.ContainsKey(bi.CategoryId) ? categoryDict[bi.CategoryId].Name : "Unknown",
                IsNeed = categoryDict.ContainsKey(bi.CategoryId) && categoryDict[bi.CategoryId].IsNeed,
                PlannedAmount = bi.PlannedAmount
            }).ToList(),
            Summary = new BudgetSummary
            {
                TotalBudgeted = budgetItems.Sum(bi => bi.PlannedAmount)
            }
        };

        // Calculate summary breakdowns
        response.Summary.TotalNeeds = response.BudgetItems
            .Where(bi => bi.IsNeed)
            .Sum(bi => bi.PlannedAmount);

        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
        response.Summary.TotalSavings = response.BudgetItems
            .Where(bi => !bi.IsNeed && savingsKeywords.Any(kw => bi.CategoryName.Contains(kw)))
            .Sum(bi => bi.PlannedAmount);

        response.Summary.TotalWants = response.Summary.TotalBudgeted
            - response.Summary.TotalNeeds
            - response.Summary.TotalSavings;

        return Ok(response);
    }

    /// <summary>
    /// Gets all budgets for a household.
    /// </summary>
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdBudgets(int householdId, [FromQuery] int? year = null)
    {
        var budgets = await _budgetRepository.GetByHouseholdIdAsync(householdId, year);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var responses = new List<BudgetResponse>();
        foreach (var budget in budgets)
        {
            var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budget.Id);

            responses.Add(new BudgetResponse
            {
                Id = budget.Id,
                HouseholdId = budget.HouseholdId,
                Methodology = budget.Methodology,
                Month = budget.Month,
                Notes = budget.Notes,
                BudgetItems = budgetItems.Select(bi => new BudgetItemDto
                {
                    Id = bi.Id,
                    BudgetId = bi.BudgetId,
                    CategoryId = bi.CategoryId,
                    CategoryName = categoryDict.ContainsKey(bi.CategoryId) ? categoryDict[bi.CategoryId].Name : "Unknown",
                    IsNeed = categoryDict.ContainsKey(bi.CategoryId) && categoryDict[bi.CategoryId].IsNeed,
                    PlannedAmount = bi.PlannedAmount
                }).ToList(),
                Summary = new BudgetSummary
                {
                    TotalBudgeted = budgetItems.Sum(bi => bi.PlannedAmount)
                }
            });
        }

        return Ok(responses);
    }

    /// <summary>
    /// Updates a budget's items and notes.
    /// </summary>
    [HttpPut("{budgetId}")]
    public async Task<IActionResult> UpdateBudget(int budgetId, [FromBody] BudgetUpdateRequest request)
    {
        var budget = await _budgetRepository.GetByIdAsync(budgetId);
        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budgetId);
        var budgetItemsList = budgetItems.ToList();

        // Update budget items
        foreach (var (categoryId, amount) in request.CategoryAmounts)
        {
            var budgetItem = budgetItemsList.FirstOrDefault(bi => bi.CategoryId == categoryId);
            if (budgetItem != null)
            {
                // Update existing budget item
                budgetItem.PlannedAmount = amount;
                await _budgetRepository.UpdateBudgetItemAsync(budgetItem);
            }
            else
            {
                // Create new budget item if it doesn't exist
                var newBudgetItem = new BudgetItem
                {
                    BudgetId = budgetId,
                    CategoryId = categoryId,
                    PlannedAmount = amount
                };
                await _budgetRepository.CreateBudgetItemAsync(newBudgetItem);
            }
        }

        // Update budget notes
        budget.Notes = request.Notes;
        await _budgetRepository.UpdateAsync(budget);

        return Ok(new
        {
            BudgetId = budgetId,
            Message = "Budget updated successfully"
        });
    }

    /// <summary>
    /// Deletes a budget and all its items.
    /// </summary>
    [HttpDelete("{budgetId}")]
    public async Task<IActionResult> DeleteBudget(int budgetId)
    {
        var budget = await _budgetRepository.GetByIdAsync(budgetId);
        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        await _budgetRepository.DeleteAsync(budgetId);

        return Ok(new
        {
            BudgetId = budgetId,
            Message = "Budget deleted successfully"
        });
    }

    /// <summary>
    /// Generates debt avalanche projection (highest interest first).
    /// </summary>
    [HttpPost("debt/avalanche")]
    public async Task<IActionResult> GenerateAvalancheProjection([FromBody] DebtProjectionRequest request)
    {
        try
        {
            var avalanche = await _budgetService.GenerateDebtAvalancheProjectionAsync(
                request.HouseholdId, request.MonthlySurplus);

            return Ok(avalanche);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to generate avalanche projection", Details = ex.Message });
        }
    }

    /// <summary>
    /// Compares snowball vs avalanche debt payoff methods.
    /// </summary>
    [HttpPost("debt/compare")]
    public async Task<IActionResult> CompareDebtMethods([FromBody] DebtProjectionRequest request)
    {
        try
        {
            var comparison = await _budgetService.CompareDebtMethodsAsync(
                request.HouseholdId, request.MonthlySurplus);

            return Ok(comparison);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to compare debt methods", Details = ex.Message });
        }
    }

    /// <summary>
    /// Generates 12-month budget projection with debt and goal timelines.
    /// </summary>
    [HttpGet("{budgetId}/projection/12-month")]
    public async Task<IActionResult> Get12MonthProjection(int budgetId)
    {
        try
        {
            var budget = await _budgetRepository.GetByIdAsync(budgetId);
            if (budget == null)
            {
                return NotFound($"Budget {budgetId} not found");
            }

            var projection = await _budgetService.Generate12MonthProjectionAsync(
                budget.HouseholdId, budgetId);

            return Ok(projection);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to generate 12-month projection", Details = ex.Message });
        }
    }

    /// <summary>
    /// Validates a budget against guardrails and provides suggestions.
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateBudget([FromBody] BudgetValidationRequest request)
    {
        try
        {
            var validation = await _budgetService.ValidateBudgetAsync(
                request.HouseholdId, request.CategoryAmounts);

            return Ok(validation);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to validate budget", Details = ex.Message });
        }
    }

    /// <summary>
    /// Checks budget against COLA-adjusted guardrails.
    /// </summary>
    [HttpPost("guardrails")]
    public async Task<IActionResult> CheckGuardrails([FromBody] BudgetValidationRequest request)
    {
        try
        {
            var violations = await _budgetService.CheckGuardrailsAsync(
                request.HouseholdId, request.CategoryAmounts);

            return Ok(violations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to check guardrails", Details = ex.Message });
        }
    }

    /// <summary>
    /// Suggests budget reallocations to resolve deficits.
    /// </summary>
    [HttpPost("suggestions")]
    public async Task<IActionResult> GetReallocationSuggestions([FromBody] BudgetValidationRequest request)
    {
        try
        {
            var suggestions = await _budgetService.SuggestReallocationsAsync(
                request.HouseholdId, request.CategoryAmounts);

            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to generate suggestions", Details = ex.Message });
        }
    }

    // Request DTOs
    public class DebtProjectionRequest
    {
        public int HouseholdId { get; set; }
        public decimal MonthlySurplus { get; set; }
    }

    public class BudgetValidationRequest
    {
        public int HouseholdId { get; set; }
        public Dictionary<int, decimal> CategoryAmounts { get; set; } = new();
    }

    /// <summary>
    /// Live budget recalculation for interactive editor.
    /// Returns validation, suggestions, and updated projections in real-time.
    /// </summary>
    [HttpPost("recalculate")]
    public async Task<IActionResult> RecalculateBudgetLive([FromBody] BudgetRecalculateRequest request)
    {
        try
        {
            // Validate budget
            var validation = await _budgetService.ValidateBudgetAsync(
                request.HouseholdId, request.CategoryAmounts);

            // Calculate surplus/deficit
            var household = await _householdRepository.GetByIdAsync(request.HouseholdId);
            var incomes = await _householdRepository.GetIncomesAsync(request.HouseholdId);
            var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);

            var grossIncome = incomes.Sum(i => _budgetService.ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));
            var netIncome = grossIncome * (1 - stateParam.EstEffectiveTaxRate);
            var totalBudgeted = request.CategoryAmounts.Sum(ca => ca.Value);
            var surplus = netIncome - totalBudgeted;

            // Generate debt projection if surplus exists
            DebtSnowballProjection? snowballProjection = null;
            DebtAvalancheProjection? avalancheProjection = null;

            var debts = await _householdRepository.GetDebtsAsync(request.HouseholdId);
            if (debts.Any() && surplus > 0)
            {
                snowballProjection = await _budgetService.GenerateDebtSnowballProjectionAsync(
                    request.HouseholdId, surplus);
                avalancheProjection = await _budgetService.GenerateDebtAvalancheProjectionAsync(
                    request.HouseholdId, surplus);
            }

            // Calculate needs/wants/savings breakdown
            var categories = await _referenceDataRepository.GetAllCategoriesAsync();
            var categoryDict = categories.ToDictionary(c => c.Id);

            var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
            decimal totalNeeds = 0m, totalWants = 0m, totalSavings = 0m;

            foreach (var (categoryId, amount) in request.CategoryAmounts)
            {
                if (!categoryDict.ContainsKey(categoryId)) continue;

                var category = categoryDict[categoryId];
                if (category.IsNeed)
                {
                    totalNeeds += amount;
                }
                else if (savingsKeywords.Any(kw => category.Name.Contains(kw)))
                {
                    totalSavings += amount;
                }
                else
                {
                    totalWants += amount;
                }
            }

            return Ok(new
            {
                validation,
                financial = new
                {
                    grossIncome,
                    netIncome,
                    totalBudgeted,
                    surplus,
                    deficit = Math.Abs(Math.Min(0, surplus)),
                    totalNeeds,
                    totalWants,
                    totalSavings,
                    needsPercentage = netIncome > 0 ? (totalNeeds / netIncome) * 100 : 0,
                    wantsPercentage = netIncome > 0 ? (totalWants / netIncome) * 100 : 0,
                    savingsPercentage = netIncome > 0 ? (totalSavings / netIncome) * 100 : 0
                },
                debtProjections = new
                {
                    snowball = snowballProjection,
                    avalanche = avalancheProjection
                },
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to recalculate budget", Details = ex.Message });
        }
    }

    public class BudgetRecalculateRequest
    {
        public int HouseholdId { get; set; }
        public Dictionary<int, decimal> CategoryAmounts { get; set; } = new();
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetController : ControllerBase
{
    private readonly AppDbContext _context;

    public BudgetController(AppDbContext context)
    {
        _context = context;
    }

    public class BudgetGenerationRequest
    {
        public int HouseholdId { get; set; }
        public string Methodology { get; set; } = "50/30/20"; // 50/30/20, zero_based, envelope
        public int Month { get; set; } // Month number (1-12)
        public int Year { get; set; }
    }

    public class BudgetUpdateRequest
    {
        public Dictionary<int, decimal> CategoryAmounts { get; set; } = new();
        public string Notes { get; set; } = string.Empty;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateBudget([FromBody] BudgetGenerationRequest request)
    {
        var household = await _context.Households
            .Include(h => h.Incomes)
            .Include(h => h.Expenses)
            .Include(h => h.Debts)
            .Include(h => h.Goals)
            .FirstOrDefaultAsync(h => h.Id == request.HouseholdId);

        if (household == null)
        {
            return NotFound($"Household {request.HouseholdId} not found");
        }

        // Get state parameters for tax and COLA calculations
        var stateParam = await _context.StateParams
            .FirstOrDefaultAsync(sp => sp.State == household.State);

        if (stateParam == null)
        {
            return BadRequest($"State parameters not found for {household.State}");
        }

        // Calculate total monthly income
        var totalMonthlyIncome = household.Incomes
            .Select(income => ConvertToMonthlyAmount(income.GrossAmount, income.Cadence))
            .Sum();

        // Calculate estimated net income (after simple tax)
        var estimatedTax = totalMonthlyIncome * stateParam.EstEffectiveTaxRate;
        var netIncome = totalMonthlyIncome - estimatedTax;

        // Generate budget based on methodology
        var budgetItems = new List<BudgetItem>();
        var budgetDate = new DateTime(request.Year, request.Month, 1);

        if (request.Methodology == "50/30/20")
        {
            budgetItems = Generate503020Budget(netIncome, household, stateParam);
        }
        else if (request.Methodology == "zero_based")
        {
            budgetItems = GenerateZeroBasedBudget(netIncome, household, stateParam);
        }
        else if (request.Methodology == "envelope")
        {
            budgetItems = GenerateEnvelopeBudget(netIncome, household, stateParam);
        }

        // Create budget record
        var budget = new Budget
        {
            HouseholdId = request.HouseholdId,
            Methodology = request.Methodology,
            Month = budgetDate,
            Notes = "Auto-generated budget"
        };

        _context.Budgets.Add(budget);
        await _context.SaveChangesAsync();

        // Add budget items
        foreach (var item in budgetItems)
        {
            item.BudgetId = budget.Id;
        }

        _context.BudgetItems.AddRange(budgetItems);
        await _context.SaveChangesAsync();

        // Generate debt snowball projection
        var snowballProjection = GenerateDebtSnowballProjection(household, netIncome);

        // Reload full budget with categories populated for client grouping
        var full = await _context.Budgets
            .Include(b => b.BudgetItems)
                .ThenInclude(bi => bi.Category)
            .FirstAsync(b => b.Id == budget.Id);

        return Ok(new
        {
            budget = full,
            budgetItems = full.BudgetItems.OrderBy(bi => bi.Category.Name),
            snowballProjection = snowballProjection,
            summary = new
            {
                grossIncome = totalMonthlyIncome,
                estimatedTax = estimatedTax,
                netIncome = netIncome,
                totalBudgeted = full.BudgetItems.Sum(bi => bi.PlannedAmount)
            }
        });
    }

    [HttpGet("{budgetId}")]
    public async Task<IActionResult> GetBudget(int budgetId)
    {
        var budget = await _context.Budgets
            .Include(b => b.BudgetItems)
                .ThenInclude(bi => bi.Category)
            .FirstOrDefaultAsync(b => b.Id == budgetId);

        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        return Ok(budget);
    }

    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdBudgets(int householdId, int? year = null)
    {
        var query = _context.Budgets
            .Where(b => b.HouseholdId == householdId);

        if (year.HasValue)
        {
            query = query.Where(b => b.Month.Year == year.Value);
        }

        var budgets = await query
            .Include(b => b.BudgetItems)
                .ThenInclude(bi => bi.Category)
            .OrderByDescending(b => b.Month)
            .ToListAsync();

        return Ok(budgets);
    }

    [HttpPut("{budgetId}")]
    public async Task<IActionResult> UpdateBudget(int budgetId, [FromBody] BudgetUpdateRequest request)
    {
        var budget = await _context.Budgets
            .Include(b => b.BudgetItems)
            .FirstOrDefaultAsync(b => b.Id == budgetId);

        if (budget == null)
        {
            return NotFound($"Budget {budgetId} not found");
        }

        // Update budget items
        foreach (var (categoryId, amount) in request.CategoryAmounts)
        {
            var budgetItem = budget.BudgetItems.FirstOrDefault(bi => bi.CategoryId == categoryId);
            if (budgetItem != null)
            {
                budgetItem.PlannedAmount = amount;
            }
        }

        budget.Notes = request.Notes;

        await _context.SaveChangesAsync();

        return Ok(budget);
    }

    private List<BudgetItem> Generate503020Budget(decimal netIncome, Household household, StateParam stateParam)
    {
        var categories = _context.Categories.ToList();
        var items = new List<BudgetItem>();

        // 50% Needs - distribute to all needs categories
        var needsAmount = netIncome * 0.5m;
        var needsCategories = categories.Where(c => c.IsNeed).ToList();
        var needsDistribution = new Dictionary<string, decimal>
        {
            { "Housing", 0.35m },
            { "Utilities", 0.10m },
            { "Groceries", 0.15m },
            { "Transportation", 0.10m },
            { "Medical/Health", 0.08m },
            { "Insurance", 0.07m },
            { "Childcare", 0.05m },
            { "Minimum Debt Payments", 0.10m }
        };

        foreach (var category in needsCategories)
        {
            if (needsDistribution.TryGetValue(category.Name, out var percentage))
            {
                var amount = needsAmount * percentage;
                items.Add(new BudgetItem
                {
                    CategoryId = category.Id,
                    PlannedAmount = amount
                });
            }
            else
            {
                // Fallback equal distribution for any missing
                var fallbackAmount = needsAmount / needsCategories.Count;
                items.Add(new BudgetItem
                {
                    CategoryId = category.Id,
                    PlannedAmount = fallbackAmount
                });
            }
        }

        // 30% Wants - only non-savings non-needs
        var wantsAmount = netIncome * 0.3m;
        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
        var wantsCategories = categories.Where(c => !c.IsNeed && !savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        if (wantsCategories.Any())
        {
            var wantsPerCategory = wantsAmount / wantsCategories.Count;
            foreach (var category in wantsCategories)
            {
                items.Add(new BudgetItem
                {
                    CategoryId = category.Id,
                    PlannedAmount = wantsPerCategory
                });
            }
        }

        // 20% Savings/Debt
        var savingsAmount = netIncome * 0.2m;
        var savingsCategories = categories.Where(c => savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        if (savingsCategories.Any())
        {
            var savingsPerCategory = savingsAmount / savingsCategories.Count;
            foreach (var category in savingsCategories)
            {
                // Check if already added as want (shouldn't be)
                if (!items.Any(i => i.CategoryId == category.Id))
                {
                    items.Add(new BudgetItem
                    {
                        CategoryId = category.Id,
                        PlannedAmount = savingsPerCategory
                    });
                }
                else
                {
                    // If somehow added, add to existing
                    var existing = items.First(i => i.CategoryId == category.Id);
                    existing.PlannedAmount += savingsPerCategory;
                }
            }
        }

        return items;
    }

    private List<BudgetItem> GenerateZeroBasedBudget(decimal netIncome, Household household, StateParam stateParam)
    {
        var categories = _context.Categories.ToList();
        var items = new List<BudgetItem>();

        // Start with essential needs
        var remainingIncome = netIncome;

        // Housing
        var housingCategory = categories.FirstOrDefault(c => c.Name == "Housing");
        if (housingCategory != null && remainingIncome > 0)
        {
            var housingAmount = Math.Min(netIncome * 0.25m, remainingIncome);
            remainingIncome -= housingAmount;
            items.Add(new BudgetItem { CategoryId = housingCategory.Id, PlannedAmount = housingAmount });
        }

        // Other needs based on typical percentages - include all needs
        var needsPercentages = new Dictionary<string, decimal>
        {
            { "Groceries", 0.12m },
            { "Transportation", 0.08m },
            { "Utilities", 0.08m },
            { "Insurance", 0.08m },
            { "Medical/Health", 0.08m },
            { "Childcare", 0.05m },
            { "Minimum Debt Payments", 0.10m }
        };

        var needsCategories = categories.Where(c => c.IsNeed && c.Name != "Housing").ToList();
        foreach (var category in needsCategories)
        {
            if (needsPercentages.TryGetValue(category.Name, out var percentage) && remainingIncome > 0)
            {
                var amount = Math.Min(netIncome * percentage, remainingIncome);
                remainingIncome -= amount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
            }
            else if (remainingIncome > 0)
            {
                // Fallback for any missing needs
                var fallbackAmount = Math.Min(remainingIncome * 0.05m, remainingIncome);
                remainingIncome -= fallbackAmount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = fallbackAmount });
            }
        }

        // Distribute remaining to wants and savings
        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
        var wantsCategories = categories.Where(c => !c.IsNeed && !savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        var savingsCategories = categories.Where(c => savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        var nonNeedsCategories = wantsCategories.Concat(savingsCategories).ToList();

        if (nonNeedsCategories.Any() && remainingIncome > 0)
        {
            var remainingPerCategory = remainingIncome / nonNeedsCategories.Count;
            foreach (var category in nonNeedsCategories)
            {
                if (remainingIncome > 0)
                {
                    var amount = Math.Min(remainingPerCategory, remainingIncome);
                    remainingIncome -= amount;

                    // Check if already added (shouldn't for non-needs)
                    var existing = items.FirstOrDefault(i => i.CategoryId == category.Id);
                    if (existing != null)
                    {
                        existing.PlannedAmount += amount;
                    }
                    else
                    {
                        items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
                    }
                }
            }
        }

        return items;
    }

    private List<BudgetItem> GenerateEnvelopeBudget(decimal netIncome, Household household, StateParam stateParam)
    {
        // Similar to zero-based but with more explicit categorization
        return GenerateZeroBasedBudget(netIncome, household, stateParam);
    }

    private object GenerateDebtSnowballProjection(Household household, decimal monthlySurplus)
    {
        var debts = household.Debts.OrderBy(d => d.Balance).ToList();
        var projection = new List<object>();
        var currentSurplus = monthlySurplus;

        // Calculate minimum payments first
        var totalMinPayments = debts.Sum(d => d.MinPayment);
        currentSurplus -= totalMinPayments;

        var month = 0;
        var remainingDebts = debts.ToList();

        while (remainingDebts.Any() && month < 120) // Max 10 years
        {
            month++;
            var monthData = new Dictionary<string, object>();
            var totalPaid = 0m;

            foreach (var debt in remainingDebts.ToList())
            {
                var payment = debt.MinPayment;
                if (debt == remainingDebts.First() && currentSurplus > 0)
                {
                    // Apply surplus to smallest debt (snowball method)
                    payment += currentSurplus;
                    currentSurplus = 0;
                }

                payment = Math.Min(payment, debt.Balance);

                if (payment > 0)
                {
                    debt.Balance -= payment;
                    totalPaid += payment;

                    if (debt.Balance <= 0)
                    {
                        remainingDebts.Remove(debt);
                        if (remainingDebts.Any())
                        {
                            // Move surplus to next debt
                            currentSurplus += debt.MinPayment;
                        }
                    }
                }
            }

            monthData["Month"] = month;
            monthData["DebtsRemaining"] = remainingDebts.Count;
            monthData["TotalPaid"] = totalPaid;
            monthData["RemainingBalance"] = remainingDebts.Sum(d => d.Balance);

            projection.Add(monthData);

            if (!remainingDebts.Any()) break;
        }

        return new
        {
            Projection = projection,
            TotalMonths = month,
            TotalInterest = 0m // Would need more complex calculation for actual interest
        };
    }

    private decimal ConvertToMonthlyAmount(decimal amount, string cadence)
    {
        return cadence.ToLower() switch
        {
            "weekly" => amount * 4.33m,
            "biweekly" => amount * 2.17m,
            "semimonthly" => amount * 2,
            "monthly" => amount,
            _ => amount
        };
    }
}

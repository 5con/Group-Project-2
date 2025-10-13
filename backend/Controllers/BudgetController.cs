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

        return Ok(new
        {
            Budget = budget,
            BudgetItems = budgetItems.OrderBy(bi => bi.Category.Name),
            SnowballProjection = snowballProjection,
            Summary = new
            {
                GrossIncome = totalMonthlyIncome,
                EstimatedTax = estimatedTax,
                NetIncome = netIncome,
                TotalBudgeted = budgetItems.Sum(bi => bi.PlannedAmount)
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

        // 50% Needs
        var needsAmount = netIncome * 0.5m;
        var needsCategories = categories.Where(c => c.IsNeed).ToList();

        // Distribute needs proportionally based on typical percentages
        var needsDistribution = new Dictionary<string, decimal>
        {
            { "Housing", 0.60m }, // 60% of needs
            { "Groceries", 0.20m }, // 20% of needs
            { "Transportation", 0.10m }, // 10% of needs
            { "Utilities", 0.05m }, // 5% of needs
            { "Insurance", 0.05m } // 5% of needs
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
        }

        // 30% Wants
        var wantsAmount = netIncome * 0.3m;
        var wantsCategories = categories.Where(c => !c.IsNeed).ToList();
        var wantsPerCategory = wantsAmount / wantsCategories.Count;

        foreach (var category in wantsCategories.Take(5)) // Limit to first 5 wants categories
        {
            items.Add(new BudgetItem
            {
                CategoryId = category.Id,
                PlannedAmount = wantsPerCategory
            });
        }

        // 20% Savings/Debt
        var savingsAmount = netIncome * 0.2m;
        var debtCategories = categories.Where(c => c.Name.Contains("Debt") || c.Name.Contains("Emergency") || c.Name.Contains("Retirement")).ToList();
        var savingsPerCategory = savingsAmount / debtCategories.Count;

        foreach (var category in debtCategories)
        {
            items.Add(new BudgetItem
            {
                CategoryId = category.Id,
                PlannedAmount = savingsPerCategory
            });
        }

        return items;
    }

    private List<BudgetItem> GenerateZeroBasedBudget(decimal netIncome, Household household, StateParam stateParam)
    {
        var categories = _context.Categories.ToList();
        var items = new List<BudgetItem>();

        // Start with essential needs
        var remainingIncome = netIncome;

        // Housing (25-30% of gross, but we'll use net for zero-based)
        var housingAmount = Math.Min(netIncome * 0.25m, remainingIncome);
        remainingIncome -= housingAmount;

        var housingCategory = categories.FirstOrDefault(c => c.Name == "Housing");
        if (housingCategory != null)
        {
            items.Add(new BudgetItem { CategoryId = housingCategory.Id, PlannedAmount = housingAmount });
        }

        // Other needs based on typical percentages
        var needsPercentages = new Dictionary<string, decimal>
        {
            { "Groceries", 0.12m },
            { "Transportation", 0.08m },
            { "Utilities", 0.08m },
            { "Insurance", 0.08m }
        };

        foreach (var (categoryName, percentage) in needsPercentages)
        {
            var category = categories.FirstOrDefault(c => c.Name == categoryName);
            if (category != null && remainingIncome > 0)
            {
                var amount = Math.Min(netIncome * percentage, remainingIncome);
                remainingIncome -= amount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
            }
        }

        // Distribute remaining to wants and savings
        var wantsCategories = categories.Where(c => !c.IsNeed).ToList();
        var savingsCategories = categories.Where(c => c.Name.Contains("Emergency") || c.Name.Contains("Debt")).ToList();

        var remainingPerCategory = remainingIncome / (wantsCategories.Count + savingsCategories.Count);

        foreach (var category in wantsCategories.Concat(savingsCategories))
        {
            if (remainingIncome > 0)
            {
                var amount = Math.Min(remainingPerCategory, remainingIncome);
                remainingIncome -= amount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
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

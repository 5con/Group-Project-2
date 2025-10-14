using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OnboardingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public OnboardingController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public class OnboardingRequest
    {
        public string Email { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public int HouseholdSize { get; set; }
        public List<IncomeRequest> Incomes { get; set; } = new();
        public List<ExpenseRequest> Expenses { get; set; } = new();
        public List<DebtRequest> Debts { get; set; } = new();
        public List<GoalRequest> Goals { get; set; } = new();
    }

    public class IncomeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Cadence { get; set; } = "monthly";
        public decimal GrossAmount { get; set; }
    }

    public class ExpenseRequest
    {
        public string Name { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string Cadence { get; set; } = "monthly";
        public decimal Amount { get; set; }
        public bool IsRecurring { get; set; }
    }

    public class DebtRequest
    {
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public decimal Apr { get; set; }
        public decimal MinPayment { get; set; }
    }

    public class GoalRequest
    {
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal TargetAmount { get; set; }
        public DateTime? TargetDate { get; set; }
        public int Priority { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> CreateHousehold([FromBody] OnboardingRequest request)
    {
        // Validate state exists
        var stateParam = await _context.StateParams
            .FirstOrDefaultAsync(sp => sp.State == request.State);

        if (stateParam == null)
        {
            return BadRequest($"Invalid state: {request.State}");
        }

        // Create user (normalize email)
        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var user = new User
        {
            Email = normalizedEmail,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Create household
        var household = new Household
        {
            UserId = user.Id,
            State = request.State,
            HouseholdSize = request.HouseholdSize
        };

        _context.Households.Add(household);
        await _context.SaveChangesAsync();

        // Set the user's current household ID
        user.CurrentHouseholdId = household.Id;
        await _context.SaveChangesAsync();

        // Create incomes
        foreach (var incomeReq in request.Incomes)
        {
            var income = new Income
            {
                HouseholdId = household.Id,
                Name = incomeReq.Name,
                Cadence = incomeReq.Cadence,
                GrossAmount = incomeReq.GrossAmount
            };

            _context.Incomes.Add(income);
        }

        // Create expenses
        foreach (var expenseReq in request.Expenses)
        {
            var expense = new Expense
            {
                HouseholdId = household.Id,
                Name = expenseReq.Name,
                CategoryId = expenseReq.CategoryId,
                Cadence = expenseReq.Cadence,
                Amount = expenseReq.Amount,
                IsRecurring = expenseReq.IsRecurring
            };

            _context.Expenses.Add(expense);
        }

        // Create debts
        foreach (var debtReq in request.Debts)
        {
            var debt = new Debt
            {
                HouseholdId = household.Id,
                Type = debtReq.Type,
                Name = debtReq.Name,
                Balance = debtReq.Balance,
                Apr = debtReq.Apr,
                MinPayment = debtReq.MinPayment
            };

            _context.Debts.Add(debt);
        }

        // Create goals
        foreach (var goalReq in request.Goals)
        {
            var goal = new Goal
            {
                HouseholdId = household.Id,
                Type = goalReq.Type,
                Name = goalReq.Name,
                TargetAmount = goalReq.TargetAmount,
                TargetDate = goalReq.TargetDate,
                Priority = goalReq.Priority
            };

            _context.Goals.Add(goal);
        }

        // Create default settings
        var settings = new Setting
        {
            HouseholdId = household.Id,
            StrictMode = false,
            GuardrailOverridesJson = "{}"
        };

        _context.Settings.Add(settings);

        await _context.SaveChangesAsync();

        // Automatically generate initial budget for the user
        await GenerateInitialBudget(household);

        // Generate JWT token for the user
        var token = GenerateJwtToken(user);

        return Ok(new
        {
            UserId = user.Id,
            HouseholdId = household.Id,
            Token = token,
            Email = user.Email,
            Message = "Household created successfully with initial budget generated"
        });
    }

    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHousehold(int householdId)
    {
        var household = await _context.Households
            .Include(h => h.Incomes)
            .Include(h => h.Expenses)
            .ThenInclude(e => e.Category)
            .Include(h => h.Debts)
            .Include(h => h.Goals)
            .FirstOrDefaultAsync(h => h.Id == householdId);

        if (household == null)
        {
            return NotFound($"Household {householdId} not found");
        }

        // Return data as anonymous object to avoid circular references in JSON serialization
        return Ok(new
        {
            Id = household.Id,
            UserId = household.UserId,
            State = household.State,
            HouseholdSize = household.HouseholdSize,
            Incomes = household.Incomes.Select(i => new
            {
                Id = i.Id,
                Name = i.Name,
                Cadence = i.Cadence,
                GrossAmount = i.GrossAmount,
                HouseholdId = i.HouseholdId
            }),
            Expenses = household.Expenses.Select(e => new
            {
                Id = e.Id,
                Name = e.Name,
                Amount = e.Amount,
                Cadence = e.Cadence,
                IsRecurring = e.IsRecurring,
                CategoryId = e.CategoryId,
                HouseholdId = e.HouseholdId,
                Category = e.Category == null ? null : new
                {
                    Id = e.Category.Id,
                    Name = e.Category.Name,
                    IsNeed = e.Category.IsNeed,
                    ParentId = e.Category.ParentId
                }
            }),
            Debts = household.Debts.Select(d => new
            {
                Id = d.Id,
                Type = d.Type,
                Name = d.Name,
                Balance = d.Balance,
                Apr = d.Apr,
                MinPayment = d.MinPayment,
                HouseholdId = d.HouseholdId
            }),
            Goals = household.Goals.Select(g => new
            {
                Id = g.Id,
                Type = g.Type,
                Name = g.Name,
                TargetAmount = g.TargetAmount,
                TargetDate = g.TargetDate,
                Priority = g.Priority,
                HouseholdId = g.HouseholdId
            })
        });
    }

    [HttpGet("household/by-email/{email}")]
    public async Task<IActionResult> GetHouseholdByEmail(string email)
    {
        var normalized = (email ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);

        if (user == null)
        {
            return NotFound($"User with email {email} not found");
        }

        var household = await _context.Households
            .FirstOrDefaultAsync(h => h.UserId == user.Id);

        if (household == null)
        {
            return NotFound($"No household found for user {email}");
        }

        return Ok(household);
    }

    [HttpPut("household/{householdId}")]
    public async Task<IActionResult> UpdateHousehold(int householdId, [FromBody] OnboardingRequest request)
    {
        var household = await _context.Households
            .Include(h => h.Incomes)
            .Include(h => h.Debts)
            .FirstOrDefaultAsync(h => h.Id == householdId);

        if (household == null)
        {
            return NotFound($"Household {householdId} not found");
        }

        // Validate state exists
        var stateParam = await _context.StateParams
            .FirstOrDefaultAsync(sp => sp.State == request.State);

        if (stateParam == null)
        {
            return BadRequest($"Invalid state: {request.State}");
        }

        // Update household basic info
        household.State = request.State;
        household.HouseholdSize = request.HouseholdSize;

        // Update incomes (replace all existing)
        _context.Incomes.RemoveRange(household.Incomes);
        foreach (var incomeReq in request.Incomes)
        {
            var income = new Income
            {
                HouseholdId = household.Id,
                Name = incomeReq.Name,
                Cadence = incomeReq.Cadence,
                GrossAmount = incomeReq.GrossAmount
            };
            _context.Incomes.Add(income);
        }

        // Update debts (replace all existing)
        _context.Debts.RemoveRange(household.Debts);
        foreach (var debtReq in request.Debts)
        {
            var debt = new Debt
            {
                HouseholdId = household.Id,
                Type = debtReq.Type,
                Name = debtReq.Name,
                Balance = debtReq.Balance,
                Apr = debtReq.Apr,
                MinPayment = debtReq.MinPayment
            };
            _context.Debts.Add(debt);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            HouseholdId = household.Id,
            Message = "Household updated successfully"
        });
    }

    private async Task GenerateInitialBudget(Household household)
    {
        try
        {
            // Reload household with related data to ensure incomes/debts are available
            var loadedHousehold = await _context.Households
                .Include(h => h.Incomes)
                .Include(h => h.Debts)
                .FirstOrDefaultAsync(h => h.Id == household.Id);

            if (loadedHousehold == null)
            {
                Console.WriteLine($"Warning: Household {household.Id} not found when generating initial budget");
                return;
            }

            // Get state parameters for tax and COLA calculations
            var stateParam = await _context.StateParams
                .FirstOrDefaultAsync(sp => sp.State == loadedHousehold.State);

            if (stateParam == null)
            {
                Console.WriteLine($"Warning: State parameters not found for {loadedHousehold.State}, skipping budget generation");
                return;
            }

            // Calculate total monthly income
            var totalMonthlyIncome = loadedHousehold.Incomes
                .Select(income => ConvertToMonthlyAmount(income.GrossAmount, income.Cadence))
                .Sum();

            if (totalMonthlyIncome <= 0)
            {
                Console.WriteLine($"Warning: No income found for household {household.Id}, skipping budget generation");
                return;
            }

            // Calculate estimated net income (after simple tax)
            var estimatedTax = totalMonthlyIncome * stateParam.EstEffectiveTaxRate;
            var netIncome = totalMonthlyIncome - estimatedTax;

            // Generate budget using 50/30/20 methodology
            var budgetItems = Generate503020Budget(netIncome, loadedHousehold, stateParam);
            var budgetDate = DateTime.UtcNow;

            // Create budget record
            var budget = new Budget
            {
                HouseholdId = household.Id,
                Methodology = "50/30/20",
                Month = new DateTime(budgetDate.Year, budgetDate.Month, 1),
                Notes = "Auto-generated initial budget"
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

            // Generate debt snowball projection if debts exist
            if (loadedHousehold.Debts.Any())
            {
                var snowballProjection = GenerateDebtSnowballProjection(loadedHousehold, netIncome);
                Console.WriteLine($"Debt snowball projection generated for household {household.Id}");
            }

            Console.WriteLine($"Initial budget generated successfully for household {household.Id}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating initial budget for household {household.Id}: {ex.Message}");
            // Don't throw - we don't want to fail onboarding due to budget generation issues
        }
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
        var wantsPerCategory = wantsAmount / Math.Max(wantsCategories.Count, 1);

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
        var savingsPerCategory = savingsAmount / Math.Max(debtCategories.Count, 1);

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

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong";
        var key = Encoding.ASCII.GetBytes(jwtKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email)
            }),
            Expires = DateTime.UtcNow.AddDays(7), // Token valid for 7 days
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}

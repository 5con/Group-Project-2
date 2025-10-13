using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OnboardingController : ControllerBase
{
    private readonly AppDbContext _context;

    public OnboardingController(AppDbContext context)
    {
        _context = context;
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

        // Create user
        var user = new User
        {
            Email = request.Email,
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

        return Ok(new
        {
            UserId = user.Id,
            HouseholdId = household.Id,
            Message = "Household created successfully"
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

        return Ok(household);
    }

    [HttpGet("household/by-email/{email}")]
    public async Task<IActionResult> GetHouseholdByEmail(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

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
}

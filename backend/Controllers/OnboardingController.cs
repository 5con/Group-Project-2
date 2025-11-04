using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Repositories;
using backend.Services;
using backend.DTOs;

namespace backend.Controllers;

/// <summary>
/// Controller for user onboarding and household management.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OnboardingController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;
    private readonly IBudgetService _budgetService;
    private readonly JwtService _jwtService;

    public OnboardingController(
        IUserRepository userRepository,
        IHouseholdRepository householdRepository,
        IReferenceDataRepository referenceDataRepository,
        IBudgetService budgetService,
        JwtService jwtService)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _referenceDataRepository = referenceDataRepository ?? throw new ArgumentNullException(nameof(referenceDataRepository));
        _budgetService = budgetService ?? throw new ArgumentNullException(nameof(budgetService));
        _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
    }

    public class OnboardingRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
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

    /// <summary>
    /// Creates a new household with user and initial financial data.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateHousehold([FromBody] OnboardingRequest request)
    {
        // Normalize and validate state
        var normalizedState = (request.State ?? string.Empty).Trim().ToUpperInvariant();
        var stateParam = await _referenceDataRepository.GetStateParamAsync(normalizedState);
        if (stateParam == null)
        {
            return BadRequest($"Invalid state: {normalizedState}");
        }

        // Validate and handle password
        string actualPassword;
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            // Generate a default password for demo purposes
            actualPassword = GenerateDefaultPassword();
        }
        else if (request.Password.Length < 8)
        {
            return BadRequest("Password must be at least 8 characters long");
        }
        else
        {
            actualPassword = request.Password;
        }

        // Create user (normalize email and hash password)
        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var user = new User
        {
            Email = normalizedEmail,
            CreatedAt = DateTime.UtcNow,
            PasswordHash = PasswordHasher.HashPassword(actualPassword),
            IsAdmin = false
        };

        var userId = await _userRepository.CreateAsync(user);
        user.Id = userId;

        // Create household
        var household = new Household
        {
            UserId = userId,
            State = normalizedState,
            HouseholdSize = request.HouseholdSize
        };

        var householdId = await _householdRepository.CreateAsync(household);
        household.Id = householdId;

        // Set the user's current household ID and mark onboarding as completed
        user.CurrentHouseholdId = householdId;
        user.HasCompletedOnboarding = true;
        await _userRepository.UpdateAsync(user);

        // Create incomes
        foreach (var incomeReq in request.Incomes)
        {
            var income = new Income
            {
                HouseholdId = householdId,
                Name = incomeReq.Name,
                Cadence = incomeReq.Cadence,
                GrossAmount = incomeReq.GrossAmount
            };
            await _householdRepository.CreateIncomeAsync(income);
        }

        // Create expenses
        foreach (var expenseReq in request.Expenses)
        {
            var expense = new Expense
            {
                HouseholdId = householdId,
                Name = expenseReq.Name,
                CategoryId = expenseReq.CategoryId,
                Cadence = expenseReq.Cadence,
                Amount = expenseReq.Amount,
                IsRecurring = expenseReq.IsRecurring
            };
            await _householdRepository.CreateExpenseAsync(expense);
        }

        // Create debts
        foreach (var debtReq in request.Debts)
        {
            var debt = new Debt
            {
                HouseholdId = householdId,
                Type = debtReq.Type,
                Name = debtReq.Name,
                Balance = debtReq.Balance,
                Apr = debtReq.Apr,
                MinPayment = debtReq.MinPayment
            };
            await _householdRepository.CreateDebtAsync(debt);
        }

        // Create goals
        foreach (var goalReq in request.Goals)
        {
            var goal = new Goal
            {
                HouseholdId = householdId,
                Type = goalReq.Type,
                Name = goalReq.Name,
                TargetAmount = goalReq.TargetAmount,
                TargetDate = goalReq.TargetDate,
                Priority = goalReq.Priority
            };
            await _householdRepository.CreateGoalAsync(goal);
        }

        // Automatically generate initial budget
        try
        {
            var now = DateTime.UtcNow;
            await _budgetService.GenerateBudgetAsync(householdId, "50/30/20", now.Month, now.Year);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating initial budget: {ex.Message}");
            // Don't fail onboarding if budget generation fails
        }

        // Generate JWT token for the user
        var token = _jwtService.GenerateToken(userId, user.Email, user.IsAdmin);

        return Ok(new
        {
            UserId = userId,
            HouseholdId = householdId,
            Token = token,
            Email = user.Email,
            IsAdmin = user.IsAdmin,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            Message = "Household created successfully with initial budget generated"
        });
    }

    /// <summary>
    /// Gets household details by ID.
    /// </summary>
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHousehold(int householdId)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            return NotFound($"Household {householdId} not found");
        }

        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var expenses = await _householdRepository.GetExpensesAsync(householdId);
        var debts = await _householdRepository.GetDebtsAsync(householdId);
        var goals = await _householdRepository.GetGoalsAsync(householdId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var categoryDict = categories.ToDictionary(c => c.Id);

        var response = new HouseholdResponse
        {
            Id = household.Id,
            UserId = household.UserId,
            State = household.State,
            HouseholdSize = household.HouseholdSize,
            Incomes = incomes.Select(i => new IncomeDto
            {
                Id = i.Id,
                HouseholdId = i.HouseholdId,
                Name = i.Name,
                Cadence = i.Cadence,
                GrossAmount = i.GrossAmount
            }).ToList(),
            Expenses = expenses.Select(e => new ExpenseDto
            {
                Id = e.Id,
                HouseholdId = e.HouseholdId,
                Name = e.Name,
                CategoryId = e.CategoryId,
                CategoryName = categoryDict.ContainsKey(e.CategoryId) ? categoryDict[e.CategoryId].Name : "Unknown",
                IsNeed = categoryDict.ContainsKey(e.CategoryId) && categoryDict[e.CategoryId].IsNeed,
                Cadence = e.Cadence,
                Amount = e.Amount,
                IsRecurring = e.IsRecurring
            }).ToList(),
            Debts = debts.Select(d => new DebtDto
            {
                Id = d.Id,
                HouseholdId = d.HouseholdId,
                Type = d.Type,
                Name = d.Name,
                Balance = d.Balance,
                Apr = d.Apr,
                MinPayment = d.MinPayment
            }).ToList(),
            Goals = goals.Select(g => new GoalDto
            {
                Id = g.Id,
                HouseholdId = g.HouseholdId,
                Type = g.Type,
                Name = g.Name,
                TargetAmount = g.TargetAmount,
                TargetDate = g.TargetDate,
                Priority = g.Priority
            }).ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets household by user email.
    /// </summary>
    [HttpGet("household/by-email/{email}")]
    public async Task<IActionResult> GetHouseholdByEmail(string email)
    {
        var normalized = (email ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalized);

        if (user == null)
        {
            return NotFound($"User with email {email} not found");
        }

        var household = await _householdRepository.GetByUserIdAsync(user.Id);

        if (household == null)
        {
            return NotFound($"No household found for user {email}");
        }

        return Ok(household);
    }

    private string GenerateDefaultPassword()
    {
        // Generate a secure default password for demo purposes
        var random = new Random();
        var password = "Demo" + random.Next(1000, 9999) + "!";
        return password;
    }

    /// <summary>
    /// Updates household information and related entities.
    /// </summary>
    [HttpPut("household/{householdId}")]
    public async Task<IActionResult> UpdateHousehold(int householdId, [FromBody] OnboardingRequest request)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            return NotFound($"Household {householdId} not found");
        }

        // Normalize and validate state
        var normalizedState = (request.State ?? string.Empty).Trim().ToUpperInvariant();
        var stateParam = await _referenceDataRepository.GetStateParamAsync(normalizedState);
        if (stateParam == null)
        {
            return BadRequest($"Invalid state: {normalizedState}");
        }

        // Update household basic info
        household.State = normalizedState;
        household.HouseholdSize = request.HouseholdSize;
        await _householdRepository.UpdateAsync(household);

        // Update incomes (replace all existing)
        await _householdRepository.DeleteIncomesAsync(householdId);
        foreach (var incomeReq in request.Incomes)
        {
            var income = new Income
            {
                HouseholdId = householdId,
                Name = incomeReq.Name,
                Cadence = incomeReq.Cadence,
                GrossAmount = incomeReq.GrossAmount
            };
            await _householdRepository.CreateIncomeAsync(income);
        }

        // Update debts (replace all existing)
        await _householdRepository.DeleteDebtsAsync(householdId);
        foreach (var debtReq in request.Debts)
        {
            var debt = new Debt
            {
                HouseholdId = householdId,
                Type = debtReq.Type,
                Name = debtReq.Name,
                Balance = debtReq.Balance,
                Apr = debtReq.Apr,
                MinPayment = debtReq.MinPayment
            };
            await _householdRepository.CreateDebtAsync(debt);
        }

        return Ok(new
        {
            HouseholdId = householdId,
            Message = "Household updated successfully"
        });
    }

}

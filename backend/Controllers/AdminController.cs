using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Repositories;
using backend.DTOs;

namespace backend.Controllers;

/// <summary>
/// Controller for admin-only operations and reporting.
/// Provides comprehensive visibility into all user data and system statistics.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminRepository _adminRepository;
    private readonly IUserRepository _userRepository;
    private readonly IHouseholdRepository _householdRepository;
    private readonly IBudgetRepository _budgetRepository;

    public AdminController(
        IAdminRepository adminRepository,
        IUserRepository userRepository,
        IHouseholdRepository householdRepository,
        IBudgetRepository budgetRepository)
    {
        _adminRepository = adminRepository ?? throw new ArgumentNullException(nameof(adminRepository));
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _budgetRepository = budgetRepository ?? throw new ArgumentNullException(nameof(budgetRepository));
    }

    /// <summary>
    /// Gets a list of all users in the system.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _adminRepository.GetAllUsersAsync();
        var response = users.Select(u => new UserListResponse
        {
            Id = u.Id,
            Email = u.Email,
            IsAdmin = u.IsAdmin,
            CurrentHouseholdId = u.CurrentHouseholdId,
            CreatedAt = u.CreatedAt
        });

        return Ok(response);
    }

    /// <summary>
    /// Gets a list of all households with user information.
    /// </summary>
    [HttpGet("households")]
    public async Task<IActionResult> GetAllHouseholds()
    {
        var households = await _adminRepository.GetAllHouseholdsAsync();
        var users = await _adminRepository.GetAllUsersAsync();
        var userDict = users.ToDictionary(u => u.Id);

        var response = new List<HouseholdListResponse>();
        foreach (var household in households)
        {
            var incomes = await _householdRepository.GetIncomesAsync(household.Id);
            var expenses = await _householdRepository.GetExpensesAsync(household.Id);
            var debts = await _householdRepository.GetDebtsAsync(household.Id);

            response.Add(new HouseholdListResponse
            {
                Id = household.Id,
                UserId = household.UserId,
                UserEmail = userDict.ContainsKey(household.UserId) ? userDict[household.UserId].Email : "Unknown",
                State = household.State,
                HouseholdSize = household.HouseholdSize,
                IncomeCount = incomes.Count(),
                ExpenseCount = expenses.Count(),
                DebtCount = debts.Count()
            });
        }

        return Ok(response);
    }

    /// <summary>
    /// Gets a list of all budgets with user and household information.
    /// </summary>
    [HttpGet("budgets")]
    public async Task<IActionResult> GetAllBudgets()
    {
        var budgets = await _adminRepository.GetAllBudgetsAsync();
        var households = await _adminRepository.GetAllHouseholdsAsync();
        var users = await _adminRepository.GetAllUsersAsync();

        var householdDict = households.ToDictionary(h => h.Id);
        var userDict = users.ToDictionary(u => u.Id);

        var response = new List<BudgetListResponse>();
        foreach (var budget in budgets)
        {
            var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budget.Id);
            var household = householdDict.ContainsKey(budget.HouseholdId) ? householdDict[budget.HouseholdId] : null;
            var userEmail = "Unknown";

            if (household != null && userDict.ContainsKey(household.UserId))
            {
                userEmail = userDict[household.UserId].Email;
            }

            response.Add(new BudgetListResponse
            {
                Id = budget.Id,
                HouseholdId = budget.HouseholdId,
                UserEmail = userEmail,
                Methodology = budget.Methodology,
                Month = budget.Month,
                ItemCount = budgetItems.Count(),
                TotalPlanned = budgetItems.Sum(bi => bi.PlannedAmount)
            });
        }

        return Ok(response);
    }

    /// <summary>
    /// Gets financial summary statistics across all households.
    /// </summary>
    [HttpGet("reports/financial-summary")]
    public async Task<IActionResult> GetFinancialSummary()
    {
        var totalIncome = await _adminRepository.GetTotalIncomeAcrossAllHouseholdsAsync();
        var totalExpenses = await _adminRepository.GetTotalExpensesAcrossAllHouseholdsAsync();
        var totalDebts = await _adminRepository.GetTotalDebtsAcrossAllHouseholdsAsync();
        var householdCount = await _adminRepository.GetTotalHouseholdCountAsync();

        var response = new FinancialSummaryResponse
        {
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            TotalDebts = totalDebts,
            NetCashFlow = totalIncome - totalExpenses,
            HouseholdCount = householdCount,
            AverageIncomePerHousehold = householdCount > 0 ? totalIncome / householdCount : 0,
            AverageExpensesPerHousehold = householdCount > 0 ? totalExpenses / householdCount : 0
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets user activity statistics including registrations and budget creations.
    /// </summary>
    [HttpGet("reports/user-activity")]
    public async Task<IActionResult> GetUserActivity([FromQuery] int? year = null)
    {
        var reportYear = year ?? DateTime.UtcNow.Year;

        var userRegistrations = await _adminRepository.GetUserRegistrationsByMonthAsync(reportYear);
        var budgetCreations = await _adminRepository.GetBudgetCreationsByMonthAsync(reportYear);
        var totalUsers = await _adminRepository.GetTotalUserCountAsync();
        var totalBudgets = await _adminRepository.GetTotalBudgetCountAsync();

        var response = new UserActivityResponse
        {
            UserRegistrationsByMonth = userRegistrations,
            BudgetCreationsByMonth = budgetCreations,
            TotalUsers = totalUsers,
            TotalBudgets = totalBudgets
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets comprehensive dashboard statistics for admin overview.
    /// </summary>
    [HttpGet("reports/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var stats = await _adminRepository.GetDashboardStatisticsAsync();

        var response = new AdminDashboardResponse
        {
            TotalUsers = (int)stats["TotalUsers"],
            TotalHouseholds = (int)stats["TotalHouseholds"],
            TotalBudgets = (int)stats["TotalBudgets"],
            TotalIncome = (decimal)stats["TotalIncome"],
            TotalExpenses = (decimal)stats["TotalExpenses"],
            TotalDebts = (decimal)stats["TotalDebts"],
            TotalTransactions = (int)stats["TotalTransactions"],
            AverageHouseholdSize = (double)stats["AverageHouseholdSize"],
            MostCommonState = stats.ContainsKey("MostCommonState") ? (string)stats["MostCommonState"] : "",
            MostCommonStateCount = stats.ContainsKey("MostCommonStateCount") ? (int)stats["MostCommonStateCount"] : 0,
            MostPopularMethodology = stats.ContainsKey("MostPopularMethodology") ? (string)stats["MostPopularMethodology"] : "",
            MostPopularMethodologyCount = stats.ContainsKey("MostPopularMethodologyCount") ? (int)stats["MostPopularMethodologyCount"] : 0
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets a specific user by ID with full details.
    /// </summary>
    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound($"User {id} not found");
        }

        return Ok(new UserListResponse
        {
            Id = user.Id,
            Email = user.Email,
            IsAdmin = user.IsAdmin,
            CurrentHouseholdId = user.CurrentHouseholdId,
            CreatedAt = user.CreatedAt
        });
    }

    /// <summary>
    /// Gets a specific household by ID with full details.
    /// </summary>
    [HttpGet("households/{id}")]
    public async Task<IActionResult> GetHouseholdById(int id)
    {
        var household = await _householdRepository.GetByIdAsync(id);
        if (household == null)
        {
            return NotFound($"Household {id} not found");
        }

        var user = await _userRepository.GetByIdAsync(household.UserId);
        var incomes = await _householdRepository.GetIncomesAsync(id);
        var expenses = await _householdRepository.GetExpensesAsync(id);
        var debts = await _householdRepository.GetDebtsAsync(id);

        return Ok(new HouseholdListResponse
        {
            Id = household.Id,
            UserId = household.UserId,
            UserEmail = user?.Email ?? "Unknown",
            State = household.State,
            HouseholdSize = household.HouseholdSize,
            IncomeCount = incomes.Count(),
            ExpenseCount = expenses.Count(),
            DebtCount = debts.Count()
        });
    }
}


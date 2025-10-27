using backend.DTOs;
using backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service for generating personalized financial recommendations.
/// Uses rule-based logic to analyze household data and provide actionable insights.
/// </summary>
public class RecommendationService : IRecommendationService
{
    private readonly IHouseholdRepository _householdRepository;
    private readonly IBudgetRepository _budgetRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;
    private readonly IGoalRepository _goalRepository;
    private readonly IBudgetService _budgetService;

    public RecommendationService(
        IHouseholdRepository householdRepository,
        IBudgetRepository budgetRepository,
        IReferenceDataRepository referenceDataRepository,
        IGoalRepository goalRepository,
        IBudgetService budgetService)
    {
        _householdRepository = householdRepository;
        _budgetRepository = budgetRepository;
        _referenceDataRepository = referenceDataRepository;
        _goalRepository = goalRepository;
        _budgetService = budgetService;
    }

    public async Task<List<RecommendationResponse>> GetTopActionsAsync(int householdId)
    {
        var recommendations = new List<RecommendationResponse>();

        var household = await _householdRepository.GetByIdAsync(householdId);
        var debts = (await _householdRepository.GetDebtsAsync(householdId)).ToList();
        var goals = (await _goalRepository.GetByHouseholdIdAsync(householdId)).ToList();
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var budgets = await _budgetRepository.GetByHouseholdIdAsync(householdId, null);

        var monthlyIncome = incomes.Sum(i => _budgetService.ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));

        // Recommendation 1: High-interest debt
        if (debts.Any())
        {
            var highestDebt = debts.OrderByDescending(d => d.Apr).First();
            if (highestDebt.Apr > 15)
            {
                var monthlyInterest = (highestDebt.Balance * (highestDebt.Apr / 100m / 12));
                recommendations.Add(new RecommendationResponse
                {
                    Title = $"Pay down {highestDebt.Name}",
                    Description = $"At {highestDebt.Apr}% APR, you're paying ${monthlyInterest:F2}/month in interest. Extra payments can save hundreds.",
                    ActionType = "pay_debt",
                    Category = "Debt",
                    ImpactAmount = monthlyInterest * 12,
                    Priority = 10,
                    Icon = "bi-credit-card",
                    ActionUrl = "/budget.html"
                });
            }
        }

        // Recommendation 2: Emergency fund
        var emergencyGoals = goals.Where(g => g.Type == "emergency_fund").ToList();
        if (!emergencyGoals.Any())
        {
            recommendations.Add(new RecommendationResponse
            {
                Title = "Build an emergency fund",
                Description = "Start with $1,000, then work toward 3-6 months of expenses. Protects against unexpected costs.",
                ActionType = "increase_savings",
                Category = "Savings",
                ImpactAmount = 1000,
                Priority = 9,
                Icon = "bi-shield-check",
                ActionUrl = "/budget.html"
            });
        }

        // Recommendation 3: Budget adherence
        if (!budgets.Any())
        {
            recommendations.Add(new RecommendationResponse
            {
                Title = "Create your first budget",
                Description = "Track your spending and take control of your finances. Start with a simple 50/30/20 budget.",
                ActionType = "create_budget",
                Category = "Budgeting",
                ImpactAmount = monthlyIncome * 0.1m,
                Priority = 8,
                Icon = "bi-calculator",
                ActionUrl = "/budget.html"
            });
        }

        // Recommendation 4: Subscriptions audit
        var expenses = await _householdRepository.GetExpensesAsync(householdId);
        var subscriptionExpenses = expenses.Where(e => e.Name.ToLower().Contains("subscription") ||
                                                       e.Name.ToLower().Contains("membership")).ToList();
        if (subscriptionExpenses.Any())
        {
            var totalSubscriptions = subscriptionExpenses.Sum(e => _budgetService.ConvertToMonthlyAmount(e.Amount, e.Cadence));
            if (totalSubscriptions > monthlyIncome * 0.05m)
            {
                recommendations.Add(new RecommendationResponse
                {
                    Title = "Review subscriptions",
                    Description = $"You're spending ${totalSubscriptions:F2}/month on subscriptions. Cancel unused services to save money.",
                    ActionType = "reduce_spending",
                    Category = "Wants",
                    ImpactAmount = totalSubscriptions * 0.3m,
                    Priority = 7,
                    Icon = "bi-scissors",
                    ActionUrl = "/budget.html"
                });
            }
        }

        // Recommendation 5: Goal progress
        if (goals.Any())
        {
            var topGoal = goals.OrderBy(g => g.Priority).First();
            recommendations.Add(new RecommendationResponse
            {
                Title = $"Focus on: {topGoal.Name}",
                Description = $"Your top priority goal needs ${topGoal.TargetAmount:F2}. Set up automatic transfers to stay on track.",
                ActionType = "track_goal",
                Category = "Goals",
                ImpactAmount = topGoal.TargetAmount,
                Priority = 6,
                Icon = "bi-bullseye",
                ActionUrl = "/dashboard.html"
            });
        }

        return recommendations.OrderByDescending(r => r.Priority).Take(3).ToList();
    }

    public async Task<List<FinancialTipResponse>> GetContextualTipsAsync(int householdId)
    {
        var tips = new List<FinancialTipResponse>();

        var household = await _householdRepository.GetByIdAsync(householdId);
        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var expenses = await _householdRepository.GetExpensesAsync(householdId);

        var monthlyIncome = incomes.Sum(i => _budgetService.ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));
        var netIncome = monthlyIncome * (1 - stateParam.EstEffectiveTaxRate);

        // Housing cost tip
        var housingExpenses = expenses.Where(e => e.Name.ToLower().Contains("rent") ||
                                                   e.Name.ToLower().Contains("mortgage")).ToList();
        if (housingExpenses.Any())
        {
            var totalHousing = housingExpenses.Sum(e => _budgetService.ConvertToMonthlyAmount(e.Amount, e.Cadence));
            var housingPercentage = (totalHousing / monthlyIncome) * 100;
            var adjustedMax = 30m * stateParam.ColaIndex;

            if (housingPercentage > adjustedMax)
            {
                tips.Add(new FinancialTipResponse
                {
                    Title = "Housing costs are high",
                    Content = $"Your housing is {housingPercentage:F1}% of gross income (recommended max: {adjustedMax:F1}% for {household.State}). Consider roommates, refinancing, or relocating to reduce costs.",
                    Category = "Housing",
                    Severity = housingPercentage > adjustedMax * 1.2m ? "critical" : "warning",
                    Resources = new List<string> { "HUD Housing Counseling", "State assistance programs" }
                });
            }
        }

        // Savings rate tip
        var savingsRate = netIncome > 0 ? 0m : 0m; // Simplified - would calculate from actual savings
        if (savingsRate < 10)
        {
            tips.Add(new FinancialTipResponse
            {
                Title = "Increase your savings rate",
                Content = "Financial experts recommend saving at least 10-20% of income. Start small and increase gradually.",
                Category = "Savings",
                Severity = "info",
                Resources = new List<string> { "Automate savings", "Use the 50/30/20 rule" }
            });
        }

        // State-specific tip
        if (stateParam.ColaIndex > 1.2m)
        {
            tips.Add(new FinancialTipResponse
            {
                Title = $"High cost of living in {household.State}",
                Content = $"Your state has a {((stateParam.ColaIndex - 1) * 100):F0}% higher cost of living than average. Budget carefully and look for state-specific assistance programs.",
                Category = "General",
                Severity = "info",
                Resources = new List<string> { $"{household.State} state benefits", "Local food banks", "Utility assistance" }
            });
        }

        return tips;
    }

    public async Task<BenchmarkComparisonResponse> GetBenchmarkComparisonAsync(int householdId, int? budgetId = null)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();

        var monthlyIncome = incomes.Sum(i => _budgetService.ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));
        var netIncome = monthlyIncome * (1 - stateParam.EstEffectiveTaxRate);

        var comparisons = new List<CategoryBenchmark>();

        // Get actual spending
        Dictionary<int, decimal> actualSpending;
        if (budgetId.HasValue)
        {
            var budgetItems = await _budgetRepository.GetBudgetItemsAsync(budgetId.Value);
            actualSpending = budgetItems.ToDictionary(bi => bi.CategoryId, bi => bi.PlannedAmount);
        }
        else
        {
            var expenses = await _householdRepository.GetExpensesAsync(householdId);
            actualSpending = expenses
                .GroupBy(e => e.CategoryId)
                .ToDictionary(g => g.Key, g => g.Sum(e => _budgetService.ConvertToMonthlyAmount(e.Amount, e.Cadence)));
        }

        // State averages (simplified - would come from actual data)
        var stateAverages = new Dictionary<string, decimal>
        {
            { "Housing", 0.28m * stateParam.ColaIndex },
            { "Groceries", 0.10m * stateParam.ColaIndex },
            { "Transportation", 0.12m },
            { "Utilities", 0.07m * stateParam.ColaIndex },
            { "Dining Out", 0.06m },
            { "Entertainment", 0.04m }
        };

        var categoryDict = categories.ToDictionary(c => c.Id);

        foreach (var (categoryId, amount) in actualSpending)
        {
            if (!categoryDict.ContainsKey(categoryId)) continue;

            var categoryName = categoryDict[categoryId].Name;
            var yourPercentage = netIncome > 0 ? (amount / netIncome) * 100 : 0;

            if (stateAverages.TryGetValue(categoryName, out var avgPercentage))
            {
                var avgAmount = netIncome * avgPercentage;
                var difference = amount - avgAmount;
                var diffPercentage = avgAmount > 0 ? ((amount - avgAmount) / avgAmount) * 100 : 0;

                string status;
                string insight;

                if (diffPercentage < -10)
                {
                    status = "below_average";
                    insight = $"You're spending less than average - great job controlling {categoryName} costs!";
                }
                else if (diffPercentage > 10)
                {
                    status = "above_average";
                    insight = $"Above average spending. Look for ways to reduce {categoryName} costs.";
                }
                else
                {
                    status = "average";
                    insight = $"Your {categoryName} spending is typical for {household.State}.";
                }

                comparisons.Add(new CategoryBenchmark
                {
                    CategoryName = categoryName,
                    YourAmount = amount,
                    YourPercentage = yourPercentage,
                    StateAverage = avgAmount,
                    StateAveragePercentage = avgPercentage * 100,
                    Difference = difference,
                    Status = status,
                    Insight = insight
                });
            }
        }

        var overallAssessment = comparisons.Count(c => c.Status == "above_average") > comparisons.Count / 2
            ? "Your spending is higher than average in several categories. Review your budget for savings opportunities."
            : "Your spending is generally in line with or below state averages. Keep up the good work!";

        return new BenchmarkComparisonResponse
        {
            State = household.State,
            HouseholdSize = household.HouseholdSize,
            CategoryComparisons = comparisons,
            OverallAssessment = overallAssessment
        };
    }

    public async Task<List<string>> GetQuickWinsAsync(int householdId)
    {
        var quickWins = new List<string>();

        var expenses = await _householdRepository.GetExpensesAsync(householdId);
        var debts = await _householdRepository.GetDebtsAsync(householdId);

        // Quick win: Reduce dining out by 25%
        var diningExpenses = expenses.Where(e => e.Name.ToLower().Contains("dining") ||
                                                  e.Name.ToLower().Contains("restaurant")).ToList();
        if (diningExpenses.Any())
        {
            var totalDining = diningExpenses.Sum(e => _budgetService.ConvertToMonthlyAmount(e.Amount, e.Cadence));
            quickWins.Add($"Cook 1 extra meal at home per week → Save ${totalDining * 0.25m:F2}/month");
        }

        // Quick win: Negotiate bills
        quickWins.Add("Call your internet/phone provider for a better rate → Potential $20-50/month savings");

        // Quick win: Balance transfer for high APR debt
        var highAprDebt = debts.Where(d => d.Apr > 18).ToList();
        if (highAprDebt.Any())
        {
            quickWins.Add($"Consider a balance transfer card (0% intro APR) → Save on interest");
        }

        // Quick win: Cancel unused subscriptions
        var subscriptions = expenses.Where(e => e.IsRecurring &&
                                                e.Name.ToLower().Contains("subscription")).ToList();
        if (subscriptions.Any())
        {
            quickWins.Add($"Cancel 1 unused subscription → Save ${subscriptions.First().Amount:F2}/month");
        }

        return quickWins.Take(3).ToList();
    }

    public async Task<FinancialHealthScore> CalculateHealthScoreAsync(int householdId)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var debts = (await _householdRepository.GetDebtsAsync(householdId)).ToList();
        var goals = (await _goalRepository.GetByHouseholdIdAsync(householdId)).ToList();
        var budgets = await _budgetRepository.GetByHouseholdIdAsync(householdId, null);

        var monthlyIncome = incomes.Sum(i => _budgetService.ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));

        // Budget Score (0-25)
        int budgetScore = budgets.Any() ? 25 : 0;

        // Debt Score (0-25)
        int debtScore = 25;
        if (debts.Any())
        {
            var totalDebt = debts.Sum(d => d.Balance);
            var debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : 0;

            if (debtToIncomeRatio < 0.1m) debtScore = 25;
            else if (debtToIncomeRatio < 0.3m) debtScore = 20;
            else if (debtToIncomeRatio < 0.5m) debtScore = 15;
            else debtScore = 5;
        }

        // Savings Score (0-25) - simplified
        int savingsScore = 10; // Placeholder

        // Goals Score (0-25)
        int goalsScore = goals.Any() ? 20 : 0;

        var overall = budgetScore + debtScore + savingsScore + goalsScore;

        string rating = overall switch
        {
            >= 80 => "Excellent",
            >= 60 => "Good",
            >= 40 => "Fair",
            _ => "Needs Improvement"
        };

        var strengths = new List<string>();
        var improvements = new List<string>();

        if (budgetScore >= 20) strengths.Add("Active budgeting");
        else improvements.Add("Create and follow a monthly budget");

        if (debtScore >= 20) strengths.Add("Manageable debt levels");
        else improvements.Add("Reduce debt-to-income ratio");

        if (goalsScore >= 15) strengths.Add("Goal-oriented planning");
        else improvements.Add("Set financial goals");

        return new FinancialHealthScore
        {
            OverallScore = overall,
            BudgetScore = budgetScore,
            DebtScore = debtScore,
            SavingsScore = savingsScore,
            GoalsScore = goalsScore,
            Rating = rating,
            StrengthAreas = strengths,
            ImprovementAreas = improvements
        };
    }

    public async Task<DashboardRecommendationsResponse> GetDashboardRecommendationsAsync(int householdId, int? budgetId = null)
    {
        var topActions = await GetTopActionsAsync(householdId);
        var tips = await GetContextualTipsAsync(householdId);
        var benchmark = await GetBenchmarkComparisonAsync(householdId, budgetId);
        var quickWins = await GetQuickWinsAsync(householdId);
        var healthScore = await CalculateHealthScoreAsync(householdId);

        return new DashboardRecommendationsResponse
        {
            TopActions = topActions,
            ContextualTips = tips,
            BenchmarkComparison = benchmark,
            QuickWins = quickWins,
            HealthScore = healthScore
        };
    }
}


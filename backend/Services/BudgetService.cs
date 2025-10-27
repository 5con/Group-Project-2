using backend.DTOs;
using backend.Models;
using backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service for budget generation and related calculations.
/// Follows Single Responsibility Principle by handling only budget-related business logic.
/// </summary>
public class BudgetService : IBudgetService
{
    private readonly IHouseholdRepository _householdRepository;
    private readonly IBudgetRepository _budgetRepository;
    private readonly IReferenceDataRepository _referenceDataRepository;

    public BudgetService(
        IHouseholdRepository householdRepository,
        IBudgetRepository budgetRepository,
        IReferenceDataRepository referenceDataRepository)
    {
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
        _budgetRepository = budgetRepository ?? throw new ArgumentNullException(nameof(budgetRepository));
        _referenceDataRepository = referenceDataRepository ?? throw new ArgumentNullException(nameof(referenceDataRepository));
    }

    public async Task<BudgetResponse> GenerateBudgetAsync(int householdId, string methodology, int month, int year)
    {
        var household = await _householdRepository.GetByIdAsync(householdId);
        if (household == null)
        {
            throw new ArgumentException($"Household {householdId} not found");
        }

        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        if (stateParam == null)
        {
            throw new ArgumentException($"State parameters not found for {household.State}");
        }

        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var debts = await _householdRepository.GetDebtsAsync(householdId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();

        // Calculate total monthly income
        var totalMonthlyIncome = incomes.Sum(i => ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));

        // Calculate estimated net income
        var estimatedTax = totalMonthlyIncome * stateParam.EstEffectiveTaxRate;
        var netIncome = totalMonthlyIncome - estimatedTax;

        // Generate budget items based on methodology
        List<BudgetItem> budgetItems;
        if (methodology == "50/30/20")
        {
            budgetItems = Generate503020Budget(netIncome, categories.ToList());
        }
        else if (methodology == "zero_based")
        {
            budgetItems = GenerateZeroBasedBudget(netIncome, categories.ToList());
        }
        else if (methodology == "envelope")
        {
            budgetItems = GenerateEnvelopeBudget(netIncome, categories.ToList());
        }
        else
        {
            throw new ArgumentException($"Unknown methodology: {methodology}");
        }

        // Create budget record
        var budget = new Budget
        {
            HouseholdId = householdId,
            Methodology = methodology,
            Month = new DateTime(year, month, 1),
            Notes = "Auto-generated budget"
        };

        var budgetId = await _budgetRepository.CreateAsync(budget);
        budget.Id = budgetId;

        // Add budget items
        foreach (var item in budgetItems)
        {
            item.BudgetId = budgetId;
            await _budgetRepository.CreateBudgetItemAsync(item);
        }

        // Build response
        var response = new BudgetResponse
        {
            Id = budgetId,
            HouseholdId = householdId,
            Methodology = methodology,
            Month = budget.Month,
            Notes = budget.Notes,
            BudgetItems = new List<BudgetItemDto>(),
            Summary = new BudgetSummary
            {
                GrossIncome = totalMonthlyIncome,
                EstimatedTax = estimatedTax,
                NetIncome = netIncome,
                TotalBudgeted = budgetItems.Sum(bi => bi.PlannedAmount)
            }
        };

        // Map budget items with category names
        var categoryDict = categories.ToDictionary(c => c.Id);
        foreach (var item in budgetItems)
        {
            var category = categoryDict[item.CategoryId];
            response.BudgetItems.Add(new BudgetItemDto
            {
                Id = item.Id,
                BudgetId = item.BudgetId,
                CategoryId = item.CategoryId,
                CategoryName = category.Name,
                IsNeed = category.IsNeed,
                PlannedAmount = item.PlannedAmount
            });
        }

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

        return response;
    }

    public async Task<DebtSnowballProjection> GenerateDebtSnowballProjectionAsync(int householdId, decimal monthlySurplus)
    {
        var debts = (await _householdRepository.GetDebtsAsync(householdId)).OrderBy(d => d.Balance).ToList();
        var projection = new List<DebtSnowballMonth>();
        var currentSurplus = monthlySurplus;

        // Calculate minimum payments first
        var totalMinPayments = debts.Sum(d => d.MinPayment);
        currentSurplus -= totalMinPayments;

        var month = 0;
        var remainingDebts = debts.ToList();

        while (remainingDebts.Any() && month < 120) // Max 10 years
        {
            month++;
            decimal totalPaid = 0;

            foreach (var debt in remainingDebts.ToList())
            {
                var payment = debt.MinPayment;
                if (debt == remainingDebts.First() && currentSurplus > 0)
                {
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
                            currentSurplus += debt.MinPayment;
                        }
                    }
                }
            }

            projection.Add(new DebtSnowballMonth
            {
                Month = month,
                DebtsRemaining = remainingDebts.Count,
                TotalPaid = totalPaid,
                RemainingBalance = remainingDebts.Sum(d => d.Balance)
            });

            if (!remainingDebts.Any()) break;
        }

        return new DebtSnowballProjection
        {
            Projection = projection,
            TotalMonths = month,
            TotalInterest = 0m
        };
    }

    public decimal ConvertToMonthlyAmount(decimal amount, string cadence)
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

    private List<BudgetItem> Generate503020Budget(decimal netIncome, List<Category> categories)
    {
        var items = new List<BudgetItem>();

        // 50% Needs
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
                items.Add(new BudgetItem
                {
                    CategoryId = category.Id,
                    PlannedAmount = needsAmount * percentage
                });
            }
        }

        // 30% Wants
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
                items.Add(new BudgetItem
                {
                    CategoryId = category.Id,
                    PlannedAmount = savingsPerCategory
                });
            }
        }

        return items;
    }

    private List<BudgetItem> GenerateZeroBasedBudget(decimal netIncome, List<Category> categories)
    {
        var items = new List<BudgetItem>();
        var remainingIncome = netIncome;

        var needsPercentages = new Dictionary<string, decimal>
        {
            { "Housing", 0.25m },
            { "Groceries", 0.12m },
            { "Transportation", 0.08m },
            { "Utilities", 0.08m },
            { "Insurance", 0.08m },
            { "Medical/Health", 0.08m },
            { "Childcare", 0.05m },
            { "Minimum Debt Payments", 0.10m }
        };

        var needsCategories = categories.Where(c => c.IsNeed).ToList();
        foreach (var category in needsCategories)
        {
            if (needsPercentages.TryGetValue(category.Name, out var percentage) && remainingIncome > 0)
            {
                var amount = Math.Min(netIncome * percentage, remainingIncome);
                remainingIncome -= amount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
            }
        }

        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
        var wantsCategories = categories.Where(c => !c.IsNeed && !savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        var savingsCategories = categories.Where(c => savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        var nonNeedsCategories = wantsCategories.Concat(savingsCategories).ToList();

        if (nonNeedsCategories.Any() && remainingIncome > 0)
        {
            var remainingPerCategory = remainingIncome / nonNeedsCategories.Count;
            foreach (var category in nonNeedsCategories)
            {
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = remainingPerCategory });
            }
        }

        return items;
    }

    private List<BudgetItem> GenerateEnvelopeBudget(decimal netIncome, List<Category> categories)
    {
        var items = new List<BudgetItem>();
        var remainingIncome = netIncome;

        // Envelope system: allocate to specific categories in order of priority
        var envelopeAllocations = new Dictionary<string, decimal>
        {
            { "Housing", 0.30m },           // 30% for housing
            { "Groceries", 0.15m },        // 15% for groceries
            { "Transportation", 0.10m },   // 10% for transportation
            { "Utilities", 0.10m },        // 10% for utilities
            { "Medical/Health", 0.05m },   // 5% for medical
            { "Insurance", 0.05m },        // 5% for insurance
            { "Dining Out", 0.05m },       // 5% for dining
            { "Entertainment", 0.03m },    // 3% for entertainment
            { "Personal", 0.03m },         // 3% for personal
            { "Emergency Fund", 0.10m },   // 10% for emergency fund
            { "Extra Debt Payments", 0.04m } // 4% for extra debt payments
        };

        // First pass: allocate to needs categories
        var needsCategories = categories.Where(c => c.IsNeed).ToList();
        foreach (var category in needsCategories)
        {
            if (envelopeAllocations.TryGetValue(category.Name, out var percentage) && remainingIncome > 0)
            {
                var amount = Math.Min(netIncome * percentage, remainingIncome);
                remainingIncome -= amount;
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = amount });
            }
        }

        // Second pass: allocate to wants and savings categories
        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };
        var wantsCategories = categories.Where(c => !c.IsNeed && !savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();
        var savingsCategories = categories.Where(c => savingsKeywords.Any(kw => c.Name.Contains(kw))).ToList();

        // Distribute remaining to wants
        if (wantsCategories.Any() && remainingIncome > 0)
        {
            var wantsAmount = remainingIncome * 0.6m; // 60% of remaining to wants
            var perCategory = wantsAmount / wantsCategories.Count;
            foreach (var category in wantsCategories)
            {
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = perCategory });
            }
            remainingIncome -= wantsAmount;
        }

        // Distribute remaining to savings
        if (savingsCategories.Any() && remainingIncome > 0)
        {
            var perCategory = remainingIncome / savingsCategories.Count;
            foreach (var category in savingsCategories)
            {
                items.Add(new BudgetItem { CategoryId = category.Id, PlannedAmount = perCategory });
            }
        }

        return items;
    }

    public async Task<DebtAvalancheProjection> GenerateDebtAvalancheProjectionAsync(int householdId, decimal monthlySurplus)
    {
        var debts = (await _householdRepository.GetDebtsAsync(householdId))
            .OrderByDescending(d => d.Apr)
            .ToList();

        var projection = new List<DebtPayoffMonth>();
        decimal totalInterest = 0m;

        // Calculate minimum payments
        var totalMinPayments = debts.Sum(d => d.MinPayment);
        var extraPayment = monthlySurplus - totalMinPayments;

        var month = 0;
        var remainingDebts = debts.Select(d => new
        {
            Debt = d,
            Balance = d.Balance
        }).ToDictionary(x => x.Debt.Id, x => x.Balance);

        while (remainingDebts.Any(d => d.Value > 0) && month < 120)
        {
            month++;
            decimal monthPrincipal = 0m;
            decimal monthInterest = 0m;
            var debtStatuses = new List<DebtStatus>();
            var extraRemaining = extraPayment;

            foreach (var debt in debts)
            {
                if (remainingDebts[debt.Id] <= 0)
                {
                    debtStatuses.Add(new DebtStatus
                    {
                        DebtId = debt.Id,
                        DebtName = debt.Name,
                        Balance = 0,
                        Payment = 0,
                        IsPaidOff = true
                    });
                    continue;
                }

                // Calculate monthly interest
                var monthlyRate = debt.Apr / 12m / 100m;
                var interest = remainingDebts[debt.Id] * monthlyRate;
                monthInterest += interest;
                totalInterest += interest;

                // Determine payment
                var payment = debt.MinPayment;

                // Apply extra payment to highest interest debt
                if (debt == debts.First(d => remainingDebts[d.Id] > 0) && extraRemaining > 0)
                {
                    payment += extraRemaining;
                    extraRemaining = 0;
                }

                // Ensure we don't overpay
                var maxPayment = remainingDebts[debt.Id] + interest;
                payment = Math.Min(payment, maxPayment);

                // Split payment into principal and interest
                var principal = payment - interest;
                monthPrincipal += principal;
                remainingDebts[debt.Id] -= principal;

                debtStatuses.Add(new DebtStatus
                {
                    DebtId = debt.Id,
                    DebtName = debt.Name,
                    Balance = Math.Max(0, remainingDebts[debt.Id]),
                    Payment = payment,
                    IsPaidOff = remainingDebts[debt.Id] <= 0
                });

                // Free up minimum payment when debt is paid off
                if (remainingDebts[debt.Id] <= 0 && extraRemaining == 0)
                {
                    extraRemaining += debt.MinPayment;
                }
            }

            projection.Add(new DebtPayoffMonth
            {
                Month = month,
                DebtsRemaining = remainingDebts.Count(d => d.Value > 0),
                PrincipalPaid = monthPrincipal,
                InterestPaid = monthInterest,
                TotalPaid = monthPrincipal + monthInterest,
                RemainingBalance = remainingDebts.Sum(d => Math.Max(0, d.Value)),
                DebtStatuses = debtStatuses
            });
        }

        return new DebtAvalancheProjection
        {
            Projection = projection,
            TotalMonths = month,
            TotalInterest = totalInterest,
            InterestSavedVsSnowball = 0m // Will be calculated in comparison
        };
    }

    public async Task<DebtMethodComparisonResponse> CompareDebtMethodsAsync(int householdId, decimal monthlySurplus)
    {
        var snowball = await GenerateDebtSnowballProjectionAsync(householdId, monthlySurplus);
        var avalanche = await GenerateDebtAvalancheProjectionAsync(householdId, monthlySurplus);

        var interestSaved = snowball.TotalInterest - avalanche.TotalInterest;
        var monthsSaved = snowball.TotalMonths - avalanche.TotalMonths;

        avalanche.InterestSavedVsSnowball = interestSaved;

        var recommendation = interestSaved > 100
            ? "Avalanche method recommended - saves significant interest"
            : "Snowball method recommended - provides quicker psychological wins";

        return new DebtMethodComparisonResponse
        {
            Snowball = snowball,
            Avalanche = avalanche,
            Recommendation = recommendation,
            MonthsSaved = monthsSaved,
            InterestSaved = interestSaved
        };
    }

    public async Task<TwelveMonthProjection> Generate12MonthProjectionAsync(int householdId, int startingBudgetId)
    {
        var budget = await _budgetRepository.GetByIdAsync(startingBudgetId);
        if (budget == null)
        {
            throw new ArgumentException($"Budget {startingBudgetId} not found");
        }

        var household = await _householdRepository.GetByIdAsync(householdId);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var expenses = await _householdRepository.GetExpensesAsync(householdId);
        var debts = (await _householdRepository.GetDebtsAsync(householdId)).ToList();
        var goals = await _householdRepository.GetGoalsAsync(householdId);
        var budgetItems = await _budgetRepository.GetBudgetItemsAsync(startingBudgetId);

        var monthlyIncome = incomes.Sum(i => ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));
        var monthlyExpenses = budgetItems.Sum(bi => bi.PlannedAmount);
        var monthlySurplus = monthlyIncome - monthlyExpenses;

        var months = new List<MonthlyProjection>();
        var cumulativeSavings = 0m;
        var currentDebts = debts.ToDictionary(d => d.Id, d => d.Balance);
        var goalProgress = goals.ToDictionary(g => g.Id, g => 0m);

        var debtFreeMonth = 0;
        var milestones = new List<string>();
        var goalsAchieved = 0;

        for (int i = 0; i < 12; i++)
        {
            var projectionDate = budget.Month.AddMonths(i);
            var month = i + 1;

            // Calculate debt payments for this month
            decimal debtPayments = 0m;
            var debtsRemaining = currentDebts.Count(d => d.Value > 0);

            foreach (var debt in debts.Where(d => currentDebts[d.Id] > 0))
            {
                var payment = Math.Min(debt.MinPayment, currentDebts[debt.Id]);
                debtPayments += payment;
                currentDebts[debt.Id] -= payment;

                if (currentDebts[debt.Id] <= 0 && debtFreeMonth == 0)
                {
                    milestones.Add($"Paid off {debt.Name} in month {month}");
                }
            }

            // Apply surplus to savings and goals
            var savings = Math.Max(0, monthlySurplus - debtPayments);
            cumulativeSavings += savings;

            // Distribute savings to goals proportionally by priority
            if (savings > 0 && goals.Any())
            {
                var totalPriority = goals.Sum(g => g.Priority);
                foreach (var goal in goals)
                {
                    var allocation = savings * (goal.Priority / (decimal)totalPriority);
                    goalProgress[goal.Id] += allocation;
                }
            }

            // Check if debt-free
            if (debtsRemaining == 0 && debtFreeMonth == 0)
            {
                debtFreeMonth = month;
                milestones.Add($"Debt-free achieved in month {month}!");
            }

            // Create goal snapshots
            var goalSnapshots = goals.Select(g =>
            {
                var current = goalProgress[g.Id];
                var percentage = g.TargetAmount > 0 ? (current / g.TargetAmount) * 100 : 0;
                var isAchieved = current >= g.TargetAmount;

                if (isAchieved && percentage < 100.01m) // Just achieved
                {
                    goalsAchieved++;
                    milestones.Add($"Goal '{g.Name}' achieved in month {month}!");
                }

                return new GoalProgressSnapshot
                {
                    GoalId = g.Id,
                    GoalName = g.Name,
                    TargetAmount = g.TargetAmount,
                    CurrentAmount = current,
                    PercentageComplete = Math.Min(100, percentage),
                    IsAchieved = isAchieved,
                    MonthsRemaining = !isAchieved && savings > 0
                        ? (int)Math.Ceiling((g.TargetAmount - current) / savings)
                        : null
                };
            }).ToList();

            months.Add(new MonthlyProjection
            {
                MonthNumber = month,
                Date = projectionDate,
                Income = monthlyIncome,
                Expenses = monthlyExpenses,
                DebtPayments = debtPayments,
                Savings = savings,
                NetCashFlow = monthlySurplus,
                CumulativeSavings = cumulativeSavings,
                TotalDebtRemaining = currentDebts.Sum(d => Math.Max(0, d.Value)),
                DebtsRemaining = debtsRemaining,
                GoalProgress = goalSnapshots
            });
        }

        return new TwelveMonthProjection
        {
            HouseholdId = householdId,
            StartMonth = budget.Month,
            Months = months,
            Summary = new ProjectionSummary
            {
                TotalIncome = monthlyIncome * 12,
                TotalExpenses = monthlyExpenses * 12,
                TotalSavings = cumulativeSavings,
                TotalDebtPayments = months.Sum(m => m.DebtPayments),
                DebtFreeMonth = debtFreeMonth,
                GoalsAchieved = goalsAchieved,
                Milestones = milestones
            }
        };
    }

    public async Task<BudgetValidationResponse> ValidateBudgetAsync(int householdId, Dictionary<int, decimal> categoryAmounts)
    {
        var violations = await CheckGuardrailsAsync(householdId, categoryAmounts);
        var suggestions = await SuggestReallocationsAsync(householdId, categoryAmounts);

        var household = await _householdRepository.GetByIdAsync(householdId);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var totalIncome = incomes.Sum(i => ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));

        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        var netIncome = totalIncome * (1 - stateParam.EstEffectiveTaxRate);

        var totalBudgeted = categoryAmounts.Sum(ca => ca.Value);
        var surplus = netIncome - totalBudgeted;
        var deficit = Math.Abs(Math.Min(0, surplus));

        var isBalanced = Math.Abs(surplus) < 1; // Within $1

        var assessment = isBalanced
            ? "Budget is balanced and ready to use."
            : surplus > 0
                ? $"You have ${surplus:F2} unallocated. Consider adding to savings or debt payments."
                : $"Budget exceeds income by ${deficit:F2}. Review suggestions to balance your budget.";

        return new BudgetValidationResponse
        {
            IsBalanced = isBalanced,
            Surplus = Math.Max(0, surplus),
            Deficit = deficit,
            Violations = violations,
            Suggestions = suggestions,
            OverallAssessment = assessment
        };
    }

    public async Task<List<GuardrailViolation>> CheckGuardrailsAsync(int householdId, Dictionary<int, decimal> categoryAmounts)
    {
        var violations = new List<GuardrailViolation>();

        var household = await _householdRepository.GetByIdAsync(householdId);
        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();

        var grossIncome = incomes.Sum(i => ConvertToMonthlyAmount(i.GrossAmount, i.Cadence));
        var netIncome = grossIncome * (1 - stateParam.EstEffectiveTaxRate);
        var cola = stateParam.ColaIndex;

        var categoryDict = categories.ToDictionary(c => c.Id);

        // Define COLA-adjusted guardrails
        var guardrails = new Dictionary<string, (decimal min, decimal max)>
        {
            { "Housing", (0.20m, 0.30m * cola) },
            { "Utilities", (0.03m, 0.10m * cola) },
            { "Groceries", (0.05m, 0.15m * cola) },
            { "Transportation", (0.05m, 0.15m) },
            { "Medical/Health", (0.03m, 0.12m) },
            { "Insurance", (0.05m, 0.15m) },
            { "Dining Out", (0.00m, 0.10m) },
            { "Entertainment", (0.00m, 0.08m) }
        };

        foreach (var (categoryId, amount) in categoryAmounts)
        {
            if (!categoryDict.ContainsKey(categoryId)) continue;

            var categoryName = categoryDict[categoryId].Name;
            var percentage = amount / netIncome;

            if (guardrails.TryGetValue(categoryName, out var limits))
            {
                if (percentage > limits.max)
                {
                    violations.Add(new GuardrailViolation
                    {
                        Category = categoryName,
                        CurrentPercentage = percentage * 100,
                        RecommendedMin = limits.min * 100,
                        RecommendedMax = limits.max * 100,
                        Severity = percentage > limits.max * 1.2m ? "Critical" : "Warning",
                        Message = $"{categoryName} is {percentage * 100:F1}% of income (max recommended: {limits.max * 100:F1}%)",
                        Explanation = $"Consider reducing {categoryName} spending or finding ways to increase income. High {categoryName} costs can limit your financial flexibility."
                    });
                }
                else if (percentage < limits.min && categoryDict[categoryId].IsNeed)
                {
                    violations.Add(new GuardrailViolation
                    {
                        Category = categoryName,
                        CurrentPercentage = percentage * 100,
                        RecommendedMin = limits.min * 100,
                        RecommendedMax = limits.max * 100,
                        Severity = "Warning",
                        Message = $"{categoryName} is only {percentage * 100:F1}% of income (minimum recommended: {limits.min * 100:F1}%)",
                        Explanation = $"You may be under-budgeting for {categoryName}, which could lead to unexpected expenses."
                    });
                }
            }
        }

        return violations;
    }

    public async Task<List<ReallocationSuggestion>> SuggestReallocationsAsync(int householdId, Dictionary<int, decimal> categoryAmounts)
    {
        var suggestions = new List<ReallocationSuggestion>();

        var household = await _householdRepository.GetByIdAsync(householdId);
        var stateParam = await _referenceDataRepository.GetStateParamAsync(household.State);
        var incomes = await _householdRepository.GetIncomesAsync(householdId);
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        var debts = await _householdRepository.GetDebtsAsync(householdId);

        var netIncome = incomes.Sum(i => ConvertToMonthlyAmount(i.GrossAmount, i.Cadence)) * (1 - stateParam.EstEffectiveTaxRate);
        var totalBudgeted = categoryAmounts.Sum(ca => ca.Value);
        var deficit = totalBudgeted - netIncome;

        if (deficit <= 0) return suggestions; // No deficit, no reallocation needed

        var categoryDict = categories.ToDictionary(c => c.Id);
        var savingsKeywords = new[] { "Debt", "Emergency", "Sinking", "Retirement" };

        // Find wants that can be reduced
        var wantCategories = categoryAmounts
            .Where(ca => categoryDict.ContainsKey(ca.Key) &&
                        !categoryDict[ca.Key].IsNeed &&
                        !savingsKeywords.Any(kw => categoryDict[ca.Key].Name.Contains(kw)))
            .OrderByDescending(ca => ca.Value)
            .ToList();

        var remainingDeficit = deficit;

        foreach (var (categoryId, amount) in wantCategories)
        {
            if (remainingDeficit <= 0) break;

            var reduction = Math.Min(amount * 0.5m, remainingDeficit); // Reduce by up to 50%
            var categoryName = categoryDict[categoryId].Name;

            suggestions.Add(new ReallocationSuggestion
            {
                FromCategory = categoryName,
                ToCategory = "Unallocated / Savings",
                Amount = reduction,
                Reason = $"Reduce discretionary spending in {categoryName} to balance budget",
                ImpactScore = (reduction / deficit) * 10
            });

            remainingDeficit -= reduction;
        }

        // If debts exist, suggest increasing debt payments
        if (debts.Any())
        {
            var highestInterestDebt = debts.OrderByDescending(d => d.Apr).First();
            suggestions.Add(new ReallocationSuggestion
            {
                FromCategory = "Wants",
                ToCategory = "Extra Debt Payments",
                Amount = Math.Min(100, netIncome * 0.05m),
                Reason = $"Apply extra payments to {highestInterestDebt.Name} ({highestInterestDebt.Apr}% APR) to save on interest",
                ImpactScore = 8.5m
            });
        }

        return suggestions.OrderByDescending(s => s.ImpactScore).ToList();
    }
}


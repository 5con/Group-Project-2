namespace backend.DTOs;

/// <summary>
/// Data Transfer Object for goal responses with progress tracking.
/// </summary>
public class GoalResponse
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; }
    public decimal CurrentAmount { get; set; }
    public decimal PercentageComplete { get; set; }
    public bool IsAchieved { get; set; }
    public DateTime? ProjectedCompletionDate { get; set; }
    public int? MonthsRemaining { get; set; }
}

/// <summary>
/// DTO for creating a new goal.
/// </summary>
public class CreateGoalRequest
{
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; } = 1;
}

/// <summary>
/// DTO for updating an existing goal.
/// </summary>
public class UpdateGoalRequest
{
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; }
}

/// <summary>
/// DTO for household's goal dashboard with progress summaries.
/// </summary>
public class GoalDashboardResponse
{
    public int HouseholdId { get; set; }
    public int TotalGoals { get; set; }
    public int AchievedGoals { get; set; }
    public int InProgressGoals { get; set; }
    public decimal TotalTargetAmount { get; set; }
    public decimal TotalSavedAmount { get; set; }
    public decimal OverallProgress { get; set; }
    public List<GoalResponse> Goals { get; set; } = new();
    public List<string> UpcomingMilestones { get; set; } = new();
}


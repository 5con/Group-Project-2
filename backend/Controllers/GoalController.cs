using Microsoft.AspNetCore.Mvc;
using backend.Repositories;
using backend.Models;
using backend.DTOs;

namespace backend.Controllers;

/// <summary>
/// Controller for goal management and progress tracking.
/// Follows Single Responsibility Principle - handles only goal-related HTTP operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GoalController : ControllerBase
{
    private readonly IGoalRepository _goalRepository;
    private readonly IHouseholdRepository _householdRepository;

    public GoalController(
        IGoalRepository goalRepository,
        IHouseholdRepository householdRepository)
    {
        _goalRepository = goalRepository ?? throw new ArgumentNullException(nameof(goalRepository));
        _householdRepository = householdRepository ?? throw new ArgumentNullException(nameof(householdRepository));
    }

    /// <summary>
    /// Creates a new goal.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateGoal([FromBody] CreateGoalRequest request)
    {
        try
        {
            // Validate household exists
            var household = await _householdRepository.GetByIdAsync(request.HouseholdId);
            if (household == null)
            {
                return NotFound($"Household {request.HouseholdId} not found");
            }

            var goal = new Goal
            {
                HouseholdId = request.HouseholdId,
                Type = request.Type,
                Name = request.Name,
                TargetAmount = request.TargetAmount,
                TargetDate = request.TargetDate,
                Priority = request.Priority
            };

            var goalId = await _goalRepository.CreateAsync(goal);

            return Ok(new
            {
                GoalId = goalId,
                Message = "Goal created successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to create goal", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets a goal by ID with progress.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetGoal(int id)
    {
        var goal = await _goalRepository.GetByIdAsync(id);
        if (goal == null)
        {
            return NotFound($"Goal {id} not found");
        }

        var currentAmount = await _goalRepository.GetGoalProgressAsync(id);
        var percentageComplete = goal.TargetAmount > 0
            ? (currentAmount / goal.TargetAmount) * 100
            : 0;

        // Calculate monthly savings needed (simplified - assumes 12 months if no target date)
        var monthlySavings = 50m; // Placeholder - should be calculated from budget
        var projectedCompletion = await _goalRepository.ProjectGoalCompletionDateAsync(id, monthlySavings);

        var response = new GoalResponse
        {
            Id = goal.Id,
            HouseholdId = goal.HouseholdId,
            Type = goal.Type,
            Name = goal.Name,
            TargetAmount = goal.TargetAmount,
            TargetDate = goal.TargetDate,
            Priority = goal.Priority,
            CurrentAmount = currentAmount,
            PercentageComplete = Math.Min(100, percentageComplete),
            IsAchieved = currentAmount >= goal.TargetAmount,
            ProjectedCompletionDate = projectedCompletion,
            MonthsRemaining = projectedCompletion.HasValue
                ? (int)Math.Ceiling((projectedCompletion.Value - DateTime.Now).TotalDays / 30)
                : null
        };

        return Ok(response);
    }

    /// <summary>
    /// Gets all goals for a household.
    /// </summary>
    [HttpGet("household/{householdId}")]
    public async Task<IActionResult> GetHouseholdGoals(int householdId, [FromQuery] string? type = null)
    {
        IEnumerable<Goal> goals;

        if (!string.IsNullOrEmpty(type))
        {
            goals = await _goalRepository.GetByHouseholdIdAndTypeAsync(householdId, type);
        }
        else
        {
            goals = await _goalRepository.GetByHouseholdIdAsync(householdId);
        }

        var responses = new List<GoalResponse>();
        foreach (var goal in goals)
        {
            var currentAmount = await _goalRepository.GetGoalProgressAsync(goal.Id);
            var percentageComplete = goal.TargetAmount > 0
                ? (currentAmount / goal.TargetAmount) * 100
                : 0;

            responses.Add(new GoalResponse
            {
                Id = goal.Id,
                HouseholdId = goal.HouseholdId,
                Type = goal.Type,
                Name = goal.Name,
                TargetAmount = goal.TargetAmount,
                TargetDate = goal.TargetDate,
                Priority = goal.Priority,
                CurrentAmount = currentAmount,
                PercentageComplete = Math.Min(100, percentageComplete),
                IsAchieved = currentAmount >= goal.TargetAmount,
                ProjectedCompletionDate = null,
                MonthsRemaining = null
            });
        }

        return Ok(responses);
    }

    /// <summary>
    /// Gets goal dashboard with summary statistics.
    /// </summary>
    [HttpGet("household/{householdId}/dashboard")]
    public async Task<IActionResult> GetGoalDashboard(int householdId)
    {
        var goals = (await _goalRepository.GetByHouseholdIdOrderedByPriorityAsync(householdId)).ToList();

        var goalResponses = new List<GoalResponse>();
        decimal totalSaved = 0m;
        int achievedCount = 0;
        var upcomingMilestones = new List<string>();

        foreach (var goal in goals)
        {
            var currentAmount = await _goalRepository.GetGoalProgressAsync(goal.Id);
            var percentageComplete = goal.TargetAmount > 0
                ? (currentAmount / goal.TargetAmount) * 100
                : 0;
            var isAchieved = currentAmount >= goal.TargetAmount;

            if (isAchieved) achievedCount++;
            totalSaved += currentAmount;

            goalResponses.Add(new GoalResponse
            {
                Id = goal.Id,
                HouseholdId = goal.HouseholdId,
                Type = goal.Type,
                Name = goal.Name,
                TargetAmount = goal.TargetAmount,
                TargetDate = goal.TargetDate,
                Priority = goal.Priority,
                CurrentAmount = currentAmount,
                PercentageComplete = Math.Min(100, percentageComplete),
                IsAchieved = isAchieved,
                ProjectedCompletionDate = null,
                MonthsRemaining = null
            });

            // Add upcoming milestones
            if (!isAchieved && goal.TargetDate.HasValue && goal.TargetDate.Value <= DateTime.Now.AddMonths(3))
            {
                upcomingMilestones.Add($"{goal.Name} target date: {goal.TargetDate.Value:MMM dd, yyyy}");
            }
            if (!isAchieved && percentageComplete >= 75)
            {
                upcomingMilestones.Add($"{goal.Name} is {percentageComplete:F0}% complete - almost there!");
            }
        }

        var totalTarget = goals.Sum(g => g.TargetAmount);
        var overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

        var dashboard = new GoalDashboardResponse
        {
            HouseholdId = householdId,
            TotalGoals = goals.Count,
            AchievedGoals = achievedCount,
            InProgressGoals = goals.Count - achievedCount,
            TotalTargetAmount = totalTarget,
            TotalSavedAmount = totalSaved,
            OverallProgress = overallProgress,
            Goals = goalResponses,
            UpcomingMilestones = upcomingMilestones
        };

        return Ok(dashboard);
    }

    /// <summary>
    /// Updates an existing goal.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGoal(int id, [FromBody] UpdateGoalRequest request)
    {
        var goal = await _goalRepository.GetByIdAsync(id);
        if (goal == null)
        {
            return NotFound($"Goal {id} not found");
        }

        goal.Type = request.Type;
        goal.Name = request.Name;
        goal.TargetAmount = request.TargetAmount;
        goal.TargetDate = request.TargetDate;
        goal.Priority = request.Priority;

        var updated = await _goalRepository.UpdateAsync(goal);
        if (!updated)
        {
            return StatusCode(500, "Failed to update goal");
        }

        return Ok(new
        {
            GoalId = id,
            Message = "Goal updated successfully"
        });
    }

    /// <summary>
    /// Deletes a goal.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGoal(int id)
    {
        var goal = await _goalRepository.GetByIdAsync(id);
        if (goal == null)
        {
            return NotFound($"Goal {id} not found");
        }

        var deleted = await _goalRepository.DeleteAsync(id);
        if (!deleted)
        {
            return StatusCode(500, "Failed to delete goal");
        }

        return Ok(new
        {
            GoalId = id,
            Message = "Goal deleted successfully"
        });
    }
}


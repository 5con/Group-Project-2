using Microsoft.AspNetCore.Mvc;
using backend.Repositories;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

/// <summary>
/// Controller for accessing reference data (categories, state parameters, financial modules).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReferenceDataController : ControllerBase
{
    private readonly IReferenceDataRepository _referenceDataRepository;

    public ReferenceDataController(IReferenceDataRepository referenceDataRepository)
    {
        _referenceDataRepository = referenceDataRepository ?? throw new ArgumentNullException(nameof(referenceDataRepository));
    }

    /// <summary>
    /// Gets all state parameters.
    /// </summary>
    [HttpGet("states")]
    public async Task<IActionResult> GetStates()
    {
        var states = await _referenceDataRepository.GetAllStateParamsAsync();
        return Ok(states);
    }

    /// <summary>
    /// Gets all categories.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _referenceDataRepository.GetAllCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>
    /// Gets benchmark ranges for a specific state based on COLA index.
    /// </summary>
    [HttpGet("benchmarks/{state}")]
    public async Task<IActionResult> GetBenchmarks(string state)
    {
        var stateParam = await _referenceDataRepository.GetStateParamAsync(state);

        if (stateParam == null)
        {
            return NotFound($"State {state} not found");
        }

        // Return benchmark ranges based on state COLA
        var benchmarks = new
        {
            Housing = new { Min = 0.25m, Max = 0.30m * stateParam.ColaIndex },
            Utilities = new { Min = 0.05m, Max = 0.10m * stateParam.ColaIndex },
            Groceries = new { Min = 0.08m, Max = 0.12m * stateParam.ColaIndex },
            Transportation = new { Min = 0.05m, Max = 0.15m * stateParam.ColaIndex },
            MedicalHealth = new { Min = 0.05m, Max = 0.10m * stateParam.ColaIndex },
            Insurance = new { Min = 0.05m, Max = 0.15m * stateParam.ColaIndex },
            Childcare = new { Min = 0.05m, Max = 0.20m * stateParam.ColaIndex },
            DiningOut = new { Min = 0.03m, Max = 0.08m * stateParam.ColaIndex },
            Entertainment = new { Min = 0.02m, Max = 0.06m * stateParam.ColaIndex },
            Personal = new { Min = 0.03m, Max = 0.08m * stateParam.ColaIndex },
            Subscriptions = new { Min = 0.01m, Max = 0.05m * stateParam.ColaIndex }
        };

        return Ok(new { State = state, ColaIndex = stateParam.ColaIndex, Benchmarks = benchmarks });
    }

    /// <summary>
    /// Gets all financial modules.
    /// </summary>
    [HttpGet("financial-modules")]
    public async Task<IActionResult> GetFinancialModules()
    {
        var modules = await _referenceDataRepository.GetAllFinancialModulesAsync();
        return Ok(modules);
    }

    /// <summary>
    /// Gets financial modules with user-specific progress.
    /// </summary>
    [HttpGet("financial-modules/user/{userId}")]
    public async Task<IActionResult> GetFinancialModulesWithProgress(int userId)
    {
        var modules = await _referenceDataRepository.GetAllFinancialModulesAsync();
        var userProgress = await _referenceDataRepository.GetAllUserProgressAsync(userId);

        var progressDict = userProgress.ToDictionary(p => p.ModuleId);

        var modulesWithProgress = modules.Select(m => new FinancialModuleWithProgressResponse
        {
            Id = m.Id,
            Title = m.Title,
            Description = m.Description,
            Order = m.Order,
            Content = m.Content,
            IsCompleted = progressDict.ContainsKey(m.Id) && progressDict[m.Id].IsCompleted,
            ProgressPercentage = progressDict.ContainsKey(m.Id) ? progressDict[m.Id].ProgressPercentage : 0,
            CompletedAt = progressDict.ContainsKey(m.Id) ? progressDict[m.Id].CompletedAt : null
        }).OrderBy(m => m.Order).ToList();

        return Ok(modulesWithProgress);
    }

    /// <summary>
    /// Gets overall learning progress for a user.
    /// </summary>
    [HttpGet("financial-modules/user/{userId}/progress")]
    public async Task<IActionResult> GetUserLearningProgress(int userId)
    {
        var modules = await _referenceDataRepository.GetAllFinancialModulesAsync();
        var userProgress = await _referenceDataRepository.GetAllUserProgressAsync(userId);

        var progressDict = userProgress.ToDictionary(p => p.ModuleId);
        var modulesList = modules.ToList();

        var completedCount = userProgress.Count(p => p.IsCompleted);
        var inProgressCount = userProgress.Count(p => !p.IsCompleted && p.ProgressPercentage > 0);
        var notStartedCount = modulesList.Count - userProgress.Count();

        var moduleProgressList = modulesList.Select(m => new ModuleProgressResponse
        {
            UserId = userId,
            ModuleId = m.Id,
            ModuleTitle = m.Title,
            ModuleDescription = m.Description,
            ModuleOrder = m.Order,
            IsCompleted = progressDict.ContainsKey(m.Id) && progressDict[m.Id].IsCompleted,
            ProgressPercentage = progressDict.ContainsKey(m.Id) ? progressDict[m.Id].ProgressPercentage : 0,
            CompletedAt = progressDict.ContainsKey(m.Id) ? progressDict[m.Id].CompletedAt : null
        }).OrderBy(m => m.ModuleOrder).ToList();

        var overallProgress = modulesList.Count > 0
            ? moduleProgressList.Sum(m => m.ProgressPercentage) / (decimal)modulesList.Count
            : 0m;

        var lastActivity = userProgress
            .Where(p => p.CompletedAt.HasValue)
            .OrderByDescending(p => p.CompletedAt)
            .FirstOrDefault()?.CompletedAt;

        var response = new UserLearningProgressResponse
        {
            UserId = userId,
            TotalModules = modulesList.Count,
            CompletedModules = completedCount,
            InProgressModules = inProgressCount,
            NotStartedModules = notStartedCount,
            OverallProgress = overallProgress,
            ModuleProgress = moduleProgressList,
            LastActivityDate = lastActivity
        };

        return Ok(response);
    }

    /// <summary>
    /// Updates or creates module progress for a user.
    /// </summary>
    [HttpPost("financial-modules/progress")]
    public async Task<IActionResult> UpdateModuleProgress([FromBody] UpdateModuleProgressRequest request)
    {
        try
        {
            // Validate module exists
            var module = await _referenceDataRepository.GetFinancialModuleByIdAsync(request.ModuleId);
            if (module == null)
            {
                return NotFound($"Module {request.ModuleId} not found");
            }

            var progress = new UserModuleProgress
            {
                UserId = request.UserId,
                ModuleId = request.ModuleId,
                IsCompleted = request.IsCompleted,
                ProgressPercentage = request.ProgressPercentage,
                CompletedAt = request.IsCompleted ? DateTime.UtcNow : null
            };

            await _referenceDataRepository.UpsertUserModuleProgressAsync(progress);

            return Ok(new
            {
                UserId = request.UserId,
                ModuleId = request.ModuleId,
                Message = "Progress updated successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = "Failed to update progress", Details = ex.Message });
        }
    }

    /// <summary>
    /// Gets progress for a specific module and user.
    /// </summary>
    [HttpGet("financial-modules/{moduleId}/user/{userId}/progress")]
    public async Task<IActionResult> GetModuleProgress(int moduleId, int userId)
    {
        var module = await _referenceDataRepository.GetFinancialModuleByIdAsync(moduleId);
        if (module == null)
        {
            return NotFound($"Module {moduleId} not found");
        }

        var progress = await _referenceDataRepository.GetUserModuleProgressAsync(userId, moduleId);

        var response = new ModuleProgressResponse
        {
            UserId = userId,
            ModuleId = moduleId,
            ModuleTitle = module.Title,
            ModuleDescription = module.Description,
            ModuleOrder = module.Order,
            IsCompleted = progress?.IsCompleted ?? false,
            ProgressPercentage = progress?.ProgressPercentage ?? 0,
            CompletedAt = progress?.CompletedAt
        };

        return Ok(response);
    }

    /// <summary>
    /// Deletes module progress for a user.
    /// </summary>
    [HttpDelete("financial-modules/{moduleId}/user/{userId}/progress")]
    public async Task<IActionResult> DeleteModuleProgress(int moduleId, int userId)
    {
        await _referenceDataRepository.DeleteUserModuleProgressAsync(userId, moduleId);

        return Ok(new
        {
            UserId = userId,
            ModuleId = moduleId,
            Message = "Progress deleted successfully"
        });
    }
}

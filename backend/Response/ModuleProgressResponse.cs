namespace backend.DTOs;

/// <summary>
/// Data Transfer Object for module progress responses.
/// </summary>
public class ModuleProgressResponse
{
    public int UserId { get; set; }
    public int ModuleId { get; set; }
    public string ModuleTitle { get; set; } = string.Empty;
    public string ModuleDescription { get; set; } = string.Empty;
    public int ModuleOrder { get; set; }
    public bool IsCompleted { get; set; }
    public int ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// DTO for creating or updating module progress.
/// </summary>
public class UpdateModuleProgressRequest
{
    public int UserId { get; set; }
    public int ModuleId { get; set; }
    public int ProgressPercentage { get; set; }
    public bool IsCompleted { get; set; }
}

/// <summary>
/// DTO for user's overall learning progress.
/// </summary>
public class UserLearningProgressResponse
{
    public int UserId { get; set; }
    public int TotalModules { get; set; }
    public int CompletedModules { get; set; }
    public int InProgressModules { get; set; }
    public int NotStartedModules { get; set; }
    public decimal OverallProgress { get; set; }
    public List<ModuleProgressResponse> ModuleProgress { get; set; } = new();
    public DateTime? LastActivityDate { get; set; }
}

/// <summary>
/// DTO for financial module with user-specific progress.
/// </summary>
public class FinancialModuleWithProgressResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }
}


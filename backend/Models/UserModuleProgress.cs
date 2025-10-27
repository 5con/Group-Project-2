namespace backend.Models;

/// <summary>
/// Tracks user progress through educational modules.
/// </summary>
public class UserModuleProgress
{
    public int UserId { get; set; }
    public int ModuleId { get; set; }
    public bool IsCompleted { get; set; }
    public int ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }
}


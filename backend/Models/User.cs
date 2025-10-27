namespace backend.Models;

/// <summary>
/// Represents a user account in the financial management system.
/// </summary>
public class User
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Locale { get; set; } = "en-US";
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int? CurrentHouseholdId { get; set; }
    public bool IsAdmin { get; set; } = false;
    public bool HasCompletedOnboarding { get; set; } = false;
}


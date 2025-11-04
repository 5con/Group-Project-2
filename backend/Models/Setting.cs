namespace backend.Models;

/// <summary>
/// Represents household-specific settings and preferences.
/// </summary>
public class Setting
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public bool StrictMode { get; set; }
    public string GuardrailOverridesJson { get; set; } = "{}";
}


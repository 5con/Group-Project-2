namespace backend.Models;

/// <summary>
/// Represents a monthly budget for a household.
/// </summary>
public class Budget
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Methodology { get; set; } = "50/30/20"; // 50/30/20, zero_based, envelope
    public DateTime Month { get; set; }
    public string Notes { get; set; } = string.Empty;
}


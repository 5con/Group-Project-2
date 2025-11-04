namespace backend.Models;

/// <summary>
/// Represents an income source for a household.
/// </summary>
public class Income
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Cadence { get; set; } = "monthly"; // weekly, biweekly, semimonthly, monthly
    public decimal GrossAmount { get; set; }
}


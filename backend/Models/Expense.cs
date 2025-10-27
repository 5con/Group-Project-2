namespace backend.Models;

/// <summary>
/// Represents an expense item for a household.
/// </summary>
public class Expense
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string Cadence { get; set; } = "monthly";
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }
}


namespace backend.Models;

/// <summary>
/// Represents a financial goal for a household.
/// </summary>
public class Goal
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty; // emergency_fund, savings, debt_payoff, etc.
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public DateTime? TargetDate { get; set; }
    public int Priority { get; set; }
}


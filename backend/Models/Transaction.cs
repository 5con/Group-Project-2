namespace backend.Models;

/// <summary>
/// Represents a financial transaction for tracking actual spending.
/// </summary>
public class Transaction
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public DateTime Date { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Note { get; set; } = string.Empty;
}


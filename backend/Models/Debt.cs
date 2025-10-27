namespace backend.Models;

/// <summary>
/// Represents a debt obligation for a household.
/// </summary>
public class Debt
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Type { get; set; } = string.Empty; // credit_card, student_loan, auto_loan, personal_loan, etc.
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal Apr { get; set; }
    public decimal MinPayment { get; set; }
}


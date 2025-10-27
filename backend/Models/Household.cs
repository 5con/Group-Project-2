namespace backend.Models;

/// <summary>
/// Represents a household financial profile containing income, expenses, debts, and goals.
/// </summary>
public class Household
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string State { get; set; } = string.Empty;
    public int HouseholdSize { get; set; }
}


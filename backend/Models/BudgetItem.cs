namespace backend.Models;

/// <summary>
/// Represents a single line item within a budget.
/// </summary>
public class BudgetItem
{
    public int Id { get; set; }
    public int BudgetId { get; set; }
    public int CategoryId { get; set; }
    public decimal PlannedAmount { get; set; }
}


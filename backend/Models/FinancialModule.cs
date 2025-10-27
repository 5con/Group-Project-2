namespace backend.Models;

/// <summary>
/// Represents an educational financial literacy module.
/// </summary>
public class FinancialModule
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Content { get; set; } = string.Empty; // JSON content for the module
}


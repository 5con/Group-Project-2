namespace backend.Models;

/// <summary>
/// Represents a spending or income category.
/// </summary>
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public bool IsNeed { get; set; } // true for needs, false for wants
}


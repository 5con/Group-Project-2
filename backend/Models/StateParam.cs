namespace backend.Models;

/// <summary>
/// Represents state-specific parameters for cost of living and tax calculations.
/// </summary>
public class StateParam
{
    public string State { get; set; } = string.Empty;
    public decimal ColaIndex { get; set; }
    public decimal EstEffectiveTaxRate { get; set; }
}


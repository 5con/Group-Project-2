using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReferenceDataController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReferenceDataController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("states")]
    public async Task<IActionResult> GetStates()
    {
        var states = await _context.StateParams
            .OrderBy(sp => sp.State)
            .ToListAsync();

        return Ok(states);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("benchmarks/{state}")]
    public async Task<IActionResult> GetBenchmarks(string state)
    {
        var stateParam = await _context.StateParams
            .FirstOrDefaultAsync(sp => sp.State == state);

        if (stateParam == null)
        {
            return NotFound($"State {state} not found");
        }

        // Return benchmark ranges based on state COLA
        var benchmarks = new
        {
            Housing = new { Min = 0.25m, Max = 0.30m * stateParam.ColaIndex },
            Utilities = new { Min = 0.05m, Max = 0.10m * stateParam.ColaIndex },
            Groceries = new { Min = 0.08m, Max = 0.12m * stateParam.ColaIndex },
            Transportation = new { Min = 0.05m, Max = 0.15m * stateParam.ColaIndex },
            MedicalHealth = new { Min = 0.05m, Max = 0.10m * stateParam.ColaIndex },
            Insurance = new { Min = 0.05m, Max = 0.15m * stateParam.ColaIndex },
            Childcare = new { Min = 0.05m, Max = 0.20m * stateParam.ColaIndex },
            DiningOut = new { Min = 0.03m, Max = 0.08m * stateParam.ColaIndex },
            Entertainment = new { Min = 0.02m, Max = 0.06m * stateParam.ColaIndex },
            Personal = new { Min = 0.03m, Max = 0.08m * stateParam.ColaIndex },
            Subscriptions = new { Min = 0.01m, Max = 0.05m * stateParam.ColaIndex }
        };

        return Ok(new { State = state, ColaIndex = stateParam.ColaIndex, Benchmarks = benchmarks });
    }

    [HttpGet("financial-modules")]
    public async Task<IActionResult> GetFinancialModules()
    {
        var modules = await _context.FinancialModules
            .OrderBy(m => m.Order)
            .ToListAsync();

        return Ok(modules);
    }
}

using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for Budget data access using raw SQL.
/// </summary>
public class BudgetRepository : IBudgetRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public BudgetRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<Budget?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Methodology, Month, Notes 
            FROM Budgets 
            WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapBudgetFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<Budget>> GetByHouseholdIdAsync(int householdId, int? year = null)
    {
        var budgets = new List<Budget>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();

        if (year.HasValue)
        {
            command.CommandText = @"
                SELECT Id, HouseholdId, Methodology, Month, Notes 
                FROM Budgets 
                WHERE HouseholdId = @householdId 
                AND strftime('%Y', Month) = @year
                ORDER BY Month DESC";
            command.Parameters.AddWithValue("@year", year.Value.ToString());
        }
        else
        {
            command.CommandText = @"
                SELECT Id, HouseholdId, Methodology, Month, Notes 
                FROM Budgets 
                WHERE HouseholdId = @householdId
                ORDER BY Month DESC";
        }

        command.Parameters.AddWithValue("@householdId", householdId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            budgets.Add(MapBudgetFromReader(reader));
        }

        return budgets;
    }

    public async Task<IEnumerable<Budget>> GetAllAsync()
    {
        var budgets = new List<Budget>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Methodology, Month, Notes 
            FROM Budgets 
            ORDER BY Month DESC";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            budgets.Add(MapBudgetFromReader(reader));
        }

        return budgets;
    }

    public async Task<int> CreateAsync(Budget budget)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Budgets (HouseholdId, Methodology, Month, Notes)
            VALUES (@householdId, @methodology, @month, @notes);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@householdId", budget.HouseholdId);
        command.Parameters.AddWithValue("@methodology", budget.Methodology);
        command.Parameters.AddWithValue("@month", budget.Month.ToString("o"));
        command.Parameters.AddWithValue("@notes", budget.Notes);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task UpdateAsync(Budget budget)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE Budgets 
            SET Methodology = @methodology, 
                Month = @month, 
                Notes = @notes
            WHERE Id = @id";

        command.Parameters.AddWithValue("@id", budget.Id);
        command.Parameters.AddWithValue("@methodology", budget.Methodology);
        command.Parameters.AddWithValue("@month", budget.Month.ToString("o"));
        command.Parameters.AddWithValue("@notes", budget.Notes);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Budgets WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        await command.ExecuteNonQueryAsync();
    }

    // Budget Item operations
    public async Task<IEnumerable<BudgetItem>> GetBudgetItemsAsync(int budgetId)
    {
        var budgetItems = new List<BudgetItem>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, BudgetId, CategoryId, PlannedAmount 
            FROM BudgetItems 
            WHERE BudgetId = @budgetId";
        command.Parameters.AddWithValue("@budgetId", budgetId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            budgetItems.Add(new BudgetItem
            {
                Id = reader.GetInt32(0),
                BudgetId = reader.GetInt32(1),
                CategoryId = reader.GetInt32(2),
                PlannedAmount = reader.GetDecimal(3)
            });
        }

        return budgetItems;
    }

    public async Task<int> CreateBudgetItemAsync(BudgetItem budgetItem)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO BudgetItems (BudgetId, CategoryId, PlannedAmount)
            VALUES (@budgetId, @categoryId, @plannedAmount);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@budgetId", budgetItem.BudgetId);
        command.Parameters.AddWithValue("@categoryId", budgetItem.CategoryId);
        command.Parameters.AddWithValue("@plannedAmount", budgetItem.PlannedAmount);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task UpdateBudgetItemAsync(BudgetItem budgetItem)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE BudgetItems 
            SET PlannedAmount = @plannedAmount
            WHERE Id = @id";

        command.Parameters.AddWithValue("@id", budgetItem.Id);
        command.Parameters.AddWithValue("@plannedAmount", budgetItem.PlannedAmount);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteBudgetItemsAsync(int budgetId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM BudgetItems WHERE BudgetId = @budgetId";
        command.Parameters.AddWithValue("@budgetId", budgetId);

        await command.ExecuteNonQueryAsync();
    }

    private Budget MapBudgetFromReader(SqliteDataReader reader)
    {
        return new Budget
        {
            Id = reader.GetInt32(0),
            HouseholdId = reader.GetInt32(1),
            Methodology = reader.GetString(2),
            Month = ParseBudgetMonth(reader.GetString(3)),
            Notes = reader.GetString(4)
        };
    }

    private DateTime ParseBudgetMonth(string monthString)
    {
        // Handle different date formats that might be in the database
        if (DateTime.TryParse(monthString, out DateTime result))
        {
            return result;
        }

        // Handle ISO format strings like "2023-10-01T00:00:00.0000000"
        if (monthString.Contains("T"))
        {
            var datePart = monthString.Split('T')[0];
            if (DateTime.TryParse(datePart, out result))
            {
                return result;
            }
        }

        // Handle YYYY-MM format
        if (monthString.Contains("-") && monthString.Split('-').Length == 2)
        {
            var parts = monthString.Split('-');
            if (int.TryParse(parts[0], out int year) && int.TryParse(parts[1], out int month))
            {
                return new DateTime(year, month, 1);
            }
        }

        // Fallback: assume current month if parsing fails
        Console.WriteLine($"Warning: Could not parse budget month '{monthString}', using current date");
        return DateTime.Now;
    }
}


using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for Household data access using raw SQL.
/// </summary>
public class HouseholdRepository : IHouseholdRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public HouseholdRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<Household?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, UserId, State, HouseholdSize FROM Households WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapHouseholdFromReader(reader);
        }

        return null;
    }

    public async Task<Household?> GetByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, UserId, State, HouseholdSize 
            FROM Households 
            WHERE UserId = @userId
            ORDER BY Id DESC
            LIMIT 1";
        command.Parameters.AddWithValue("@userId", userId);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapHouseholdFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<Household>> GetAllAsync()
    {
        var households = new List<Household>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, UserId, State, HouseholdSize FROM Households ORDER BY Id";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            households.Add(MapHouseholdFromReader(reader));
        }

        return households;
    }

    public async Task<int> CreateAsync(Household household)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Households (UserId, State, HouseholdSize)
            VALUES (@userId, @state, @householdSize);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@userId", household.UserId);
        command.Parameters.AddWithValue("@state", household.State);
        command.Parameters.AddWithValue("@householdSize", household.HouseholdSize);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task UpdateAsync(Household household)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE Households 
            SET State = @state, 
                HouseholdSize = @householdSize
            WHERE Id = @id";

        command.Parameters.AddWithValue("@id", household.Id);
        command.Parameters.AddWithValue("@state", household.State);
        command.Parameters.AddWithValue("@householdSize", household.HouseholdSize);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Households WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        await command.ExecuteNonQueryAsync();
    }

    // Income operations
    public async Task<IEnumerable<Income>> GetIncomesAsync(int householdId)
    {
        var incomes = new List<Income>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Name, Cadence, GrossAmount 
            FROM Incomes 
            WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            incomes.Add(new Income
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Name = reader.GetString(2),
                Cadence = reader.GetString(3),
                GrossAmount = reader.GetDecimal(4)
            });
        }

        return incomes;
    }

    public async Task<int> CreateIncomeAsync(Income income)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Incomes (HouseholdId, Name, Cadence, GrossAmount)
            VALUES (@householdId, @name, @cadence, @grossAmount);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@householdId", income.HouseholdId);
        command.Parameters.AddWithValue("@name", income.Name);
        command.Parameters.AddWithValue("@cadence", income.Cadence);
        command.Parameters.AddWithValue("@grossAmount", income.GrossAmount);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task DeleteIncomesAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Incomes WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        await command.ExecuteNonQueryAsync();
    }

    // Expense operations
    public async Task<IEnumerable<Expense>> GetExpensesAsync(int householdId)
    {
        var expenses = new List<Expense>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Name, CategoryId, Cadence, Amount, IsRecurring 
            FROM Expenses 
            WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            expenses.Add(new Expense
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Name = reader.GetString(2),
                CategoryId = reader.GetInt32(3),
                Cadence = reader.GetString(4),
                Amount = reader.GetDecimal(5),
                IsRecurring = reader.GetInt32(6) == 1
            });
        }

        return expenses;
    }

    public async Task<int> CreateExpenseAsync(Expense expense)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Expenses (HouseholdId, Name, CategoryId, Cadence, Amount, IsRecurring)
            VALUES (@householdId, @name, @categoryId, @cadence, @amount, @isRecurring);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@householdId", expense.HouseholdId);
        command.Parameters.AddWithValue("@name", expense.Name);
        command.Parameters.AddWithValue("@categoryId", expense.CategoryId);
        command.Parameters.AddWithValue("@cadence", expense.Cadence);
        command.Parameters.AddWithValue("@amount", expense.Amount);
        command.Parameters.AddWithValue("@isRecurring", expense.IsRecurring ? 1 : 0);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task DeleteExpensesAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Expenses WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        await command.ExecuteNonQueryAsync();
    }

    // Debt operations
    public async Task<IEnumerable<Debt>> GetDebtsAsync(int householdId)
    {
        var debts = new List<Debt>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Type, Name, Balance, Apr, MinPayment 
            FROM Debts 
            WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            debts.Add(new Debt
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Type = reader.GetString(2),
                Name = reader.GetString(3),
                Balance = reader.GetDecimal(4),
                Apr = reader.GetDecimal(5),
                MinPayment = reader.GetDecimal(6)
            });
        }

        return debts;
    }

    public async Task<int> CreateDebtAsync(Debt debt)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Debts (HouseholdId, Type, Name, Balance, Apr, MinPayment)
            VALUES (@householdId, @type, @name, @balance, @apr, @minPayment);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@householdId", debt.HouseholdId);
        command.Parameters.AddWithValue("@type", debt.Type);
        command.Parameters.AddWithValue("@name", debt.Name);
        command.Parameters.AddWithValue("@balance", debt.Balance);
        command.Parameters.AddWithValue("@apr", debt.Apr);
        command.Parameters.AddWithValue("@minPayment", debt.MinPayment);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task DeleteDebtsAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Debts WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        await command.ExecuteNonQueryAsync();
    }

    // Goal operations
    public async Task<IEnumerable<Goal>> GetGoalsAsync(int householdId)
    {
        var goals = new List<Goal>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, HouseholdId, Type, Name, TargetAmount, TargetDate, Priority 
            FROM Goals 
            WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            goals.Add(new Goal
            {
                Id = reader.GetInt32(0),
                HouseholdId = reader.GetInt32(1),
                Type = reader.GetString(2),
                Name = reader.GetString(3),
                TargetAmount = reader.GetDecimal(4),
                TargetDate = reader.IsDBNull(5) ? null : DateTime.Parse(reader.GetString(5)),
                Priority = reader.GetInt32(6)
            });
        }

        return goals;
    }

    public async Task<int> CreateGoalAsync(Goal goal)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Goals (HouseholdId, Type, Name, TargetAmount, TargetDate, Priority)
            VALUES (@householdId, @type, @name, @targetAmount, @targetDate, @priority);
            SELECT last_insert_rowid();";

        command.Parameters.AddWithValue("@householdId", goal.HouseholdId);
        command.Parameters.AddWithValue("@type", goal.Type);
        command.Parameters.AddWithValue("@name", goal.Name);
        command.Parameters.AddWithValue("@targetAmount", goal.TargetAmount);
        command.Parameters.AddWithValue("@targetDate", goal.TargetDate?.ToString("o") ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@priority", goal.Priority);

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt32(id);
    }

    public async Task DeleteGoalsAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Goals WHERE HouseholdId = @householdId";
        command.Parameters.AddWithValue("@householdId", householdId);

        await command.ExecuteNonQueryAsync();
    }

    private Household MapHouseholdFromReader(SqliteDataReader reader)
    {
        return new Household
        {
            Id = reader.GetInt32(0),
            UserId = reader.GetInt32(1),
            State = reader.GetString(2),
            HouseholdSize = reader.GetInt32(3)
        };
    }
}


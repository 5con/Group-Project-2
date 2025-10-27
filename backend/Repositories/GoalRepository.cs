using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for goal data access using raw SQL.
/// Follows Single Responsibility Principle - handles only goal data operations.
/// </summary>
public class GoalRepository : IGoalRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public GoalRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<int> CreateAsync(Goal goal)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            INSERT INTO Goals (HouseholdId, Type, Name, TargetAmount, TargetDate, Priority)
            VALUES (@HouseholdId, @Type, @Name, @TargetAmount, @TargetDate, @Priority);
            SELECT last_insert_rowid();";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", goal.HouseholdId);
        command.Parameters.AddWithValue("@Type", goal.Type);
        command.Parameters.AddWithValue("@Name", goal.Name);
        command.Parameters.AddWithValue("@TargetAmount", goal.TargetAmount);
        command.Parameters.AddWithValue("@TargetDate",
            goal.TargetDate.HasValue ? goal.TargetDate.Value.ToString("yyyy-MM-dd") : (object)DBNull.Value);
        command.Parameters.AddWithValue("@Priority", goal.Priority);

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<Goal?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Type, Name, TargetAmount, TargetDate, Priority
            FROM Goals
            WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapGoalFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<Goal>> GetByHouseholdIdAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Type, Name, TargetAmount, TargetDate, Priority
            FROM Goals
            WHERE HouseholdId = @HouseholdId
            ORDER BY Priority ASC, Name ASC";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);

        var goals = new List<Goal>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            goals.Add(MapGoalFromReader(reader));
        }

        return goals;
    }

    public async Task<IEnumerable<Goal>> GetByHouseholdIdAndTypeAsync(int householdId, string type)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Type, Name, TargetAmount, TargetDate, Priority
            FROM Goals
            WHERE HouseholdId = @HouseholdId AND Type = @Type
            ORDER BY Priority ASC";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);
        command.Parameters.AddWithValue("@Type", type);

        var goals = new List<Goal>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            goals.Add(MapGoalFromReader(reader));
        }

        return goals;
    }

    public async Task<IEnumerable<Goal>> GetByHouseholdIdOrderedByPriorityAsync(int householdId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            SELECT Id, HouseholdId, Type, Name, TargetAmount, TargetDate, Priority
            FROM Goals
            WHERE HouseholdId = @HouseholdId
            ORDER BY Priority ASC, TargetDate ASC NULLS LAST";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@HouseholdId", householdId);

        var goals = new List<Goal>();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            goals.Add(MapGoalFromReader(reader));
        }

        return goals;
    }

    public async Task<bool> UpdateAsync(Goal goal)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = @"
            UPDATE Goals
            SET Type = @Type,
                Name = @Name,
                TargetAmount = @TargetAmount,
                TargetDate = @TargetDate,
                Priority = @Priority
            WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", goal.Id);
        command.Parameters.AddWithValue("@Type", goal.Type);
        command.Parameters.AddWithValue("@Name", goal.Name);
        command.Parameters.AddWithValue("@TargetAmount", goal.TargetAmount);
        command.Parameters.AddWithValue("@TargetDate",
            goal.TargetDate.HasValue ? goal.TargetDate.Value.ToString("yyyy-MM-dd") : (object)DBNull.Value);
        command.Parameters.AddWithValue("@Priority", goal.Priority);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        const string sql = "DELETE FROM Goals WHERE Id = @Id";

        using var command = new SqliteCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<decimal> GetGoalProgressAsync(int goalId)
    {
        // In future, this would track actual allocations from budget categories
        // or sinking fund transactions. For now, return 0.
        await Task.CompletedTask;
        return 0m;
    }

    public async Task<DateTime?> ProjectGoalCompletionDateAsync(int goalId, decimal monthlySavings)
    {
        var goal = await GetByIdAsync(goalId);
        if (goal == null || monthlySavings <= 0) return null;

        var currentProgress = await GetGoalProgressAsync(goalId);
        var remaining = goal.TargetAmount - currentProgress;

        if (remaining <= 0) return DateTime.Now; // Already achieved

        var monthsNeeded = (int)Math.Ceiling(remaining / monthlySavings);
        return DateTime.Now.AddMonths(monthsNeeded);
    }

    private Goal MapGoalFromReader(SqliteDataReader reader)
    {
        return new Goal
        {
            Id = reader.GetInt32(0),
            HouseholdId = reader.GetInt32(1),
            Type = reader.GetString(2),
            Name = reader.GetString(3),
            TargetAmount = reader.GetDecimal(4),
            TargetDate = reader.IsDBNull(5) ? null : DateTime.Parse(reader.GetString(5)),
            Priority = reader.GetInt32(6)
        };
    }
}


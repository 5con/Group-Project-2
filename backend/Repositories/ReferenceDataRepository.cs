using backend.Models;
using Microsoft.Data.Sqlite;

namespace backend.Repositories;

/// <summary>
/// Repository implementation for reference data access using raw SQL.
/// </summary>
public class ReferenceDataRepository : IReferenceDataRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ReferenceDataRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    // Category operations
    public async Task<Category?> GetCategoryByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Name, ParentId, IsNeed 
            FROM Categories 
            WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapCategoryFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
    {
        var categories = new List<Category>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Name, ParentId, IsNeed 
            FROM Categories 
            ORDER BY Name";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            categories.Add(MapCategoryFromReader(reader));
        }

        return categories;
    }

    // StateParam operations
    public async Task<StateParam?> GetStateParamAsync(string state)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT State, ColaIndex, EstEffectiveTaxRate 
            FROM StateParams 
            WHERE State = @state";
        command.Parameters.AddWithValue("@state", state);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapStateParamFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<StateParam>> GetAllStateParamsAsync()
    {
        var stateParams = new List<StateParam>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT State, ColaIndex, EstEffectiveTaxRate 
            FROM StateParams 
            ORDER BY State";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            stateParams.Add(MapStateParamFromReader(reader));
        }

        return stateParams;
    }

    // FinancialModule operations
    public async Task<FinancialModule?> GetFinancialModuleByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Title, Description, [Order], Content 
            FROM FinancialModules 
            WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapFinancialModuleFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<FinancialModule>> GetAllFinancialModulesAsync()
    {
        var modules = new List<FinancialModule>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT Id, Title, Description, [Order], Content 
            FROM FinancialModules 
            ORDER BY [Order]";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            modules.Add(MapFinancialModuleFromReader(reader));
        }

        return modules;
    }

    private Category MapCategoryFromReader(SqliteDataReader reader)
    {
        return new Category
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            ParentId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
            IsNeed = reader.GetInt32(3) == 1
        };
    }

    private StateParam MapStateParamFromReader(SqliteDataReader reader)
    {
        return new StateParam
        {
            State = reader.GetString(0),
            ColaIndex = reader.GetDecimal(1),
            EstEffectiveTaxRate = reader.GetDecimal(2)
        };
    }

    private FinancialModule MapFinancialModuleFromReader(SqliteDataReader reader)
    {
        return new FinancialModule
        {
            Id = reader.GetInt32(0),
            Title = reader.GetString(1),
            Description = reader.GetString(2),
            Order = reader.GetInt32(3),
            Content = reader.GetString(4)
        };
    }

    // UserModuleProgress operations
    public async Task<UserModuleProgress?> GetUserModuleProgressAsync(int userId, int moduleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT UserId, ModuleId, IsCompleted, ProgressPercentage, CompletedAt
            FROM UserModuleProgress
            WHERE UserId = @userId AND ModuleId = @moduleId";
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@moduleId", moduleId);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapUserModuleProgressFromReader(reader);
        }

        return null;
    }

    public async Task<IEnumerable<UserModuleProgress>> GetAllUserProgressAsync(int userId)
    {
        var progressList = new List<UserModuleProgress>();

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT UserId, ModuleId, IsCompleted, ProgressPercentage, CompletedAt
            FROM UserModuleProgress
            WHERE UserId = @userId
            ORDER BY ModuleId";
        command.Parameters.AddWithValue("@userId", userId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            progressList.Add(MapUserModuleProgressFromReader(reader));
        }

        return progressList;
    }

    public async Task UpsertUserModuleProgressAsync(UserModuleProgress progress)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO UserModuleProgress (UserId, ModuleId, IsCompleted, ProgressPercentage, CompletedAt)
            VALUES (@userId, @moduleId, @isCompleted, @progressPercentage, @completedAt)
            ON CONFLICT(UserId, ModuleId) 
            DO UPDATE SET 
                IsCompleted = @isCompleted,
                ProgressPercentage = @progressPercentage,
                CompletedAt = @completedAt";

        command.Parameters.AddWithValue("@userId", progress.UserId);
        command.Parameters.AddWithValue("@moduleId", progress.ModuleId);
        command.Parameters.AddWithValue("@isCompleted", progress.IsCompleted ? 1 : 0);
        command.Parameters.AddWithValue("@progressPercentage", progress.ProgressPercentage);
        command.Parameters.AddWithValue("@completedAt",
            progress.CompletedAt.HasValue ? progress.CompletedAt.Value.ToString("yyyy-MM-dd HH:mm:ss") : (object)DBNull.Value);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteUserModuleProgressAsync(int userId, int moduleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            DELETE FROM UserModuleProgress 
            WHERE UserId = @userId AND ModuleId = @moduleId";
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@moduleId", moduleId);

        await command.ExecuteNonQueryAsync();
    }

    private UserModuleProgress MapUserModuleProgressFromReader(SqliteDataReader reader)
    {
        return new UserModuleProgress
        {
            UserId = reader.GetInt32(0),
            ModuleId = reader.GetInt32(1),
            IsCompleted = reader.GetInt32(2) == 1,
            ProgressPercentage = reader.GetInt32(3),
            CompletedAt = reader.IsDBNull(4) ? null : DateTime.Parse(reader.GetString(4))
        };
    }
}

